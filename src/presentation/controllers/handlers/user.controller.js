const userService = require('../../../application/services/user.service');

exports.register = async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    return res.status(201).send(user);
  } catch (e) { res.status(400).send({ error: e.message }); }
};

exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    const data = await userService.login(email, senha);
    return res.send(data);
  } catch (e) { res.status(401).send({ error: e.message }); }
};

exports.listAll = async (req, res) => {
  const { User } = require('../../../infra/db/sequelize/models');
  try {
    const users = await User.findAll({ attributes: { exclude: ['senha'] } });
    return res.send(users);
  } catch (e) { res.status(500).send({ error: e.message }); }
};

exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const { User } = require('../../../infra/db/sequelize/models');

    if (parseInt(id) === req.user.id) {
      return res.status(400).send({ error: 'Operação negada: Você não pode alterar o seu próprio cargo.' });
    }

    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).send({ error: 'Usuário não encontrado.' });
    }

    await User.update({ role }, { where: { id } });
    return res.send({ message: 'Nível de acesso atualizado com sucesso.' });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const { User } = require('../../../infra/db/sequelize/models');
    
    if (parseInt(id) === req.user.id) {
      return res.status(400).send({ error: 'Operação negada: Você não pode deletar a sua própria conta.' });
    }

    const deletados = await User.destroy({ where: { id } });
    
    if (deletados === 0) {
      return res.status(404).send({ error: 'Usuário não encontrado.' });
    }

    return res.send({ message: 'Usuário inativado com sucesso.' });
  } catch (e) { 
    res.status(500).send({ error: e.message }); 
  }
};