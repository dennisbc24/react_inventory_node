const { Pool } = require("pg");
const moment = require('moment-timezone');
  // Configura moment.js para utilizar la zona horaria de Lima (America/Lima)
  moment.tz.setDefault('America/Lima');
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

const postEntries = async (req, res) => {
  const { pointB, fk_supplier, amount, fk_user, fk_product, string_supplier } = req.body;
  const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
  console.log(req.body);

try {
//check if there is supplier key
if (fk_supplier=='') {
  console.log('no hay fk_supplier');
//crear supplier
  const createSupplier = await pool.query("INSERT INTO suppliers(name) VALUES ($1) RETURNING id_supplier;", [  string_supplier]  );
  newSupplierId = createSupplier.rows[0].id_supplier;

  //con el id crear la entry

const response = await pool.query("SELECT id_existence FROM public.existence WHERE fk_branch= $1 AND fk_product= $2;", [pointB, fk_product]);
  const existence = response.rows[0];

          if (existence == undefined) {
          const createExistence = await pool.query("INSERT INTO existence(amount, fk_branch, fk_product, fk_user, created, updated) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_existence", [  amount,  pointB,   fk_product,  fk_user,   fechaActual.toDate(), fechaActual.toDate(), ]  );
            newExistenceId = createExistence.rows[0].id_existence;
          const createEntry = await pool.query("INSERT INTO entries(fk_supplier, fk_existence, fk_user, amount, date) VALUES ($1, $2, $3, $4, $5)",[newSupplierId, newExistenceId, fk_user, amount, fechaActual.toDate()])
        } else {
          const outgoing = await pool.query("UPDATE existence SET amount = amount + $1, fk_user = $2, updated = $3 WHERE fk_branch = $4 AND fk_product = $5",[amount, fk_user, fechaActual.toDate(), pointB, fk_product]);
            const createEntry = await pool.query("INSERT INTO entries(fk_supplier, fk_existence, fk_user, amount, date) VALUES ($1, $2, $3, $4, $5)",[newSupplierId, existence.id_existence, fk_user, amount, fechaActual.toDate()])

        }
} else {

    const response = await pool.query(
"SELECT id_existence FROM public.existence WHERE fk_branch= $1 AND fk_product= $2;", [pointB, fk_product]);
  const existence = response.rows[0];

  if (existence == undefined) {
    const createExistence = await pool.query("INSERT INTO existence(amount, fk_branch, fk_product, fk_user, created, updated) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_existence", [  amount,  pointB,   fk_product,  fk_user,   fechaActual.toDate(), fechaActual.toDate(), ]  );
    newExistenceId = createExistence.rows[0].id_existence;
    const createEntry = await pool.query("INSERT INTO entries(fk_supplier, fk_existence, fk_user, amount, date) VALUES ($1, $2, $3, $4, $5)",[fk_supplier, newExistenceId, fk_user, amount, fechaActual.toDate()])
  } else {
    const outgoing = await pool.query("UPDATE existence SET amount = amount + $1, fk_user = $2, updated = $3 WHERE fk_branch = $4 AND fk_product = $5",[amount, fk_user, fechaActual.toDate(), pointB, fk_product]);
    const createEntry = await pool.query("INSERT INTO entries(fk_supplier, fk_existence, fk_user, amount, date) VALUES ($1, $2, $3, $4, $5)",[fk_supplier, existence.id_existence, fk_user, amount, fechaActual.toDate()])

    console.log('si hay fk_supplier');
}
}


 }
 catch (e) {
     console.error(e);
 }

};

const getEntriesJoin = async (req, res) => {
   
  const response = await pool.query("SELECT branches.name AS branch,entries.amount,products.name AS product,users.name AS usuario,updated,id_entry FROM public.entries INNER JOIN public.users ON public.entries.fk_user = public.users.id_user INNER JOIN public.existence ON public.entries.fk_existence = public.existence.id_existence INNER JOIN public.branches ON public.existence.fk_branch = public.branches.id_branch INNER JOIN public.products ON public.existence.fk_product = public.products.id_product ORDER BY id_entry DESC LIMIT 10");

  res.json(response.rows);
};

module.exports = {postEntries,getEntriesJoin};