const request = require('supertest');
const fastify = require('../src/server'); // 👈 Coloque o caminho correto do seu arquivo principal aqui

describe('Testes de Integração: Autenticação (Login)', () => {
  
  // Antes de rodar os testes, pedimos pro Fastify carregar os plugins e rotas
  beforeAll(async () => {
    await fastify.ready();
  });

  // Depois que todos os testes rodarem, fechamos o servidor virtual do Fastify
  afterAll(async () => {
    await fastify.close();
  });

  it('Deve retornar erro 400 (Bad Request) se tentar logar com o payload vazio', async () => {
    const response = await request(fastify.server)
      .post('/api/login') // 👈 Corrija a URL aqui
      .send({}); 

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain("body must have required property 'email'");
  });

  it('Deve retornar erro 400 se o e-mail não tiver um formato válido (@)', async () => {
    const response = await request(fastify.server)
      .post('/api/login') // 👈 E corrija aqui também
      .send({
        email: 'email-sem-arroba-e-dominio',
        senha: 'senha-qualquer'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('email');
  })

  it('Deve fazer login com sucesso e retornar o Token JWT e dados do usuário (Caminho Feliz)', async () => {
    const response = await request(fastify.server)
      .post('/api/login')
      .send({
        email: 'admin@itapecerica.sp.gov.br', // 👈 Coloque um e-mail real do seu banco
        senha: 'adm'               // 👈 Coloque a senha real desse e-mail
      });

    // Como deu tudo certo, esperamos o status 200 (OK)
    expect(response.status).toBe(200);
    
    // Esperamos receber a propriedade 'token'
    expect(response.body).toHaveProperty('token');
    
    // Esperamos receber o objeto 'user' com os dados descriptografados
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', 'admin@itapecerica.sp.gov.br');
    expect(response.body.user).toHaveProperty('role');
  });
});