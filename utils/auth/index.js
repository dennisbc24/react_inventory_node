const passport = require('passport')

const LocalStrategy = require('./strategies/local.strategy')
const JwtStrategy = require('./strategies/jwt.strategy');
//const FacebookStrategy = require('./strategies/...')

passport.use(LocalStrategy);
passport.use(JwtStrategy);