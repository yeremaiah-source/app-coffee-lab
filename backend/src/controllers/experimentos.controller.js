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

async function crear(req, res, next) {
  try {
    const { hipotesis, variableModificada, variablesConstantes, resultadoEsperado } = req.body;
    if (!hipotesis || !hipotesis.trim()) {
      return res.status(400).json({ error: 'La hipótesis es obligatoria.' });
    }
    if (!variableModificada || !variableModificada.trim()) {
      return res.status(400).json({ error: 'Tenés que indicar qué variable vas a modificar.' });
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

module.exports = { listar, crear, actualizar, eliminar };
