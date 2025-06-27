const { Pool } = require("pg");
const moment = require("moment-timezone");

const {ExistenceService} = require('../services/existence_service')
const service = new ExistenceService();
// Configura moment.js para utilizar la zona horaria de Lima (America/Lima)
moment.tz.setDefault("America/Lima");
const config = require("../config/config");

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

const postExistence = async (req, res) => {
  try {
    const { amount, fk_branch, fk_product, fk_user } = req.body;
    const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
    const response = await pool.query(
      "INSERT INTO existence (amount, fk_branch, fk_product, fk_user, created, updated) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        amount,
        fk_branch,
        fk_product,
        fk_user,
        fechaActual.toDate(),
        fechaActual.toDate(),
      ]
    );

    res.send("existence registered");
  } catch (e) {
    console.error(e);
  }
};

const postExistence_Vendings = async (req, res) => {
  try {
    const { amount, fk_branch, fk_product, fk_user } = req.body;

    const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima

    const responseA = await pool.query(
      "SELECT id_existence FROM public.existence WHERE fk_branch= $1 AND fk_product= $2;",
      [fk_branch, fk_product]
    );
    const existenceA = responseA.rows[0];
    if (existenceA == undefined) {
      const createExistence = await pool.query(
        "INSERT INTO existence(amount, fk_branch, fk_product, fk_user, created, updated) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_existence",
        [
          amount,
          fk_branch,
          fk_product,
          fk_user,
          fechaActual.toDate(),
          fechaActual.toDate(),
        ]
      );
      newExistenceId = createExistence.rows[0].id_existence;

      const response = await pool.query(
        "UPDATE public.existence SET amount = 0, fk_user = $1, updated = $2 WHERE id_existence = $3;",
        [fk_user, fechaActual.toDate(), newExistenceId]
      );
  
    } else {

      const response = await pool.query(
        "UPDATE public.existence SET amount = amount - $1, fk_user = $2, updated = $3 WHERE fk_branch = $4 AND fk_product = $5 ;",
        [amount, fk_user, fechaActual.toDate(), fk_branch, fk_product]
      );
  
      res.send("existence updated");
      console.log(req.body);
    }



    
  } catch (e) {
    console.error(e);
  }
};

const getExistenceJoin = async (req, res) => {
  const query_product=req.query.product
  console.log(query_product);
  const response = await pool.query("SELECT public.branches.name AS branch_name,amount, public.products.name AS product,public.existence.created, public.existence.updated, id_existence FROM public.existence INNER JOIN public.branches ON public.existence.fk_branch = public.branches.id_branch INNER JOIN public.products ON public.existence.fk_product = public.products.id_product WHERE  public.existence.fk_product = $1",[query_product]);

  res.json(response.rows);
};

const getInventaryByBranch = async (req, res) => {
  const id_branch= req.query.branch
  
  const response = await pool.query("SELECT amount,products.name AS product , products.cost AS costo,branches.name AS sucursal,existence.id_existence FROM existence INNER JOIN branches ON existence.fk_branch = branches.id_branch INNER JOIN products ON existence.fk_product = products.id_product WHERE fk_branch = $1 ORDER BY LOWER(products.name) ASC",[id_branch]);

  res.json(response.rows);
};

const getInventaryInStock = async (req, res) => {
  const response = await pool.query("SELECT products.name AS product, SUM(existence.amount) AS total_amount, products.cost AS costo FROM existence INNER JOIN branches ON existence.fk_branch = branches.id_branch INNER JOIN products ON existence.fk_product = products.id_product GROUP BY products.name, products.cost HAVING SUM(existence.amount) >= 1 ORDER BY total_amount ASC, LOWER(products.name) ASC;");
  res.json(response.rows);
}

const getInventaryByProductName = async (req, res) => {
  const keyWord= req.query.keyWord
  
  const response = await pool.query(`SELECT products.name AS product, SUM(amount) AS stock FROM existence INNER JOIN products ON existence.fk_product = products.id_product WHERE unaccent(lower(products.name)) ILIKE '%' || unaccent(lower('${keyWord}')) || '%' GROUP BY products.name ORDER BY stock DESC`);

  res.json(response.rows);
};

const UpdateExistenceCount = async (req, res) => {
  const response = await service.updateCount(req.body)
  console.log(req.body)
  res.json(response);  
};
const getInShortSupply = async (req, res) => {
  const response = await service.getInShortSupply()
  res.json(response);  
};
module.exports = { getInventaryInStock, postExistence, getExistenceJoin, postExistence_Vendings,getInventaryByBranch, getInventaryByProductName, UpdateExistenceCount, getInShortSupply };
