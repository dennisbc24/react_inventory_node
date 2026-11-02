const { ShoppingOrdersService } = require("../services/shopping_orders_service");

const service = new ShoppingOrdersService();

const handleError = (res, error) => {
  console.error("Shopping orders error:", error);
  res.status(error.status || 500).json({ message: error.message || "Error interno del servidor" });
};

const getShoppingOrders = async (req, res) => {
  try {
    const response = await service.findAll();
    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
};

const getShoppingOrderById = async (req, res) => {
  try {
    const response = await service.findById(req.params.id);
    if (!response) return res.status(404).json({ message: "Pedido no encontrado" });
    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
};

const postShoppingOrder = async (req, res) => {
  try {
    const { title, note, items } = req.body;
    const fk_user = req.user ? req.user.sub : undefined;
    const response = await service.create({ title, note, items, fk_user });
    res.status(201).json(response);
  } catch (error) {
    handleError(res, error);
  }
};

const putShoppingOrder = async (req, res) => {
  try {
    const { title, note, items } = req.body;
    const response = await service.updateDraft(req.params.id, { title, note, items });
    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
};

const confirmShoppingOrder = async (req, res) => {
  try {
    const response = await service.confirm(req.params.id);
    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
};

const deleteShoppingOrder = async (req, res) => {
  try {
    const response = await service.remove(req.params.id);
    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getShoppingOrders,
  getShoppingOrderById,
  postShoppingOrder,
  putShoppingOrder,
  confirmShoppingOrder,
  deleteShoppingOrder,
};
