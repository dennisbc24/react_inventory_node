const express = require("express");
const router = express.Router();
const { checkRole } = require('../../middlewares/auth.handler')


const { getSupliers, postSupplier, patchSupplier } = require('../../controllers/suppliers.controllers')

router.get("/", getSupliers)
router.post("/", checkRole(['admin']), postSupplier)
router.patch("/:id", checkRole(['admin']), patchSupplier)

module.exports = router;
