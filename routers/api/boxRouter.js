const express = require("express");
const router = express.Router();


const { getBox, postBox, deleteBoxById, getByMonth, getByUSer, getDebts} = require('../../controllers/box.controllers')

router.get("/", getBox)
router.get("/byUSer", getByUSer)
router.get("/debts", getDebts)
router.get("/byMonth", getByMonth)
router.post("/", postBox)
router.delete("/:id", deleteBoxById)

module.exports = router;
