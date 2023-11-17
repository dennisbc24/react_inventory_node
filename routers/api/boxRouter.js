const express = require("express");
const router = express.Router();


const { getBox, postBox, deleteBoxById, getByMonth} = require('../../controllers/box.controllers')

router.get("/", getBox)
router.get("/byMonth", getByMonth)
router.post("/", postBox)
router.delete("/:id", deleteBoxById)

module.exports = router;
