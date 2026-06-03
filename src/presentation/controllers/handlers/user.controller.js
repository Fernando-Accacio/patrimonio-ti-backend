const userService = require('../../../application/services/user.service');
const userRepository = require('../../../infra/db/sequelize/repository/user.repository');
const sseService = require('../../../application/services/sse.service'); 

class UserController {
  async register(req, res) {
    try {
      const user = await userService.createUser(req.body);
      sseService.broadcast({ action: 'RELOAD_DATA' }); // Injetado SSE
      return res.status(201).send(user);
    } catch (e) { return res.status(400).send({ error: e.message }); }
  }

  async login(req, res) {
    try {
      const { email, senha } = req.body;
      const data = await userService.login(email, senha);
      return res.status(200).send(data);
    } catch (e) { return res.status(401).send({ error: e.message }); }
  }

  async listAll(req, res) {
    try {
      const users = await userService.getAllUsers();
      return res.status(200).send(users);
    } catch (e) { return res.status(500).send({ error: e.message }); }
  }

  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (parseInt(id) === req.user.id) return res.status(403).send({ error: 'Operação negada.' });

      await userRepository.update(id, { role });
      sseService.broadcast({ action: 'FORCE_LOGOUT', userId: parseInt(id) });
      sseService.broadcast({ action: 'RELOAD_DATA' });
      return res.status(200).send({ message: 'Nível de acesso atualizado.' });
    } catch (e) { return res.status(500).send({ error: e.message }); }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      if (parseInt(id) === req.user.id) return res.status(403).send({ error: 'Operação negada.' });

      const deletados = await userRepository.delete(id);
      if (deletados === 0) return res.status(404).send({ error: 'Usuário não encontrado.' });

      sseService.broadcast({ action: 'FORCE_LOGOUT', userId: parseInt(id) });
      sseService.broadcast({ action: 'RELOAD_DATA' });
      return res.status(200).send({ message: 'Usuário inativado com sucesso.' });
    } catch (e) { return res.status(500).send({ error: e.message }); }
  }

  async updatePassword(req, res) {
    try {
      const { novaSenha } = req.body;
      await userService.updatePassword(req.user.id, novaSenha);
      sseService.broadcast({ action: 'RELOAD_DATA' }); // Injetado SSE
      return res.status(200).send({ message: 'Senha updated!' });
    } catch (e) { return res.status(400).send({ error: e.message }); }
  }

  async requestReset(req, res) {
    try {
      const { email } = req.body;
      await userService.requestPasswordReset(email);
      sseService.broadcast({ action: 'RELOAD_DATA' }); // Injetado SSE
      return res.status(200).send({ message: 'Se o e-mail for válido, a solicitação foi enviada.' });
    } catch (e) { return res.status(400).send({ error: e.message }); }
  }

  async getResetRequests(req, res) {
    try {
      const requests = await userService.getPendingResets();
      return res.status(200).send(requests);
    } catch (e) { return res.status(500).send({ error: e.message }); }
  }

  async approveReset(req, res) {
    try {
      const { id } = req.params;
      await userService.approvePasswordReset(id);
      sseService.broadcast({ action: 'RELOAD_DATA' }); // Injetado SSE
      return res.status(200).send({ message: 'Senha redefinida e e-mail enviado.' });
    } catch (e) { return res.status(400).send({ error: e.message }); }
  }

  async rejectReset(req, res) {
    try {
      const { id } = req.params;
      await userService.rejectPasswordReset(id);
      sseService.broadcast({ action: 'RELOAD_DATA' }); // Injetado SSE
      return res.status(200).send({ message: 'Solicitação recusada.' });
    } catch (e) { return res.status(400).send({ error: e.message }); }
  }

  async getResetHistory(req, res) {
    try {
      const history = await userService.getResetHistory();
      return res.status(200).send(history);
    } catch (e) { return res.status(500).send({ error: e.message }); }
  }

  async adminCreateUser(req, res) {
    try {
      await userService.createUser(req.body);
      sseService.broadcast({ action: 'RELOAD_DATA' });
      return res.status(201).send({ message: 'Funcionário cadastrado com sucesso! A senha foi gerada e enviada.' });
    } catch (e) {
      return res.status(400).send({ error: e.message });
    }
  }
}

module.exports = new UserController();