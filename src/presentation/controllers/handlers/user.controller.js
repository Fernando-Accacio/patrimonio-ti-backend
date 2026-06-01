const userService = require('../../../application/services/user.service');
const userRepository = require('../../../infra/db/sequelize/repository/user.repository');

class UserController {
  async register(req, res) {
    try {
      const user = await userService.createUser(req.body);
      return res.status(201).send(user);
    } catch (e) { 
      return res.status(400).send({ error: e.message }); 
    }
  }

  async login(req, res) {
    try {
      const { email, senha } = req.body;
      const data = await userService.login(email, senha);
      return res.status(200).send(data);
    } catch (e) { 
      return res.status(401).send({ error: e.message }); 
    }
  }

  async listAll(req, res) {
    try {
      const users = await userRepository.findAll();
      return res.status(200).send(users);
    } catch (e) { 
      return res.status(500).send({ error: e.message }); 
    }
  }

  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (parseInt(id) === req.user.id) {
        return res.status(403).send({ error: 'Operação negada: Você não pode alterar o seu próprio cargo.' });
      }

      await userRepository.update(id, { role });
      return res.status(200).send({ message: 'Nível de acesso atualizado.' });
    } catch (e) {
      return res.status(500).send({ error: e.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      
      if (parseInt(id) === req.user.id) {
        return res.status(403).send({ error: 'Operação negada: Você não pode deletar a sua própria conta.' });
      }

      const deletados = await userRepository.delete(id);
      if (deletados === 0) return res.status(404).send({ error: 'Usuário não encontrado.' });

      return res.status(200).send({ message: 'Usuário inativado com sucesso.' });
    } catch (e) { 
      return res.status(500).send({ error: e.message }); 
    }
  }

  // --- NOVAS ROTAS DE PERFIL ---

  async updateProfile(req, res) {
    try {
      const { nome, email } = req.body;
      await userService.updateProfile(req.user.id, { nome, email });
      return res.status(200).send({ message: 'Perfil atualizado com sucesso.' });
    } catch (e) {
      return res.status(400).send({ error: e.message });
    }
  }

  async updatePassword(req, res) {
    try {
      const { novaSenha } = req.body;
      await userService.updatePassword(req.user.id, novaSenha);
      return res.status(200).send({ message: 'Senha atualizada com sucesso.' });
    } catch (e) {
      return res.status(400).send({ error: e.message });
    }
  }

  async updateAnyUserPassword(req, res) {
    try {
      const { id } = req.params; // ID do usuário que vai ter a senha trocada
      const { novaSenha } = req.body;
      
      // Reutiliza a lógica segura do service
      await userService.updatePassword(id, novaSenha);
      
      return res.status(200).send({ message: 'Senha do usuário atualizada com sucesso.' });
    } catch (e) {
      return res.status(400).send({ error: e.message });
    }
  }
}

module.exports = new UserController();