const express = require("express");
const router = express.Router();
const passport = require('passport')

const { getUsers, createUser } = require('../../controllers/users.controllers')

router.get("/", 
passport.authenticate('jwt', {session: false}),
 getUsers)

router.post("/", createUser)

module.exports = router;