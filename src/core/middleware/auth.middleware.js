const jwt = require('jsonwebtoken');
const env = require('../env');

const authenticate = async (request, reply) => {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new Error();

    const decoded = jwt.verify(token, env.app.jwtSecret);
    request.user = decoded; // Salva os dados do usuário na requisição
  } catch (err) {
    reply.status(401).send({ error: 'Não autorizado. Faça login novamente.' });
  }
};

const isAdmin = async (request, reply) => {
  if (request.user.role !== 'ADMIN') {
    reply.status(403).send({ error: 'Acesso negado. Apenas o TI pode realizar esta ação.' });
  }
};

module.exports = { authenticate, isAdmin };