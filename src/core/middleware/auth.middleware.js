const jwt = require('jsonwebtoken');
const env = require('../env');
const userRepository = require('../../infra/db/sequelize/repository/user.repository');

const normalizeRole = (role) => String(role || '').trim().toUpperCase();
const isTiRole = (role) => {
  const normalized = normalizeRole(role);
  return ['ADMIN', 'TECH', 'TI', 'SUPORTE', 'SUPPORT', 'TECNICO', 'TÉCNICO'].includes(normalized);
};

const authenticate = async (request, reply) => {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new Error('Token ausente');

    // 1. Descriptografa o token JWT
    const decoded = jwt.verify(token, env.app.jwtSecret);

    // 2. Checagem de Segurança em Tempo Real no Banco
    const dbUser = await userRepository.findById(decoded.id); 
    
    if (!dbUser || normalizeRole(dbUser.role) !== normalizeRole(decoded.role)) {
      throw new Error('Sessão inválida ou permissões alteradas.');
    }

    // 3. 🌟 CORRIGIDO: Salva o dbUser (fonte da verdade do banco) na requisição,
    // garantindo que o ramal e a role lidos sejam sempre os mais recentes!
    request.user = dbUser; 
  } catch (err) {
    reply.status(401).send({ error: 'Não autorizado. Faça login novamente.' });
  }
};

const isAdmin = async (request, reply) => {
  const role = request.user?.role;

  if (!isTiRole(role)) {
    return reply.status(403).send({ error: 'Erro: Acesso negado. Apenas a TI pode realizar esta ação.' });
  }
};

const isTi = async (request, reply) => {
  const role = request.user?.role;

  if (!isTiRole(role)) {
    return reply.status(403).send({ error: 'Erro: Acesso negado. Apenas a TI pode realizar esta ação.' });
  }
};

module.exports = { authenticate, isAdmin, isTi };