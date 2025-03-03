const { Pool } = require("pg");
const {SpendingService} = require('../services/spending_service')
const config = require("../config/config");
const { response } = require("express");
const service = new SpendingService()
const {Box} = require('../services/box_service')
const service2 = new Box()



const pool = new Pool({
  user: config.config.dbUser,
  host: config.config.dbHost,
  database: config.config.dbName,
  password: config.config.dbPassword,
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});
const getByUSer = async(req,res)=>{
const response = await service2.getByUser(req)
res.json(response)
}
const getBox = async (req, res) => {
  const response = await service.get()
  res.json(response);
};

const getByMonth = async (req, res) => {
  const response = await service.getByMonth(req)
  res.json(response);
}


const postBox = async (req, res) => {
  const response = await service.post(req)
  res.send(response);
  
  
};

const deleteBoxById = async (req, res) => {
  const response = await service.delete(req)
  res.json(response);
  };

const getDebts = async (req,res)=>{
  const debts = await service2.getDebts()
  res.json(debts)
};
const postDebt = async (req,res)=>{
  const newDebt = await service2.newDebt(req)
  res.json(newDebt)
}
const getTransactionByUser = async (req, res) =>{
const getTransByUser = await service2.getTransactionByUser(req)
res.json(getTransByUser)
}
const getLastSpends = async (req,res) =>{
  const response = await service2.getLastSpends(req)
  res.json(response)
}

const postMoneyTransaction = async (req, res) => {
  const sendBody = await service2.postMoneyTransaction(req)
  res.json(sendBody)
}
const savePayment = async (req, res)  => {
  const savePay = await service2.payDebt(req)
  res.json(savePay)
}
module.exports = {getBox, postBox, deleteBoxById, getByMonth, getByUSer, getDebts, postDebt, getTransactionByUser, getLastSpends, postMoneyTransaction, savePayment}