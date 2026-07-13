const errorResponse = {
  type: 'object',
  properties: { error: { type: 'string' } }
};

const successMessage = {
  type: 'object',
  properties: { message: { type: 'string' } }
};

const equipmentSchema = {
  $id: 'Equipment',
  type: 'object',
  properties: {
    id: { type: 'integer' },
    patrimonio: { type: 'string', maxLength: 11 },
    tipo: { type: 'string' },
    status: { type: 'string' },
    observacao: { type: 'string', nullable: true },
    criado_por: { type: 'string', nullable: true },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' }
  }
};

const ticketSchema = {
  $id: 'Ticket',
  type: 'object',
  properties: {
    id: { type: 'integer' },
    descricao_problema: { type: 'string' },
    status_chamado: { type: 'string' },
    resolucao_ti: { type: 'string', nullable: true },
    data_abertura: { type: 'string' },
    equipment_id: { type: 'integer' },
    user_id: { type: 'integer' },
    // ... código existente ...
    tecnico_id: { type: 'integer', nullable: true },
    
    // 🌟 NOVAS PROPRIEDADES DA FUNCIONALIDADE DE CONFIRMAÇÃO
    finished_by: { type: 'integer', nullable: true },
    confirmed_by: { type: 'integer', nullable: true },
    rejection_reason: { type: 'string', nullable: true },
    finished_at: { type: 'string', nullable: true },
    
    // Objetos populados para retornar no frontend
    finalizador: {
      type: 'object',
      nullable: true,
      properties: { id: { type: 'integer' }, nome: { type: 'string' } }
    },
    confirmador: {
      type: 'object',
      nullable: true,
      properties: { id: { type: 'integer' }, nome: { type: 'string' } }
    },
    
    // 🌟 LIBERADO: Objeto do Solicitante com Ramal completo!
    user: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'integer' },
        nome: { type: 'string' },
        email: { type: 'string' },
        ramal: { type: 'string' }
      }
    },
    
    // 🌟 LIBERADO: Objeto do Técnico com Ramal completo!
    tecnico: { 
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'integer' },
        nome: { type: 'string' },
        ramal: { type: 'string' }
      }
    },

    // 🌟 LIBERADO: Referência ao equipamento para o patrimônio e tipo aparecerem!
    equipment: { $ref: 'Equipment#' }
  }
};

const registerSchema = {
  description: 'Cadastra um novo usuário no sistema com senha automática.',
  tags: ['Autenticação'],
  body: {
    type: 'object',
    required: ['nome', 'email', 'role'],
    properties: {
      nome: { type: 'string' },
      email: { type: 'string', format: 'email' },
      ramal: { type: 'string', pattern: '^[0-9]{1,11}$', maxLength: 11 },
      role: { type: 'string', enum: ['USER'] }
    }
  },
  response: {
    201: { type: 'object', properties: { id: { type: 'integer' } } },
    400: errorResponse
  }
};

const loginSchema = {
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
            role: { type: 'string' },
            ramal: { type: 'string' }
          }
        }
      }
    },
    401: errorResponse
  }
};

const updatePasswordSchema = {
  description: 'Permite ao usuário logado alterar sua própria senha.',
  tags: ['Perfil'],
  body: {
    type: 'object',
    required: ['novaSenha'],
    properties: { novaSenha: { type: 'string' } }
  },
  response: {
    200: successMessage,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse
  }
};

const listAllUsersSchema = {
  description: 'Lista todos os funcionários/usuários cadastrados com e-mails ofuscados.',
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
          role: { type: 'string' },
          ramal: { type: 'string' } // 🌟 LIBERADO: Ramal na listagem geral para o dropdown do Admin
        }
      }
    },
    401: errorResponse,
    403: errorResponse,
    500: errorResponse
  }
};

const updateRoleSchema = {
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
    properties: { role: { type: 'string', enum: ['ADMIN', 'USER', 'TECH'] } }
  },
  response: {
    200: successMessage,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    500: errorResponse
  }
};

const deleteUserSchema = {
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
};

const adminCreateUserSchema = {
  description: 'Permite ao ADMIN cadastrar um novo funcionário/técnico manualmente com matrícula e ramal.',
  tags: ['Usuários'],
  body: {
    type: 'object',
    required: ['nome', 'email', 'role', 'matricula', 'ramal'], 
    properties: {
      nome: { type: 'string' },
      email: { type: 'string', format: 'email' },
      matricula: { type: 'string' },
      ramal: { type: 'string', pattern: '^[0-9]{1,11}$', maxLength: 11 }, 
      role: { type: 'string', enum: ['ADMIN', 'USER', 'TECH'] }
    }
  },
  response: { 201: successMessage, 400: errorResponse }
};

const requestResetSchema = {
  description: 'Cria uma solicitação de redefinição de senha pendente para aprovação do TI.',
  tags: ['Autenticação'],
  body: {
    type: 'object',
    required: ['email'],
    properties: { email: { type: 'string', format: 'email' } }
  },
  response: { 200: successMessage, 400: errorResponse }
};

const getResetRequestsSchema = {
  description: 'Lista todas as solicitações de senha atualmente pendentes de análise.',
  tags: ['Usuários'],
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'integer' },
          nome: { type: 'string' },
          email: { type: 'string' },
          dataSolicitacao: { type: 'string' }
        }
      }
    },
    401: errorResponse,
    403: errorResponse,
    500: errorResponse
  }
};

const approveResetSchema = {
  description: 'Aprova o pedido, gera uma nova senha forte aleatória e remove o pedido da lista.',
  tags: ['Usuários'],
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
};

const rejectResetSchema = {
  description: 'Recusa a solicitação de redefinição de senha e a remove da lista.',
  tags: ['Usuários'],
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
};

const listEquipmentsSchema = {
  description: 'Lista todos os equipamentos cadastrados na prefeitura.',
  tags: ['Equipamentos'],
  response: {
    200: { type: 'array', items: { $ref: 'Equipment#' } },
    401: errorResponse,
    500: errorResponse
  }
};

const createEquipmentSchema = {
  description: 'Cadastra um novo equipamento pelo número do patrimônio.',
  tags: ['Equipamentos'],
  body: {
    type: 'object',
    required: ['patrimonio', 'tipo'],
    properties: {
      patrimonio: { type: 'string', maxLength: 11 },
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
};

const updateEquipmentSchema = {
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
};

const deleteEquipmentSchema = {
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
};

const listAllTicketsSchema = {
  description: 'Lista todos os chamados abertos e resolvidos.',
  tags: ['Chamados'],
  response: {
    200: { type: 'array', items: { $ref: 'Ticket#' } },
    401: errorResponse,
    500: errorResponse
  }
};

const listMyTicketsSchema = {
  description: 'Lista apenas os chamados abertos pelo usuário que está logado.',
  tags: ['Chamados'],
  response: {
    200: { type: 'array', items: { $ref: 'Ticket#' } },
    401: errorResponse,
    500: errorResponse
  }
};

const openTicketSchema = {
  description: 'Abre um novo chamado de manutenção usando a plaqueta do patrimônio.',
  tags: ['Chamados'],
  body: {
    type: 'object',
    required: ['patrimonio', 'descricao_problema', 'tipo', 'localizacao'],
    properties: {
      patrimonio: { type: 'string', maxLength: 11 },
      descricao_problema: { type: 'string' },
      tipo: { type: 'string' },        
      localizacao: { type: 'string' },
      tecnico_id: { type: 'integer', nullable: true }
    }
  },
  response: {
    201: { $ref: 'Ticket#' },
    400: errorResponse,
    401: errorResponse
  }
};

const updateTicketSchema = {
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
      patrimonio: { type: 'string', maxLength: 11 },
      tipo: { type: 'string' },        
      localizacao: { type: 'string' },
      tecnico_id: { type: 'integer', nullable: true }
    }
  },
  response: {
    200: { $ref: 'Ticket#' },
    400: errorResponse,
    401: errorResponse
  }
};

const updateTicketStatusSchema = {
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
      status_chamado: { 
        type: 'string', 
        enum: ['Aberto', 'Em Andamento', 'Aguardando Confirmação', 'Concluído', 'Baixa', 'Cancelado'] 
      },
      resolucao_ti: { type: 'string', nullable: true }
    }
  },
  response: {
    200: { $ref: 'Ticket#' },
    400: errorResponse,
    401: errorResponse,
    403: errorResponse
  }
};

const responderConfirmacaoSchema = {
  description: 'Permite ao usuário aceitar ou recusar a solução do TI.',
  tags: ['Chamados'],
  params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
  body: {
    type: 'object',
    required: ['aprovado'],
    properties: {
      aprovado: { type: 'boolean' },
      motivo: { type: 'string' } // Necessário se aprovado for false
    }
  },
  response: { 200: { $ref: 'Ticket#' }, 400: errorResponse, 403: errorResponse }
};
// Não esqueça de exportá-lo no module.exports no final do arquivo!

const assignTechnicianSchema = {
  description: 'Atribui um técnico de suporte a um chamado específico.',
  tags: ['Chamados'],
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'integer' } }
  },
  body: {
    type: 'object',
    required: ['tecnico_id'],
    properties: { tecnico_id: { type: 'integer', nullable: true } }
  },
  response: {
    200: { $ref: 'Ticket#' },
    400: errorResponse,
    401: errorResponse,
    403: errorResponse
  }
};

const cancelTicketSchema = {
  description: 'Permite ao próprio funcionário cancelar seu chamado informando um motivo.',
  tags: ['Chamados'],
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'integer' } }
  },
  body: {
    type: 'object',
    required: ['motivo'],
    properties: { motivo: { type: 'string' } }
  },
  response: {
    200: { $ref: 'Ticket#' },
    400: errorResponse
  }
};

module.exports = {
  equipmentSchema,
  ticketSchema,
  registerSchema,
  loginSchema,
  updatePasswordSchema,
  listAllUsersSchema,
  updateRoleSchema,
  deleteUserSchema,
  adminCreateUserSchema,
  requestResetSchema,
  getResetRequestsSchema,
  approveResetSchema,
  rejectResetSchema,
  listEquipmentsSchema,
  createEquipmentSchema,
  updateEquipmentSchema,
  deleteEquipmentSchema,
  listAllTicketsSchema,
  listMyTicketsSchema,
  openTicketSchema,
  updateTicketSchema,
  updateTicketStatusSchema,
  assignTechnicianSchema,
  cancelTicketSchema,
  responderConfirmacaoSchema
};