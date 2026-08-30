const jwt = require('jsonwebtoken');

// Se fija explícitamente el algoritmo (HS256) tanto al firmar como al
// verificar. Sin esto, una librería mal configurada podría aceptar un
// token con un algoritmo distinto al esperado (incluido "none") — una
// clase de ataque conocida como "confusión de algoritmo".
const ALGORITMO = 'HS256';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: '7d', algorithm: ALGORITMO }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: [ALGORITMO] });
}

module.exports = { signToken, verifyToken };
