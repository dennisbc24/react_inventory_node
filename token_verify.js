const jwt = require('jsonwebtoken')

const secret = 'dennis'
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTcwNzcwMjIzMn0.9DCbPOmnm_oYBcUXuOuyI_9Gamf87Nxf140XsPG4yQg'

function verifyToken(token, secret) {
    return jwt.verify(token, secret)
}

const payload = verifyToken(token, secret)
console.log(payload);