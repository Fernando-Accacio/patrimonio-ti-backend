const equipmentService = require('../../../application/services/equipment.service');

exports.create = async (req, res) => {
  try {
    const equipment = await equipmentService.createEquipment(req.body);
    return res.status(201).send(equipment);
  } catch (e) { res.status(400).send({ error: e.message }); }
};

exports.list = async (req, res) => {
  const equipments = await equipmentService.getAllEquipments();
  return res.send(equipments);
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { Equipment } = require('../../../infra/db/sequelize/models');
    await Equipment.update(req.body, { where: { id } });
    return res.send({ message: 'Equipamento atualizado com sucesso.' });
  } catch (e) { res.status(400).send({ error: e.message }); }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const { Equipment } = require('../../../infra/db/sequelize/models');
    await Equipment.destroy({ where: { id } });
    return res.send({ message: 'Equipamento deletado.' });
  } catch (e) { res.status(400).send({ error: 'Não é possível deletar equipamento com histórico de chamados.' }); }
};