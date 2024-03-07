const express = require("express");
const router = express.Router();
const passport = require('passport')
const jwt = require('jsonwebtoken')
const {config} = require('../../config/config')

router.post("/login", 
passport.authenticate('local', {session: false}),
async (req, res, next)=>{
try {
    const user = req.user
    const payload = {
        sub:user.id_user,
        role: user.role
    }
    const secret = config.jwtSecret
    const token = jwt.sign(payload, secret)
    res.json({user, token})
} catch (error) {
    
    next(`error`)
    
}
})


module.exports = router;