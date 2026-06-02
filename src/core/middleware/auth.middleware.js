const jwt = require('jsonwebtoken');
const env = require('../env');
const userRepository = require('../../infra/db/sequelize/repository/user.repository'); // Importamos o repositório

const authenticate = async (request, reply) => {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new Error('Token ausente');

    // 1. Descriptografa o token
    const decoded = jwt.verify(token, env.app.jwtSecret);

    // 2. Checagem de Segurança em Tempo Real no Banco
    // Buscamos o usuário para ver se ele não foi deletado
    const dbUser = await userRepository.findById(decoded.id); 
    
    // Se o usuário foi apagado OU se a role dele mudou (ex: de ADMIN pra USER)
    if (!dbUser || dbUser.role !== decoded.role) {
      throw new Error('Sessão inválida ou permissões alteradas.');
    }

    // 3. Salva os dados atualizados na requisição
    request.user = decoded; 
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