const express = require("express");
const router = express.Router();
const { checkRole } = require('../../middlewares/auth.handler')

const { getUsers, createUser, getCash } = require('../../controllers/users.controllers')

router.get("/", getUsers)

router.post("/", checkRole(['admin']), createUser)
router.get("/getCash", getCash)

module.exports = router;