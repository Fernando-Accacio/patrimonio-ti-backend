class SSEService {
  constructor() {
    this.clients = [];
  }

  // Adiciona o usuário que conectou na lista
  addClient(client) {
    this.clients.push(client);
  }

  // Remove quando o usuário fecha a aba do navegador
  removeClient(client) {
    this.clients = this.clients.filter(c => c !== client);
  }

  // Dispara a mensagem para todo mundo que tá escutando
  broadcast(data) {
    this.clients.forEach(client => {
      // O formato do SSE exige começar com "data: " e terminar com "\n\n"
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }
}

module.exports = new SSEService();