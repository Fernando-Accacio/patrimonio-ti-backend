// Ajuste o caminho do require se a sua pasta __tests__ estiver em outro nível
const { ofuscarEmail, gerarSenhaAutomatica } = require('../src/core/utils/auth.utils');

describe('Testes Unitários: Utilitários de Autenticação', () => {
  
  it('Deve ofuscar o e-mail escondendo o nome do usuário', () => {
    const emailReal = 'fernando@itapecerica.sp.gov.br';
    const emailOfuscado = ofuscarEmail(emailReal);
    
    // Nossas expectativas (o que o robô vai checar)
    expect(emailOfuscado).toContain('***');
    expect(emailOfuscado).toContain('@itapecerica.sp.gov.br');
    expect(emailOfuscado).not.toBe(emailReal); // Garante que não vazou o original
  });

  it('Deve gerar uma senha automática forte', () => {
    const senha = gerarSenhaAutomatica();
    
    expect(senha.length).toBeGreaterThanOrEqual(8); // Garante que tem pelo menos 8 caracteres
    expect(typeof senha).toBe('string');
  });

});