const express = require("express");
const router = express.Router();


const { getBox, postBox, deleteBoxById} = require('../../controllers/box.controllers')

router.get("/", getBox)
router.post("/", postBox)
router.delete("/:id", deleteBoxById)

module.exports = router;
