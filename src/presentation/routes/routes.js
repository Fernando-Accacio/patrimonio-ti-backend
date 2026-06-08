const userController = require('../controllers/handlers/user.controller');
const equipmentController = require('../controllers/handlers/equipment.controller');
const ticketController = require('../controllers/handlers/ticket.controller');
const { authenticate, isAdmin } = require('../../core/middleware/auth.middleware');
const sseService = require('../../application/services/sse.service');

// IMPORTANDO OS SCHEMAS ENXUTOS 🚀
const schemas = require('../schemas/api.schemas');

const routes = async (fastify, options) => {

  // Registrar os Models globais reutilizáveis ($ref)
  fastify.addSchema(schemas.equipmentSchema);
  fastify.addSchema(schemas.ticketSchema);

  // ==========================================
  // ROTAS DE USUÁRIO / AUTH / PERFIL
  // ==========================================
  fastify.post('/register', { schema: schemas.registerSchema }, userController.register.bind(userController));
  fastify.post('/login', { schema: schemas.loginSchema }, userController.login.bind(userController));
  fastify.patch('/users/me/password', { preHandler: [authenticate], schema: schemas.updatePasswordSchema }, userController.updatePassword.bind(userController));
  fastify.get('/users', { preHandler: [authenticate], schema: schemas.listAllUsersSchema }, userController.listAll.bind(userController));
  fastify.patch('/users/:id/role', { preHandler: [authenticate, isAdmin], schema: schemas.updateRoleSchema }, userController.updateRole.bind(userController));
  fastify.delete('/users/:id', { preHandler: [authenticate, isAdmin], schema: schemas.deleteUserSchema }, userController.delete.bind(userController));
  fastify.post('/users/admin-create', { preHandler: [authenticate, isAdmin], schema: schemas.adminCreateUserSchema }, userController.adminCreateUser.bind(userController));

  // ==========================================
  // ROTAS DE RECUPERAÇÃO DE SENHA (ESQUECI A SENHA)
  // ==========================================
  fastify.post('/password-resets/request', { schema: schemas.requestResetSchema }, userController.requestReset.bind(userController));
  fastify.get('/password-resets', { preHandler: [authenticate, isAdmin], schema: schemas.getResetRequestsSchema }, userController.getResetRequests.bind(userController));
  fastify.get('/password-resets/history', { preHandler: [authenticate, isAdmin], schema: { tags: ['Usuários'] } }, userController.getResetHistory.bind(userController));
  fastify.post('/password-resets/:id/approve', { preHandler: [authenticate, isAdmin], schema: schemas.approveResetSchema }, userController.approveReset.bind(userController));
  fastify.post('/password-resets/:id/reject', { preHandler: [authenticate, isAdmin], schema: schemas.rejectResetSchema }, userController.rejectReset.bind(userController));

  // ==========================================
  // ROTAS DE EQUIPAMENTOS
  // ==========================================
  fastify.get('/equipments', { preHandler: [authenticate], schema: schemas.listEquipmentsSchema }, equipmentController.list.bind(equipmentController));
  fastify.post('/equipments', { preHandler: [authenticate, isAdmin], schema: schemas.createEquipmentSchema }, equipmentController.create.bind(equipmentController));
  fastify.put('/equipments/:id', { preHandler: [authenticate, isAdmin], schema: schemas.updateEquipmentSchema }, equipmentController.update.bind(equipmentController));
  fastify.delete('/equipments/:id', { preHandler: [authenticate, isAdmin], schema: schemas.deleteEquipmentSchema }, equipmentController.delete.bind(equipmentController));

  // ==========================================
  // ROTAS DE CHAMADOS (TICKETS)
  // ==========================================
  fastify.get('/tickets', { preHandler: [authenticate], schema: schemas.listAllTicketsSchema }, ticketController.listAll.bind(ticketController));
  fastify.get('/tickets/me', { preHandler: [authenticate], schema: schemas.listMyTicketsSchema }, ticketController.listMyTickets.bind(ticketController));
  fastify.post('/tickets', { preHandler: [authenticate], schema: schemas.openTicketSchema }, ticketController.open.bind(ticketController));
  fastify.put('/tickets/:id', { preHandler: [authenticate], schema: schemas.updateTicketSchema }, ticketController.update.bind(ticketController));
  fastify.patch('/tickets/:id/status', { preHandler: [authenticate, isAdmin], schema: schemas.updateTicketStatusSchema }, ticketController.updateStatus.bind(ticketController));
  fastify.patch('/tickets/:id/assign', { preHandler: [authenticate], schema: schemas.assignTechnicianSchema }, ticketController.assignTechnician.bind(ticketController));
  fastify.patch('/tickets/:id/cancel', { preHandler: [authenticate], schema: schemas.cancelTicketSchema }, ticketController.cancel.bind(ticketController));

  // ==========================================
  // ROTA SSE (REALTIME)
  // ==========================================
  fastify.get('/stream', { schema: { description: 'Rota SSE para atualizações em tempo real.', tags: ['Realtime'] } }, (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders();

    sseService.addClient(reply.raw);
    request.raw.on('close', () => sseService.removeClient(reply.raw));
  });

};

module.exports = routes;