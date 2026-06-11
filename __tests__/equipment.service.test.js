const equipmentService = require('../src/application/services/equipment.service');
const equipmentRepository = require('../src/infra/db/sequelize/repository/equipment.repository');
const sseService = require('../src/application/services/sse.service');

// 🌟 A MÁGICA: Pedimos pro Jest criar versões falsas (mocks) do banco e do realtime
jest.mock('../src/infra/db/sequelize/repository/equipment.repository');
jest.mock('../src/application/services/sse.service');

describe('Testes Unitários: Equipment Service', () => {
  
  // Limpa o histórico de chamadas das funções falsas antes de cada teste
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Deve lançar erro ao tentar criar equipamento com patrimônio já existente', async () => {
    // Simulamos que o banco de dados ACHA o equipamento
    equipmentRepository.findByPatrimonio.mockResolvedValue({ id: 1, patrimonio: '1234567' });

    const payload = { patrimonio: '1234567', tipo: 'Notebook', criado_por: 'Admin' };

    // Esperamos que o service rejeite a criação e jogue o erro exato que você programou
    await expect(equipmentService.createEquipment(payload))
      .rejects.toThrow('Este número de patrimônio já está cadastrado no sistema.');
    
    // Garante que a função de criar no banco NUNCA foi chamada
    expect(equipmentRepository.create).not.toHaveBeenCalled();
  });

  it('Deve criar um equipamento com sucesso e disparar atualização na tela (SSE)', async () => {
    // Simulamos que o banco NÃO acha o equipamento (patrimônio livre)
    equipmentRepository.findByPatrimonio.mockResolvedValue(null);
    
    // Simulamos o banco devolvendo o equipamento recém-criado
    const fakeCreatedEq = { id: 2, patrimonio: '7654321', tipo: 'Desktop', status: 'Disponível' };
    equipmentRepository.create.mockResolvedValue(fakeCreatedEq);

    const payload = { patrimonio: '7654321', tipo: 'Desktop', criado_por: 'Admin' };
    const result = await equipmentService.createEquipment(payload);

    expect(result).toEqual(fakeCreatedEq);
    expect(equipmentRepository.create).toHaveBeenCalledWith({
      patrimonio: '7654321',
      tipo: 'Desktop',
      observacao: undefined,
      status: 'Disponível', // Valida o fallback 'Disponível' que está no seu código
      criado_por: 'Admin'
    });
    // Verifica se o aviso do realtime foi enviado pro frontend
    expect(sseService.broadcast).toHaveBeenCalledWith({ action: 'RELOAD_DATA' });
  });

  it('Deve retornar todos os equipamentos cadastrados', async () => {
    const fakeList = [{ id: 1, tipo: 'Mouse' }, { id: 2, tipo: 'Teclado' }];
    equipmentRepository.findAll.mockResolvedValue(fakeList);

    const result = await equipmentService.getAllEquipments();

    expect(result).toEqual(fakeList);
    expect(equipmentRepository.findAll).toHaveBeenCalledTimes(1);
  });

  it('Deve atualizar o status do equipamento e disparar atualização (SSE)', async () => {
    equipmentRepository.update.mockResolvedValue(true);

    const result = await equipmentService.updateEquipmentStatus(1, 'Em Manutenção');

    expect(result).toBe(true);
    expect(equipmentRepository.update).toHaveBeenCalledWith(1, { status: 'Em Manutenção' });
    expect(sseService.broadcast).toHaveBeenCalledWith({ action: 'RELOAD_DATA' });
  });

  it('Deve deletar o equipamento e disparar atualização (SSE)', async () => {
    equipmentRepository.delete.mockResolvedValue(true);

    const result = await equipmentService.deleteEquipment(99);

    expect(result).toBe(true);
    expect(equipmentRepository.delete).toHaveBeenCalledWith(99);
    expect(sseService.broadcast).toHaveBeenCalledWith({ action: 'RELOAD_DATA' });
  });

});