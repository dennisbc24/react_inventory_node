const express = require("express");
const router = express.Router();


const { getSupliers } = require('../../controllers/suppliers.controllers')

router.get("/", getSupliers)

module.exports = router;