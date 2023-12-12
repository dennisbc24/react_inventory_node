const express = require("express");
const router = express.Router();


const { postTransactions} = require('../../controllers/transactions.controllers')


router.post("/", postTransactions)


module.exports = router;