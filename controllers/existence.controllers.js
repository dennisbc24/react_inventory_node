const { Pool } = require("pg");
const moment = require("moment-timezone");
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
  const response = await pool.query(
    "SELECT public.branches.name AS branch_name,amount, public.products.name AS product,public.existence.created, updated, id_existence FROM public.existence INNER JOIN public.branches ON public.existence.fk_branch = public.branches.id_branch INNER JOIN public.products ON public.existence.fk_product = public.products.id_product WHERE  public.existence.fk_product = '558'"
  );

  res.json(response.rows);
};

module.exports = { postExistence, getExistenceJoin, postExistence_Vendings };
