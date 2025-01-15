const express = require("express");
const router = express.Router();


const { getBox, postBox, deleteBoxById, getByMonth, getByUSer, getDebts, postDebt, getTransactionByUser, getLastSpends, postMoneyTransaction} = require('../../controllers/box.controllers')

router.get("/", getBox)
router.get("/byUSer", getByUSer)
router.get("/transByUSer",getTransactionByUser )
router.get("/debts", getDebts)
router.get("/byMonth", getByMonth)
router.get("/lastSpends", getLastSpends)

router.post("/", postBox)
router.post("/newDebt", postDebt)
router.delete("/:id", deleteBoxById)
router.post("/newTrans", postMoneyTransaction)

module.exports = router;
