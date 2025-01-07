const express = require("express");
const router = express.Router();
const passport = require('passport')

const { getUsers, createUser, getCash } = require('../../controllers/users.controllers')

router.get("/", 
passport.authenticate('jwt', {session: false}),
 getUsers)

router.post("/", createUser)
router.get("/getCash", getCash)

module.exports = router;