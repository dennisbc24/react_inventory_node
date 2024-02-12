const {Strategy} = require('passport-local')
const {UserService} = require('../../../services/users_service')
const service = new UserService();
const boom = require('@hapi/boom')
const bcrypt = require('bcrypt')

LocalStrategy = new Strategy({usernameField:'email',passwordField:'password'},
     async(email, password, done)=>{
    try {
        
        const response =  await service.findByEmail(email)
        const user = response[0]
        if(!user) {
            done(boom.unauthorized('no coincide la contraseña o el email'), false)
            
        }
        
        const itMatch =  await bcrypt.compare(password, user.password)
        
        if(!itMatch){
            done(boom.unauthorized('no coincide la contraseña o el email'), false)
            
        }
        
        done(null, user);
    } catch (error) {
        done(error, false)
    }

})

module.exports = LocalStrategy;