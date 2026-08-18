const { ShoppingListService } = require("../services/shopping_list_service");
const service = new ShoppingListService();

const getShoppingList = async (req, res) => {
  const response = await service.findAll();
  res.json(response);
};

const addShoppingListItem = async (req, res) => {
  const { id_product } = req.body;
  const fk_user = req.user ? req.user.sub : undefined;
  const response = await service.create({ id_product, fk_user });
  res.json(response);
};

const getShoppingListByProduct = async (req, res) => {
  const item = await service.findByProduct(req.query.product);
  res.json({ inList: !!item, id_shopping: item ? item.id_shopping : null });
};

const purchasedShoppingListItem = async (req, res) => {
  const response = await service.markPurchased(req.params.id);
  res.json(response);
};

const removeShoppingListItem = async (req, res) => {
  const response = await service.remove(req.params.id);
  res.json(response);
};

const reorderShoppingList = async (req, res) => {
  const response = await service.reorder(req.body.orderedIds);
  res.json(response);
};

module.exports = {
  getShoppingList,
  addShoppingListItem,
  getShoppingListByProduct,
  purchasedShoppingListItem,
  removeShoppingListItem,
  reorderShoppingList,
};