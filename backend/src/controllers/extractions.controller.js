const prisma = require('../prismaClient');
const { calcularExtraccion } = require('../utils/extractionAnalysis');
const { estimateTDS, registrarMedicionReal } = require('../utils/tdsEstimator');

async function crear(req, res, next) {
  try {
    const { metodo, cafe, molienda, dosisG, aguaG, tiempoSeg, temperaturaC, tds, tueste, notas, dulzor, acidez, cuerpo, amargor } = req.body;

    // Validación estricta del lado del servidor — nunca se confía en que
    // el frontend ya validó. Rechaza tipos incorrectos, negativos, cero,
    // y valores fuera de un rango físicamente realista.
    // El método solo puede ser uno de los que la interfaz realmente
    // ofrece — nunca texto libre. Esto evita que alguien mande
    // cualquier string (incluido HTML/script) saltándose la interfaz y
    // llamando a la API directo.
    const METODOS_VALIDOS = ['Espresso', 'Filtro', 'Cold Brew', 'Otros'];
    if (!metodo || !METODOS_VALIDOS.includes(metodo)) {
      return res.status(400).json({ error: 'El método tiene que ser uno de: ' + METODOS_VALIDOS.join(', ') + '.' });
    }
    if (typeof dosisG !== 'number' || dosisG <= 0 || dosisG > 200) {
      return res.status(400).json({ error: 'La dosis tiene que ser un número mayor a 0 y menor a 200g.' });
    }
    if (typeof aguaG !== 'number' || aguaG <= 0 || aguaG > 5000) {
      return res.status(400).json({ error: 'El agua/rendimiento tiene que ser un número mayor a 0 y menor a 5000g.' });
    }
    if (tiempoSeg !== undefined && tiempoSeg !== null && (typeof tiempoSeg !== 'number' || tiempoSeg < 0 || tiempoSeg > 86400)) {
      return res.status(400).json({ error: 'El tiempo tiene que ser un número válido (en segundos).' });
    }
    if (temperaturaC !== undefined && temperaturaC !== null && (typeof temperaturaC !== 'number' || temperaturaC < 0 || temperaturaC > 100)) {
      return res.status(400).json({ error: 'La temperatura tiene que estar entre 0 y 100°C.' });
    }
    if (tds !== undefined && tds !== null && (typeof tds !== 'number' || tds <= 0 || tds > 30)) {
      return res.status(400).json({ error: 'El TDS medido tiene que ser un número entre 0 y 30%.' });
    }
    // Evaluación sensorial: escala 1-10, siempre opcional.
    const camposSensoriales = { dulzor, acidez, cuerpo, amargor };
    for (const [campo, valor] of Object.entries(camposSensoriales)) {
      if (valor !== undefined && valor !== null && (typeof valor !== 'number' || valor < 1 || valor > 10)) {
        return res.status(400).json({ error: `El campo ${campo} tiene que ser un número entre 1 y 10.` });
      }
    }

    let tdsFinal = tds || null;
    let tdsEstimado = false;
    let tdsRangoMin = null, tdsRangoMax = null, tdsConfianza = null, tdsConfianzaLabel = null;

    if (tds) {
      // TDS medido por el usuario: se guarda tal cual y retroalimenta el
      // motor de estimación para ese método.
      await registrarMedicionReal({ metodo, dosisG, aguaG, tiempoSeg, tueste, tdsReal: tds });
    } else {
      // No hay medición: se estima. Queda marcado como estimado en la
      // base, nunca se confunde con un valor medido.
      const estimacion = await estimateTDS({ metodo, dosisG, aguaG, tiempoSeg, tueste });
      tdsFinal = estimacion.estimado;
      tdsEstimado = true;
      tdsRangoMin = estimacion.rangoMin;
      tdsRangoMax = estimacion.rangoMax;
      tdsConfianza = estimacion.confianza;
      tdsConfianzaLabel = estimacion.confianzaLabel;
    }

    const analisis = calcularExtraccion({ dosisG, aguaG, tds: tdsFinal, tiempoSeg, metodo });

    const extraction = await prisma.extraction.create({
      data: {
        userId: req.user.sub,
        metodo,
        cafe: cafe || null,
        molienda: molienda || null,
        dosisG,
        aguaG,
        ratio: analisis.ratio,
        tiempoSeg: tiempoSeg || null,
        temperaturaC: temperaturaC || null,
        tds: tdsFinal,
        tdsEstimado,
        tdsRangoMin,
        tdsRangoMax,
        tdsConfianza,
        tdsConfianzaLabel,
        ey: analisis.ey,
        categoria: analisis.categoria,
        recomendacion: analisis.recomendacion,
        notas: notas || null,
        dulzor: dulzor || null,
        acidez: acidez || null,
        cuerpo: cuerpo || null,
        amargor: amargor || null,
      },
    });
    res.status(201).json(extraction);
  } catch (e) { next(e); }
}

async function listarMias(req, res, next) {
  try {
    const extractions = await prisma.extraction.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
    });
    res.json(extractions);
  } catch (e) { next(e); }
}

async function comparar(req, res, next) {
  try {
    // Compara las últimas N extracciones del usuario para detectar tendencias simples.
    const ids = (req.query.ids || '').split(',').filter(Boolean);
    const where = ids.length
      ? { id: { in: ids }, userId: req.user.sub }
      : { userId: req.user.sub };
    const extractions = await prisma.extraction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: ids.length ? undefined : 10,
    });
    res.json(extractions);
  } catch (e) { next(e); }
}

// ---------- Consistencia del barista ----------
// Se calcula a partir de variables objetivas ya registradas (nunca un
// puntaje arbitrario): el coeficiente de variación (desvío / promedio)
// de dosis, ratio y tiempo entre las últimas extracciones. Cuanto más
// bajo el coeficiente, más repetible es el trabajo.
function coeficienteVariacion(valores){
  if(valores.length < 3) return null;
  const promedio = valores.reduce((a,b)=>a+b,0) / valores.length;
  if(promedio === 0) return null;
  const varianza = valores.reduce((a,b)=>a+Math.pow(b-promedio,2),0) / valores.length;
  return Math.sqrt(varianza) / promedio;
}
function scoreDesdeCV(cv){
  return Math.max(0, Math.min(100, 100 - cv*100*3));
}

async function calcularConsistencia(userId, metodo){
  const where = metodo ? { userId, metodo } : { userId };
  const extractions = await prisma.extraction.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 20,
  });
  if(extractions.length < 3){
    return { suficientesDatos: false, mensaje: 'No hay suficientes datos para establecer una relación. Registrá al menos 3 extracciones para calcular tu consistencia.' };
  }
  const dosis = extractions.map(e=>e.dosisG).filter(v=>v!=null);
  const ratios = extractions.filter(e=>e.dosisG && e.aguaG).map(e=>e.aguaG/e.dosisG);
  const tiempos = extractions.map(e=>e.tiempoSeg).filter(v=>v!=null);

  const cvDosis = coeficienteVariacion(dosis);
  const cvRatio = coeficienteVariacion(ratios);
  const cvTiempo = coeficienteVariacion(tiempos);

  const variables = [];
  if(cvDosis !== null) variables.push({ nombre:'Dosis', cv: cvDosis, score: scoreDesdeCV(cvDosis) });
  if(cvRatio !== null) variables.push({ nombre:'Ratio', cv: cvRatio, score: scoreDesdeCV(cvRatio) });
  if(cvTiempo !== null) variables.push({ nombre:'Tiempo', cv: cvTiempo, score: scoreDesdeCV(cvTiempo) });

  if(variables.length === 0){
    return { suficientesDatos: false, mensaje: 'No hay suficientes datos para establecer una relación.' };
  }
  const scoreGeneral = variables.reduce((a,v)=>a+v.score,0) / variables.length;
  const label = scoreGeneral >= 85 ? 'Excelente' : scoreGeneral >= 65 ? 'Buena' : scoreGeneral >= 40 ? 'Irregular' : 'Baja';
  return {
    suficientesDatos: true,
    score: Number(scoreGeneral.toFixed(0)),
    label,
    variables: variables.map(v=>({ nombre: v.nombre, variacionPorcentual: Number((v.cv*100).toFixed(1)) })),
    muestras: extractions.length,
  };
}

async function consistencia(req, res, next) {
  try {
    const resultado = await calcularConsistencia(req.user.sub, req.query.metodo || null);
    res.json(resultado);
  } catch (e) { next(e); }
}

// ---------- Insights basados en evidencia ----------
// Cada insight distingue dato observado de interpretación, y nunca
// afirma causalidad — solo correlación ("coincide con"). Si no hay
// datos suficientes, se declara explícitamente en vez de inventar.
async function insights(req, res, next) {
  try {
    const extractions = await prisma.extraction.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
    });

    const consistenciaGeneral = await calcularConsistencia(req.user.sub, null);

    // Mejor vs. peor extracción: la que más se acercó al centro del
    // rango Golden Cup (20% EY) contra la que más se alejó.
    const conEY = extractions.filter(e => e.ey !== null && e.ey !== undefined);
    let comparacionMejorPeor = { suficientesDatos: false, mensaje: 'No hay suficientes datos para establecer una relación. Necesitás al menos 2 extracciones con TDS medido o estimado.' };
    if(conEY.length >= 2){
      const ordenadas = [...conEY].sort((a,b)=> Math.abs(a.ey-20) - Math.abs(b.ey-20));
      const mejor = ordenadas[0];
      const peor = ordenadas[ordenadas.length-1];
      if(mejor.id !== peor.id){
        const diferencias = [];
        const campos = [
          {campo:'dosisG', nombre:'Dosis', unidad:'g'},
          {campo:'aguaG', nombre:'Agua', unidad:'g'},
          {campo:'tiempoSeg', nombre:'Tiempo', unidad:'s'},
          {campo:'temperaturaC', nombre:'Temperatura', unidad:'°C'},
        ];
        campos.forEach(c=>{
          if(mejor[c.campo] != null && peor[c.campo] != null){
            const diff = mejor[c.campo] - peor[c.campo];
            if(Math.abs(diff) > 0.01){
              diferencias.push({ nombre: c.nombre, diferencia: Number(diff.toFixed(1)), unidad: c.unidad });
            }
          }
        });
        if(mejor.molienda && peor.molienda && mejor.molienda !== peor.molienda){
          diferencias.push({ nombre:'Molienda', mejor: mejor.molienda, peor: peor.molienda });
        }
        comparacionMejorPeor = {
          suficientesDatos: true,
          mejor: { id: mejor.id, metodo: mejor.metodo, ey: mejor.ey, categoria: mejor.categoria, createdAt: mejor.createdAt },
          peor: { id: peor.id, metodo: peor.metodo, ey: peor.ey, categoria: peor.categoria, createdAt: peor.createdAt },
          diferencias,
        };
      }
    }

    // Molienda más frecuente entre las extracciones balanceadas — una
    // correlación observacional, no una receta garantizada.
    const balanceadas = extractions.filter(e => e.categoria === 'Balanceado (Golden Cup)' && e.molienda);
    let moliendaFrecuente = { suficientesDatos: false, mensaje: 'No hay suficientes datos para establecer una relación. Registrá la molienda en al menos 3 extracciones balanceadas.' };
    if(balanceadas.length >= 3){
      const conteo = {};
      balanceadas.forEach(e=>{ conteo[e.molienda] = (conteo[e.molienda]||0) + 1; });
      const [moliendaMasFrecuente, veces] = Object.entries(conteo).sort((a,b)=>b[1]-a[1])[0];
      moliendaFrecuente = {
        suficientesDatos: true,
        molienda: moliendaMasFrecuente,
        veces,
        totalBalanceadas: balanceadas.length,
      };
    }

    res.json({ consistencia: consistenciaGeneral, comparacionMejorPeor, moliendaFrecuente });
  } catch (e) { next(e); }
}

module.exports = { crear, listarMias, comparar, consistencia, insights };
