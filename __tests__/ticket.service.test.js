const ticketService = require('../src/application/services/ticket.service');
const ticketRepository = require('../src/infra/db/sequelize/repository/ticket.repository');
const equipmentRepository = require('../src/infra/db/sequelize/repository/equipment.repository');
const sseService = require('../src/application/services/sse.service');

// Mocks principais
jest.mock('../src/infra/db/sequelize/repository/ticket.repository');
jest.mock('../src/infra/db/sequelize/repository/equipment.repository');
jest.mock('../src/application/services/sse.service');

// Mocks para o inline require da função getMyTickets
jest.mock('../src/infra/db/sequelize/models', () => ({
  Ticket: { findAll: jest.fn() },
  Equipment: {},
  User: {}
}));
jest.mock('sequelize', () => ({
  Op: { or: Symbol('or') }
}));

describe('Testes Unitários: Ticket Service', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================
  // BUSCA E LISTAGEM
  // ==========================
  it('Deve lançar erro se o chamado não for encontrado (_buscarChamadoOuFalhar)', async () => {
    ticketRepository.findById.mockResolvedValue(null);
    await expect(ticketService._buscarChamadoOuFalhar(99)).rejects.toThrow('Chamado não encontrado.');
  });

  it('Deve retornar todos os chamados', async () => {
    ticketRepository.findAll.mockResolvedValue([{ id: 1 }]);
    const res = await ticketService.getAllTickets();
    expect(res).toEqual([{ id: 1 }]);
  });

  it('Deve buscar os chamados do usuário logado (getMyTickets) como USER', async () => {
    const models = require('../src/infra/db/sequelize/models');
    models.Ticket.findAll.mockResolvedValue([{ id: 1 }]);
    const res = await ticketService.getMyTickets(10, 'USER');
    expect(res).toEqual([{ id: 1 }]);
    expect(models.Ticket.findAll).toHaveBeenCalled();
  });

  it('Deve buscar os chamados do usuário logado (getMyTickets) como TECH', async () => {
    const models = require('../src/infra/db/sequelize/models');
    models.Ticket.findAll.mockResolvedValue([{ id: 2 }]);
    const res = await ticketService.getMyTickets(10, 'TECH');
    expect(res).toEqual([{ id: 2 }]);
  });

  // ==========================
  // ABERTURA DE CHAMADO
  // ==========================
  it('Deve abrir um chamado e CRIAR o equipamento se ele não existir', async () => {
    equipmentRepository.findByPatrimonio.mockResolvedValue(null);
    equipmentRepository.create.mockResolvedValue({ id: 5 });
    ticketRepository.create.mockResolvedValue({ id: 1, status_chamado: 'Aberto' });

    const payload = { patrimonio: '000000', tipo: 'PC', descricao_problema: 'Quebrado' };
    await ticketService.openTicket(payload);

    expect(equipmentRepository.create).toHaveBeenCalled();
    expect(ticketRepository.create).toHaveBeenCalledWith(expect.objectContaining({ status_chamado: 'Aberto' }));
    expect(sseService.broadcast).toHaveBeenCalled();
  });

  it('Deve abrir um chamado e ATUALIZAR o equipamento se ele já existir (Com técnico)', async () => {
    equipmentRepository.findByPatrimonio.mockResolvedValue({ id: 5 });
    ticketRepository.create.mockResolvedValue({ id: 2, status_chamado: 'Em Andamento' });

    const payload = { patrimonio: '111111', tipo: 'PC', descricao_problema: 'Quebrado', tecnico_id: 10 };
    await ticketService.openTicket(payload);

    expect(equipmentRepository.update).toHaveBeenCalledWith(5, { status: 'Em Manutenção' });
    expect(ticketRepository.create).toHaveBeenCalledWith(expect.objectContaining({ status_chamado: 'Em Andamento' }));
  });

  // ==========================
  // EDIÇÃO DE CHAMADO
  // ==========================
  it('Deve barrar edição de chamados finalizados', async () => {
    ticketRepository.findById.mockResolvedValue({ id: 1, status_chamado: 'Concluído' });
    await expect(ticketService.updateTicketInfo(1, {})).rejects.toThrow('Operação negada');
  });

  it('Deve atualizar info trocando para um NOVO equipamento que não existia no banco', async () => {
    ticketRepository.findById.mockResolvedValue({ id: 1, status_chamado: 'Aberto', equipment_id: 5 });
    // Finge que procurou o patrimônio novo e não achou
    equipmentRepository.findByPatrimonio.mockResolvedValue(null);
    ticketRepository.update.mockResolvedValue(true);

    await ticketService.updateTicketInfo(1, { patrimonio: 'NOVO123' });
    // Se não achou, ele atualiza o equipamento antigo (id 5) com o patrimônio novo
    expect(equipmentRepository.update).toHaveBeenCalledWith(5, expect.objectContaining({ patrimonio: 'NOVO123' }));
  });

  it('Deve atualizar info trocando para um equipamento JÁ existente', async () => {
    ticketRepository.findById.mockResolvedValue({ id: 1, status_chamado: 'Aberto', equipment_id: 5 });
    // Finge que achou o patrimônio novo no banco (ele tem o id 10)
    equipmentRepository.findByPatrimonio.mockResolvedValue({ id: 10, tipo: 'Monitor', observacao: 'Sala 2' });
    ticketRepository.update.mockResolvedValue(true);

    await ticketService.updateTicketInfo(1, { patrimonio: 'EXISTE1', tecnico_id: 2 });
    
    // Atualiza o equipamento 10
    expect(equipmentRepository.update).toHaveBeenCalledWith(10, expect.any(Object));
    // Atualiza o chamado ligando ele ao equipamento 10, e muda status porque mandou tecnico
    expect(ticketRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ equipment_id: 10, status_chamado: 'Em Andamento' }));
  });

  // ==========================
  // STATUS E TÉCNICO
  // ==========================
  it('Deve atualizar status e refletir no equipamento', async () => {
    ticketRepository.findById.mockResolvedValue({ id: 1, equipment_id: 5, resolucao_ti: null });
    ticketRepository.update.mockResolvedValue(true);

    await ticketService.updateTicketStatus(1, 'Concluído', 'Troquei o cabo');

    expect(ticketRepository.update).toHaveBeenCalledWith(1, { status_chamado: 'Concluído', resolucao_ti: 'Troquei o cabo' });
    expect(equipmentRepository.update).toHaveBeenCalledWith(5, { status: 'Disponível' }); // Testando o MAP
  });

  it('Deve atribuir técnico (muda pra Em Andamento)', async () => {
    ticketRepository.findById.mockResolvedValue({ id: 1, status_chamado: 'Aberto' });
    await ticketService.assignTechnician(1, "10");
    expect(ticketRepository.update).toHaveBeenCalledWith(1, { tecnico_id: 10, status_chamado: 'Em Andamento' });
  });

  it('Deve remover técnico (muda pra Aberto)', async () => {
    ticketRepository.findById.mockResolvedValue({ id: 1, status_chamado: 'Em Andamento' });
    await ticketService.assignTechnician(1, ""); // Vazio tira o técnico
    expect(ticketRepository.update).toHaveBeenCalledWith(1, { tecnico_id: null, status_chamado: 'Aberto' });
  });

  // ==========================
  // CANCELAMENTO
  // ==========================
  it('Deve barrar cancelamento se o usuário não for o dono', async () => {
    ticketRepository.findById.mockResolvedValue({ id: 1, user_id: 2 });
    await expect(ticketService.cancelTicket(1, 99, 'Motivo')).rejects.toThrow('Acesso negado');
  });

  it('Deve barrar cancelamento se não estiver Aberto', async () => {
    ticketRepository.findById.mockResolvedValue({ id: 1, user_id: 2, status_chamado: 'Em Andamento' });
    await expect(ticketService.cancelTicket(1, 2, 'Motivo')).rejects.toThrow('Apenas chamados que ainda estão "Abertos"');
  });

  it('Deve cancelar o chamado e liberar o equipamento', async () => {
    ticketRepository.findById.mockResolvedValue({ id: 1, user_id: 2, status_chamado: 'Aberto', equipment_id: 5 });
    ticketRepository.update.mockResolvedValue(true);

    await ticketService.cancelTicket(1, 2, 'Não precisa mais');

    expect(ticketRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ status_chamado: 'Cancelado' }));
    expect(equipmentRepository.update).toHaveBeenCalledWith(5, { status: 'Disponível' });
  });

});