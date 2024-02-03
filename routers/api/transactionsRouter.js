const express = require("express");
const router = express.Router();


const { postTransactions, joinTransactions} = require('../../controllers/transactions.controllers')


router.post("/", postTransactions)
router.get("/", joinTransactions)

module.exports = router;