const express = require("express");
const router = express.Router();


const { getBranches } = require('../../controllers/branches.controllers')

router.get("/", getBranches)

module.exports = router;