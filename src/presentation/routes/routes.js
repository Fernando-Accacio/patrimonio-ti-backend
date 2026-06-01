const userController = require('../controllers/handlers/user.controller');
const equipmentController = require('../controllers/handlers/equipment.controller');
const ticketController = require('../controllers/handlers/ticket.controller');
const { authenticate, isAdmin } = require('../../core/middleware/auth.middleware');
const sseService = require('../../application/services/sse.service');

const routes = async (fastify, options) => {

  // ==========================================
  // SCHEMAS BASE E REUTILIZÁVEIS
  // ==========================================
  
  const errorResponse = {
    type: 'object',
    properties: { error: { type: 'string' } }
  };

  const successMessage = {
    type: 'object',
    properties: { message: { type: 'string' } }
  };

  fastify.addSchema({
    $id: 'Equipment',
    type: 'object',
    properties: {
      id: { type: 'integer' },
      patrimonio: { type: 'string', maxLength: 7 }, // CORREÇÃO: Limite de 7 dígitos no banco
      tipo: { type: 'string' },
      status: { type: 'string' },
      observacao: { type: 'string', nullable: true },
      criado_por: { type: 'string', nullable: true }, // CORREÇÃO: Fastify agora permite enviar este campo!
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
  // ROTAS DE USUÁRIO / AUTH / PERFIL
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
      },
      response: {
        201: { type: 'object', properties: { id: { type: 'integer' }, email: { type: 'string' } } },
        400: errorResponse
      }
    }
  }, userController.register.bind(userController));

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
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                nome: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' }
              }
            }
          }
        },
        401: errorResponse
      }
    }
  }, userController.login.bind(userController));

  fastify.put('/users/me/profile', {
    preHandler: [authenticate],
    schema: {
      description: 'Permite ao usuário comum alterar seu próprio nome e e-mail.',
      tags: ['Perfil'],
      body: {
        type: 'object',
        required: ['nome', 'email'],
        properties: {
          nome: { type: 'string' },
          email: { type: 'string', format: 'email' }
        }
      },
      response: {
        200: successMessage,
        400: errorResponse,
        401: errorResponse
      }
    }
  }, userController.updateProfile.bind(userController));

  fastify.patch('/users/me/password', {
    preHandler: [authenticate],
    schema: {
      description: 'Permite ao usuário logado alterar sua própria senha.',
      tags: ['Perfil'],
      body: {
        type: 'object',
        required: ['novaSenha'],
        properties: {
          novaSenha: { type: 'string' }
        }
      },
      response: {
        200: successMessage,
        400: errorResponse,
        401: errorResponse,
        403: errorResponse
      }
    }
  }, userController.updatePassword.bind(userController));

  fastify.patch('/users/:id/password', {
    preHandler: [authenticate, isAdmin],
    schema: {
      description: 'Permite ao ADMIN alterar a senha de qualquer usuário.',
      tags: ['Usuários'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
      },
      body: {
        type: 'object',
        required: ['novaSenha'],
        properties: {
          novaSenha: { type: 'string' }
        }
      },
      response: {
        200: successMessage,
        400: errorResponse,
        401: errorResponse,
        403: errorResponse
      }
    }
  }, userController.updateAnyUserPassword.bind(userController));

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
        },
        401: errorResponse,
        403: errorResponse,
        500: errorResponse
      }
    }
  }, userController.listAll.bind(userController));

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
      },
      response: {
        200: successMessage,
        400: errorResponse,
        401: errorResponse,
        403: errorResponse,
        404: errorResponse,
        500: errorResponse
      }
    }
  }, userController.updateRole.bind(userController));

  fastify.delete('/users/:id', {
    preHandler: [authenticate, isAdmin],
    schema: {
      description: 'Remove um usuário do sistema (Soft Delete). O histórico de chamados dele é mantido.',
      tags: ['Usuários'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
      },
      response: {
        200: successMessage,
        401: errorResponse,
        403: errorResponse,
        404: errorResponse,
        500: errorResponse
      }
    }
  }, userController.delete.bind(userController));

  // ==========================================
  // ROTAS DE EQUIPAMENTOS
  // ==========================================
  fastify.get('/equipments', {
    preHandler: [authenticate],
    schema: {
      description: 'Lista todos os equipamentos cadastrados na prefeitura.',
      tags: ['Equipamentos'],
      response: {
        200: { type: 'array', items: { $ref: 'Equipment#' } },
        401: errorResponse,
        500: errorResponse
      }
    }
  }, equipmentController.list.bind(equipmentController));

  fastify.post('/equipments', {
    preHandler: [authenticate, isAdmin],
    schema: {
      description: 'Cadastra um novo equipamento pelo número do patrimônio.',
      tags: ['Equipamentos'],
      body: {
        type: 'object',
        required: ['patrimonio', 'tipo'],
        properties: {
          patrimonio: { type: 'string', maxLength: 7 }, // CORREÇÃO: Aceita 7 dígitos no POST
          tipo: { type: 'string' },
          observacao: { type: 'string' }
        }
      },
      response: {
        201: { $ref: 'Equipment#' },
        400: errorResponse,
        401: errorResponse,
        403: errorResponse
      }
    }
  }, equipmentController.create.bind(equipmentController));

  fastify.put('/equipments/:id', {
    preHandler: [authenticate, isAdmin],
    schema: {
      description: 'Atualiza dados de um equipamento existente.',
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
          observacao: { type: 'string' },
          status: { type: 'string' }
        }
      },
      response: {
        200: successMessage,
        400: errorResponse,
        401: errorResponse,
        403: errorResponse
      }
    }
  }, equipmentController.update.bind(equipmentController));

  fastify.delete('/equipments/:id', {
    preHandler: [authenticate, isAdmin],
    schema: {
      description: 'Remove um equipamento do sistema (Soft Delete).',
      tags: ['Equipamentos'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
      },
      response: {
        200: successMessage,
        400: errorResponse,
        401: errorResponse,
        403: errorResponse
      }
    }
  }, equipmentController.delete.bind(equipmentController));

  // ==========================================
  // ROTAS DE CHAMADOS (TICKETS)
  // ==========================================
  fastify.get('/tickets', {
    preHandler: [authenticate],
    schema: {
      description: 'Lista todos os chamados abertos e resolvidos.',
      tags: ['Chamados'],
      response: {
        200: { type: 'array', items: { $ref: 'Ticket#' } },
        401: errorResponse,
        500: errorResponse
      }
    }
  }, ticketController.listAll.bind(ticketController));

  fastify.get('/tickets/me', {
    preHandler: [authenticate],
    schema: {
      description: 'Lista apenas os chamados abertos pelo usuário que está logado.',
      tags: ['Chamados'],
      response: {
        200: { type: 'array', items: { $ref: 'Ticket#' } },
        401: errorResponse,
        500: errorResponse
      }
    }
  }, ticketController.listMyTickets.bind(ticketController));

  fastify.post('/tickets', {
    preHandler: [authenticate],
    schema: {
      description: 'Abre um novo chamado de manutenção usando a plaqueta do patrimônio.',
      tags: ['Chamados'],
      body: {
        type: 'object',
        required: ['patrimonio', 'descricao_problema', 'tipo', 'localizacao'],
        properties: {
          patrimonio: { type: 'string', maxLength: 7 }, // CORREÇÃO: Permite 7 dígitos na abertura
          descricao_problema: { type: 'string' },
          tipo: { type: 'string' },        
          localizacao: { type: 'string' }   
        }
      },
      response: {
        201: { $ref: 'Ticket#' },
        400: errorResponse,
        401: errorResponse
      }
    }
  }, ticketController.open.bind(ticketController));

  fastify.put('/tickets/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Permite ao funcionário comum editar o chamado inteiro antes da conclusão.',
      tags: ['Chamados'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
      },
      body: {
        type: 'object',
        required: ['descricao_problema', 'patrimonio', 'tipo', 'localizacao'],
        properties: {
          descricao_problema: { type: 'string' },
          patrimonio: { type: 'string', maxLength: 7 }, // CORREÇÃO: Permite 7 dígitos na edição
          tipo: { type: 'string' },        
          localizacao: { type: 'string' } 
        }
      },
      response: {
        200: { $ref: 'Ticket#' },
        400: errorResponse,
        401: errorResponse
      }
    }
  }, ticketController.update.bind(ticketController));

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
      },
      response: {
        200: { $ref: 'Ticket#' },
        400: errorResponse,
        401: errorResponse,
        403: errorResponse
      }
    }
  }, ticketController.updateStatus.bind(ticketController));

  // ==========================================
  // ROTA SSE (REALTIME)
  // ==========================================
  fastify.get('/stream', {
    schema: {
      description: 'Rota SSE para atualizações em tempo real.',
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