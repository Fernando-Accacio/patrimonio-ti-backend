const userController = require('../controllers/handlers/user.controller');
const equipmentController = require('../controllers/handlers/equipment.controller');
const ticketController = require('../controllers/handlers/ticket.controller');
const { authenticate, isAdmin } = require('../../core/middleware/auth.middleware');
const sseService = require('../../application/services/sse.service');

const routes = async (fastify, options) => {

  // ==========================================
  // SCHEMAS (Para o Swagger)
  // ==========================================
  fastify.addSchema({
    $id: 'Equipment',
    type: 'object',
    properties: {
      id: { type: 'integer' },
      patrimonio: { type: 'string' },
      tipo: { type: 'string' },
      status: { type: 'string' },
      observacao: { type: 'string', nullable: true },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' }
    }
  });

  fastify.addSchema({
    $id: 'Ticket',
    type: 'object',
    properties: {
      id: { type: 'integer' },
      descricao_problema: { type: 'string' },
      status_chamado: { type: 'string' },
      resolucao_ti: { type: 'string', nullable: true },
      data_abertura: { type: 'string' },
      equipment_id: { type: 'integer' },
      user_id: { type: 'integer' }
    }
  });

  // ==========================================
  // ROTAS DE USUÁRIO / AUTH
  // ==========================================

  fastify.post('/register', {
    schema: {
      description: 'Cadastra um novo usuário no sistema (Use para criar o Admin inicial).',
      tags: ['Autenticação'],
      body: {
        type: 'object',
        required: ['nome', 'email', 'senha', 'role'],
        properties: {
          nome: { type: 'string' },
          email: { type: 'string', format: 'email' },
          senha: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'USER'] }
        }
      }
    }
  }, userController.register);

  fastify.post('/login', {
    schema: {
      description: 'Faz login no sistema e retorna o Token JWT.',
      tags: ['Autenticação'],
      body: {
        type: 'object',
        required: ['email', 'senha'],
        properties: {
          email: { type: 'string', format: 'email' },
          senha: { type: 'string' }
        }
      }
    }
  }, userController.login);

  fastify.get('/users', {
    preHandler: [authenticate, isAdmin],
    schema: {
      description: 'Lista todos os funcionários/usuários cadastrados.',
      tags: ['Usuários'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              nome: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' }
            }
          }
        }
      }
    }
  }, userController.listAll);

  fastify.patch('/users/:id/role', {
    preHandler: [authenticate, isAdmin],
    schema: {
      description: 'Altera o nível de acesso (Role) de um funcionário da prefeitura.',
      tags: ['Usuários'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
      },
      body: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['ADMIN', 'USER'] }
        }
      }
    }
  }, userController.updateRole);

  fastify.delete('/users/:id', {
    preHandler: [authenticate, isAdmin],
    schema: {
      description: 'Remove um usuário do sistema (Soft Delete). O histórico de chamados dele é mantido.',
      tags: ['Usuários'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
      }
    }
  }, userController.delete);

  // ==========================================
  // ROTAS DE EQUIPAMENTOS
  // ==========================================
  fastify.get('/equipments', {
    preHandler: [authenticate],
    schema: {
      description: 'Lista todos os equipamentos cadastrados na prefeitura.',
      tags: ['Equipamentos'],
      response: {
        200: { type: 'array', items: { $ref: 'Equipment#' } }
      }
    }
  }, equipmentController.list);

  fastify.post('/equipments', {
    preHandler: [authenticate, isAdmin],
    schema: {
      description: 'Cadastra um novo equipamento pelo número do patrimônio.',
      tags: ['Equipamentos'],
      body: {
        type: 'object',
        required: ['patrimonio', 'tipo'],
        properties: {
          patrimonio: { type: 'string' },
          tipo: { type: 'string' },
          observacao: { type: 'string' }
        }
      }
    }
  }, equipmentController.create);

  fastify.put('/equipments/:id', {
    preHandler: [authenticate, isAdmin],
    schema: {
      description: 'Atualiza dados de um equipamento existente (tipo, observação).',
      tags: ['Equipamentos'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
      },
      body: {
        type: 'object',
        properties: {
          tipo: { type: 'string' },
          observacao: { type: 'string' }
        }
      }
    }
  }, equipmentController.update);

  fastify.delete('/equipments/:id', {
    preHandler: [authenticate, isAdmin],
    schema: {
      description: 'Remove um equipamento do sistema (Só funciona se não tiver chamados atrelados).',
      tags: ['Equipamentos'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
      }
    }
  }, equipmentController.delete);

  // ==========================================
  // ROTAS DE CHAMADOS (TICKETS)
  // ==========================================
  fastify.get('/tickets', {
    preHandler: [authenticate],
    schema: {
      description: 'Lista todos os chamados abertos e resolvidos.',
      tags: ['Chamados'],
      response: {
        200: { type: 'array', items: { $ref: 'Ticket#' } }
      }
    }
  }, ticketController.listAll);

  fastify.get('/tickets/me', {
    preHandler: [authenticate],
    schema: {
      description: 'Lista apenas os chamados abertos pelo usuário que está logado.',
      tags: ['Chamados'],
      response: {
        200: { type: 'array', items: { $ref: 'Ticket#' } }
      }
    }
  }, ticketController.listMyTickets);

  fastify.post('/tickets', {
    preHandler: [authenticate],
    schema: {
      description: 'Abre um novo chamado de manutenção usando a plaqueta do patrimônio.',
      tags: ['Chamados'],
      body: {
        type: 'object',
        required: ['patrimonio', 'descricao_problema', 'tipo', 'localizacao'],
        properties: {
          patrimonio: { type: 'string' },
          descricao_problema: { type: 'string' },
          tipo: { type: 'string' },        
          localizacao: { type: 'string' }   
        }
      }
    }
  }, ticketController.open);

  fastify.put('/tickets/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Permite ao funcionário comum editar o relato do problema antes do atendimento da TI.',
      tags: ['Chamados'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
      },
      body: {
        type: 'object',
        required: ['descricao_problema'],
        properties: {
          descricao_problema: { type: 'string' }
        }
      }
    }
  }, ticketController.update);

  fastify.patch('/tickets/:id/status', {
    preHandler: [authenticate, isAdmin],
    schema: {
      description: 'Altera o status do chamado e reflete no equipamento físico.',
      tags: ['Chamados'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
      },
      body: {
        type: 'object',
        required: ['status_chamado'],
        properties: {
          status_chamado: { type: 'string', enum: ['Aberto', 'Concluído', 'Baixa'] },
          resolucao_ti: { type: 'string', nullable: true }
        }
      }
    }
  }, ticketController.updateStatus);

  fastify.get('/stream', {
    schema: {
      description: 'Rota SSE para atualizações em tempo real (Não aparece no Swagger por manter a conexão aberta).',
      tags: ['Realtime'],
    }
  }, (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders();

    sseService.addClient(reply.raw);

    request.raw.on('close', () => {
      sseService.removeClient(reply.raw);
    });
  });

};

module.exports = routes;