const express = require("express");
const router = express.Router();
const { checkRole } = require('../../middlewares/auth.handler')

const {
  getShoppingList,
  addShoppingListItem,
  getShoppingListByProduct,
  purchasedShoppingListItem,
  removeShoppingListItem,
  reorderShoppingList
} = require('../../controllers/shoppingList.controllers')

const allRoles = ['admin', 'seller', 'viewer']

router.get("/", checkRole(allRoles), getShoppingList)
router.get("/byProduct", checkRole(allRoles), getShoppingListByProduct)
router.post("/", checkRole(['admin']), addShoppingListItem)
router.put("/order", checkRole(['admin']), reorderShoppingList)
router.patch("/:id/purchased", checkRole(['admin']), purchasedShoppingListItem)
router.delete("/:id", checkRole(['admin']), removeShoppingListItem)

module.exports = router;