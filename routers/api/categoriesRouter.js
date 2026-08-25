const express = require("express");
const router = express.Router();
const { checkRole } = require("../../middlewares/auth.handler");
const { getCategories, postCategory } = require("../../controllers/categories.controllers");

router.get("/", getCategories);
router.post("/", checkRole(['admin']), postCategory);

module.exports = router;
