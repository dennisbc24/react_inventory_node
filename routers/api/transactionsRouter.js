const express = require("express");
const router = express.Router();
const { checkRole } = require('../../middlewares/auth.handler')


const { postTransactions, joinTransactions} = require('../../controllers/transactions.controllers')


router.post("/", checkRole(['admin']), postTransactions)
router.get("/", joinTransactions)

module.exports = router;