const express = require("express");
const router = express.Router();
const { checkRole } = require("../../middlewares/auth.handler");

const {
  getShoppingOrders,
  getShoppingOrderById,
  postShoppingOrder,
  putShoppingOrder,
  confirmShoppingOrder,
  deleteShoppingOrder,
} = require("../../controllers/shoppingOrders.controllers");

const allRoles = ["admin", "seller", "viewer"];

router.get("/", checkRole(allRoles), getShoppingOrders);
router.get("/:id", checkRole(allRoles), getShoppingOrderById);
router.post("/", checkRole(["admin"]), postShoppingOrder);
router.put("/:id", checkRole(["admin"]), putShoppingOrder);
router.patch("/:id/confirm", checkRole(["admin"]), confirmShoppingOrder);
router.delete("/:id", checkRole(["admin"]), deleteShoppingOrder);

module.exports = router;
