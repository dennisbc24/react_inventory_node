const express = require("express");
const router = express.Router();
const { checkRole } = require('../../middlewares/auth.handler')


const { getBox, postBox, deleteBoxById, getByMonth, getByUSer, getDebts, postDebt, getTransactionByUser, getLastSpends, postMoneyTransaction, savePayment} = require('../../controllers/box.controllers')

router.get("/", getBox)
router.get("/byUSer", getByUSer)
router.get("/transByUSer",getTransactionByUser )
router.get("/debts", getDebts)
router.get("/byMonth", getByMonth)
router.get("/lastSpends", getLastSpends)

router.post("/", checkRole(['admin']), postBox)
router.post("/newDebt", checkRole(['admin']), postDebt)
router.delete("/:id", checkRole(['admin']), deleteBoxById)
router.post("/newTrans", checkRole(['admin']), postMoneyTransaction)
router.post("/payDebt", checkRole(['admin']), savePayment)

module.exports = router;
