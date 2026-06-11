const userService = require('../src/application/services/user.service');
const userRepository = require('../src/infra/db/sequelize/repository/user.repository');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Criamos mocks para as dependências externas que o service usa
jest.mock('../src/infra/db/sequelize/repository/user.repository');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('Testes Unitários: User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Como o UserService guarda dados em variáveis globais (let pendentesReset = []), precisamos limpá-las se quisermos testar do zero a cada "it", mas para simplificar, usaremos de forma sequencial nos testes de reset.
  });

  // ==========================
  // CRIAÇÃO DE USUÁRIO
  // ==========================
  it('Deve lançar erro se o e-mail não for @itapecerica.sp.gov.br', async () => {
    const payload = { email: 'fernando@gmail.com', ramal: '123' };
    await expect(userService.createUser(payload)).rejects.toThrow('Acesso negado: O e-mail deve ser institucional');
  });

  it('Deve lançar erro se o ramal não for informado', async () => {
    const payload = { email: 'admin@itapecerica.sp.gov.br', ramal: ' ' };
    await expect(userService.createUser(payload)).rejects.toThrow('O número do ramal é obrigatório para o cadastro');
  });

  it('Deve lançar erro de e-mail duplicado se o Sequelize reclamar', async () => {
    bcrypt.hash.mockResolvedValue('hashsenha');
    const erroSequelize = new Error('Unique constraint');
    erroSequelize.name = 'SequelizeUniqueConstraintError';
    userRepository.create.mockRejectedValue(erroSequelize);

    const payload = { email: 'admin@itapecerica.sp.gov.br', ramal: '123' };
    await expect(userService.createUser(payload)).rejects.toThrow('E-mail já cadastrado.');
  });

  // ==========================
  // LOGIN
  // ==========================
  it('Deve lançar erro se tentar logar com usuário que não existe', async () => {
    userRepository.findAllWithPassword.mockResolvedValue([]); // Banco retorna vazio
    await expect(userService.login('admin@itapecerica.sp.gov.br', 'senha')).rejects.toThrow('Usuário não encontrado.');
  });

  it('Deve lançar erro se a senha estiver incorreta', async () => {
    // Nós "criptografamos" o email com o utils que está sendo importado de verdade
    const { encryptEmail } = require('../src/core/utils/auth.utils');
    const emailCriptografado = encryptEmail('admin@itapecerica.sp.gov.br');
    
    userRepository.findAllWithPassword.mockResolvedValue([{ 
      id: 1, 
      email: emailCriptografado, 
      senha: 'hashdosenhabanco' 
    }]);
    
    bcrypt.compare.mockResolvedValue(false); // Simula que a senha não bateu

    await expect(userService.login('admin@itapecerica.sp.gov.br', 'senhaerrada')).rejects.toThrow('Senha incorreta.');
  });

  // ==========================
  // ATUALIZAR SENHA E ROLE
  // ==========================
  it('Deve lançar erro se a nova senha for menor que 6 caracteres', async () => {
    await expect(userService.updatePassword(1, '12345')).rejects.toThrow('A nova senha deve ter pelo menos 6 caracteres.');
  });

  it('Deve atualizar a ROLE de um usuário', async () => {
    userRepository.update.mockResolvedValue(true);
    await userService.updateRole(1, 'TECH');
    expect(userRepository.update).toHaveBeenCalledWith(1, { role: 'TECH' });
  });

  it('Deve deletar um usuário', async () => {
    userRepository.delete.mockResolvedValue(true);
    await userService.deleteUser(1);
    expect(userRepository.delete).toHaveBeenCalledWith(1);
  });

  // ==========================
  // RESET DE SENHA (Caminho completo)
  // ==========================
  it('Deve gerenciar o fluxo de solicitação e rejeição de redefinição de senha', async () => {
    const { encryptEmail } = require('../src/core/utils/auth.utils');
    
    // 1. Pedimos um reset para um usuário que não existe
    userRepository.findAll.mockResolvedValue([]);
    await expect(userService.requestPasswordReset('fantasma@itapecerica.sp.gov.br')).rejects.toThrow('Se este e-mail existir no sistema');

    // 2. Pedimos um reset para um usuário real
    userRepository.findAll.mockResolvedValue([{ id: 10, nome: 'João', email: encryptEmail('joao@itapecerica.sp.gov.br') }]);
    await userService.requestPasswordReset('joao@itapecerica.sp.gov.br');
    
    // 3. Verificamos se ele entrou na lista de pendentes
    const pendentes = await userService.getPendingResets();
    expect(pendentes.length).toBe(1);
    expect(pendentes[0].userId).toBe(10);
    const fakeResetId = pendentes[0].id;

    // 4. Tentamos pedir de novo pro mesmo usuário e deve dar erro
    await expect(userService.requestPasswordReset('joao@itapecerica.sp.gov.br')).rejects.toThrow('Você já possui uma solicitação pendente');

    // 5. O Admin rejeita o pedido
    await userService.rejectPasswordReset(fakeResetId);
    
    // 6. A lista de pendentes deve estar vazia e o histórico deve ter registrado
    expect((await userService.getPendingResets()).length).toBe(0);
    expect((await userService.getResetHistory()).length).toBeGreaterThan(0);
    expect((await userService.getResetHistory())[0].status).toBe('Recusado');
  });

  it('Deve aprovar a redefinição de senha e gerar uma senha nova', async () => {
    const { encryptEmail } = require('../src/core/utils/auth.utils');
    
    // Criamos um novo pedido
    userRepository.findAll.mockResolvedValue([{ id: 20, nome: 'Maria', email: encryptEmail('maria@itapecerica.sp.gov.br') }]);
    await userService.requestPasswordReset('maria@itapecerica.sp.gov.br');
    
    const pendentes = await userService.getPendingResets();
    const fakeResetId = pendentes[0].id;

    // Simulamos que o banco vai achar a Maria quando formos aprovar
    userRepository.findById.mockResolvedValue({ id: 20, nome: 'Maria' });
    bcrypt.hash.mockResolvedValue('novohash'); // O updatePassword chama o hash

    // Admin aprova o pedido
    await userService.approvePasswordReset(fakeResetId);

    // O pedido sai da lista de pendentes e vai pro histórico como Aprovado
    expect((await userService.getPendingResets()).length).toBe(0);
    expect((await userService.getResetHistory())[0].status).toBe('Aprovado');
  });
});