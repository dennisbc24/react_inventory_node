const { response } = require('express');
const {UserService} = require('../services/users_service')
const service = new UserService();
const passport = require('passport')

const getUsers = async (req, res) => {
  const response = await service.findAll()
  res.json(response);
};

const createUser = async (req, res) => {
  const response = await service.create(req.body)
  console.log(req.body)
  res.json(response);  
};

const getCash = async (req, res) => { 
  console.log(req.query.id);
  
  const response = await service.getCash(req.query.id)
  res.json(response);
};
module.exports = {getUsers, createUser, getCash}