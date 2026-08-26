const express = require("express");
const router = express.Router();
const { checkRole } = require("../../middlewares/auth.handler");
const { getCategories, postCategory, patchCategory, deleteCategory, getCategoryById } = require("../../controllers/categories.controllers");

router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.post("/", checkRole(['admin']), postCategory);
router.patch("/:id", checkRole(['admin']), patchCategory);
router.delete("/:id", checkRole(['admin']), deleteCategory);

module.exports = router;
