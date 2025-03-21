const { Pool } = require("pg");
const bcrypt = require('bcrypt')

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

class ExistenceService {
    constructor(){

    }
    
    async updateCount (body) {
        const { id_product, id_branch, count, id_existence } = body;
        console.log(body);
        
      if (id_branch != undefined && id_product != undefined && count != undefined) {
        try {
            
          const query = await pool.query('UPDATE existence SET amount=$1 WHERE fk_branch=$2 AND fk_product=$3', [count,id_branch, id_product ]);
      
        const message = `product ${id_product} updated`;
        return message;
                
        } catch (error) {
          console.log(error);
        }
        
      }
      if (id_existence != undefined && count != undefined) {
        try {
            
          const query = await pool.query('UPDATE existence SET amount=$1 WHERE id_existence=$2', [count,id_existence]);
      
        const message = `count product updated`;
        return message;
                
        } catch (error) {
          console.log(error);
        }
        
      }
    }
    async getInShortSupply() {
        const query = await pool.query("WITH ultima_venta AS ( SELECT sales.fk_product, MAX(sales.date) AS ultima_fecha_venta    FROM sales    GROUP BY sales.fk_product ) SELECT    uv.fk_product,    p.name AS product_name,   s.name AS supplier_name, uv.ultima_fecha_venta,    COALESCE(SUM(v.amount), 0) AS total_vendido_12m,    COALESCE(SUM(v.revenue), 0) AS total_ingresos_12m,    COALESCE(e.total_amount, 0) AS total_stock, CASE         WHEN COALESCE(SUM(v.amount), 0) = 0 THEN NULL        ELSE 365.0 / SUM(v.amount)     END AS dias_entre_ventas,      CASE         WHEN COALESCE(SUM(v.amount), 0) = 0 THEN NULL         ELSE COALESCE(e.total_amount, 0) * (365.0 / SUM(v.amount))     END AS dias_hasta_stock_cero FROM ultima_venta uv JOIN products p ON uv.fk_product = p.id_product   JOIN suppliers s ON p.fk_supplier = s.id_supplier LEFT JOIN sales v ON v.fk_product = uv.fk_product     AND v.date BETWEEN uv.ultima_fecha_venta - INTERVAL '12 months' AND uv.ultima_fecha_venta LEFT JOIN (   SELECT fk_product, SUM(amount) AS total_amount     FROM existence     GROUP BY fk_product ) e ON uv.fk_product = e.fk_product GROUP BY uv.fk_product, p.name, s.name, uv.ultima_fecha_venta, e.total_amount HAVING COALESCE(e.total_amount, 0) * (365.0 / NULLIF(SUM(v.amount), 0)) <> 0 ORDER BY dias_hasta_stock_cero ASC LIMIT 50;");
        return query.rows;
    }
}

module.exports = {ExistenceService}

