const prisma = require('../prismaClient');

async function listar(req, res, next) {
  try {
    const experimentos = await prisma.experimento.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
    });
    res.json(experimentos);
  } catch (e) { next(e); }
}

// GET /api/experimentos/:id — el patrón siempre es el mismo:
// ¿existe? ¿es tuyo? recién ahí se devuelve. Nunca "¿el frontend
// decide mostrarlo?" — la decisión vive acá, en el servidor.
async function obtenerUno(req, res, next) {
  try {
    const experimento = await prisma.experimento.findUnique({ where: { id: req.params.id } });
    if (!experimento) return res.status(404).json({ error: 'Experimento no encontrado.' });
    if (experimento.userId !== req.user.sub) {
      return res.status(403).json({ error: 'Este no es tu experimento.' });
    }
    res.json(experimento);
  } catch (e) { next(e); }
}

async function crear(req, res, next) {
  try {
    const { hipotesis, variableModificada, variablesConstantes, resultadoEsperado } = req.body;
    if (!hipotesis || !hipotesis.trim()) {
      return res.status(400).json({ error: 'La hipótesis es obligatoria.' });
    }
    if (!variableModificada || !variableModificada.trim()) {
      return res.status(400).json({ error: 'Tenés que indicar qué variable vas a modificar.' });
    }
    const LIMITES = { hipotesis: 1000, variableModificada: 200, variablesConstantes: 1000, resultadoEsperado: 1000 };
    const valores = { hipotesis, variableModificada, variablesConstantes, resultadoEsperado };
    for (const [campo, max] of Object.entries(LIMITES)) {
      if (valores[campo] && valores[campo].length > max) {
        return res.status(400).json({ error: `El campo ${campo} no puede superar los ${max} caracteres.` });
      }
    }
    const experimento = await prisma.experimento.create({
      data: {
        userId: req.user.sub,
        hipotesis: hipotesis.trim(),
        variableModificada: variableModificada.trim(),
        variablesConstantes: variablesConstantes ? variablesConstantes.trim() : null,
        resultadoEsperado: resultadoEsperado ? resultadoEsperado.trim() : null,
      },
    });
    res.status(201).json(experimento);
  } catch (e) { next(e); }
}

// Se usa para cargar el resultado real y la conclusión una vez
// terminado el experimento, y marcarlo como completado.
async function actualizar(req, res, next) {
  try {
    const experimento = await prisma.experimento.findUnique({ where: { id: req.params.id } });
    if (!experimento) return res.status(404).json({ error: 'Experimento no encontrado.' });
    if (experimento.userId !== req.user.sub) {
      return res.status(403).json({ error: 'Este no es tu experimento.' });
    }
    const { hipotesis, variableModificada, variablesConstantes, resultadoEsperado, resultadoReal, conclusion, estado } = req.body;
    const LIMITES = { hipotesis: 1000, variableModificada: 200, variablesConstantes: 1000, resultadoEsperado: 1000, resultadoReal: 1000, conclusion: 1000 };
    const entrantes = { hipotesis, variableModificada, variablesConstantes, resultadoEsperado, resultadoReal, conclusion };
    for (const [campo, max] of Object.entries(LIMITES)) {
      if (entrantes[campo] && entrantes[campo].length > max) {
        return res.status(400).json({ error: `El campo ${campo} no puede superar los ${max} caracteres.` });
      }
    }
    const data = {};
    if (hipotesis !== undefined) data.hipotesis = hipotesis;
    if (variableModificada !== undefined) data.variableModificada = variableModificada;
    if (variablesConstantes !== undefined) data.variablesConstantes = variablesConstantes;
    if (resultadoEsperado !== undefined) data.resultadoEsperado = resultadoEsperado;
    if (resultadoReal !== undefined) data.resultadoReal = resultadoReal;
    if (conclusion !== undefined) data.conclusion = conclusion;
    if (estado !== undefined && ['en_curso', 'completado'].includes(estado)) data.estado = estado;

    const actualizado = await prisma.experimento.update({ where: { id: req.params.id }, data });
    res.json(actualizado);
  } catch (e) { next(e); }
}

async function eliminar(req, res, next) {
  try {
    const experimento = await prisma.experimento.findUnique({ where: { id: req.params.id } });
    if (!experimento) return res.status(404).json({ error: 'Experimento no encontrado.' });
    const esAutor = experimento.userId === req.user.sub;
    const esAdmin = req.user.role === 'administrador';
    if (!esAutor && !esAdmin) {
      return res.status(403).json({ error: 'No tenés permiso para borrar este experimento.' });
    }
    await prisma.experimento.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) { next(e); }
}

module.exports = { listar, obtenerUno, crear, actualizar, eliminar };
