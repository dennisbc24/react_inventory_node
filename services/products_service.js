const { Pool } = require("pg");
const config = require("../config/config");
const moment = require("moment-timezone");
const {uploadFile} = require("../helpers/aws")

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

class ProductsService {
    constructor(){
        }
    async create(req){
        const { name, cost, fk_supplier, lowest_price, list_price} = req.body;
        const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
      
        try {
                const response = await pool.query('INSERT INTO products (name, cost, created, lowest_price, list_price,fk_supplier) VALUES($1, $2, $3, $4, $5, $6 ) RETURNING id_product', [name, cost, fechaActual.toDate(), lowest_price, list_price,fk_supplier]);
                const newProductId = response.rows[0].id_product;
                //const response2 = await pool.query('INSERT INTO existence (amount, fk_branch, fk_product, fk_user, created, updated) VALUES ($1, $2, $3, $4, $5, $6)', [amount, fk_branch, newProductId, fk_user,fechaActual.toDate(),fechaActual.toDate()]);
                return `Product ${newProductId} created successfully`
              
        } catch (error) {
            console.log(error);
            return error
        }
        
    }
    async get(){
        try {
            const response = await pool.query(
                "SELECT * FROM products ORDER BY name ASC"
              );
             
              return response.rows
        } catch (error) {
            console.log(error);
            return error
        }
    }
    async getById(req){
        try {
            const id = req.params.id
            const response = await pool.query("SELECT * FROM products WHERE id_product = $1", [id] )
            return response.rows
        } catch (error) {
            console.log(error);
            return error
        }
    }
    async delete(req){
        try {
            const id = req.params.id
            console.log(response);
            const response = await pool.query("DELETE FROM products WHERE id_product = $1", [id] )
            return `Product: ${id} deleted successfully`
        } catch (error) {
            console.log(error);
            return error
        }
    }
    async update(req){
        console.log(req);
        
        console.log(req.params.id);
        
        const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
       let nameFile2 = '' 
let nameFile = req.body.name.replaceAll(' ','' )
        if (req.files && req.files.photo) {
            try {
                switch (true) {
                    case req.files.photo.name.endsWith('.png'):
                      nameFile2 = `${nameFile}.png`
                      break;
                      case req.files.photo.name.endsWith('.jpg'):
                      nameFile2 = `${nameFile}.jpg`
                      break;
                      case req.files.photo.name.endsWith('.jpeg'):
                      nameFile2 = `${nameFile}.jpeg`
                      break;
                    default:
                      nameFile2 = `${nameFile}.jpg`
                      break;
                  }  
                  let nameFile3 = `products/image-${nameFile2}` 
                  let urlImage = `https://caja-for-many-products-dennis.s3.sa-east-1.amazonaws.com/${nameFile3}`
               
                      const uploadFileRequest = await uploadFile(req.files.photo, nameFile2)
                     
                      const { name, cost, sugested_price, wholesale_price } = req.body;
                const id = req.params.id        
                const response = await pool.query("UPDATE products SET name = $1, cost = $2, lowest_price = $3, list_price = $4, updated = $5, url_image = $6  WHERE id_product = $7 ", [name, cost, wholesale_price, sugested_price,fechaActual.toDate(),urlImage ,id] )
              return `Product: ${id} updated successfully`
            } catch (error) {
                console.log(error);
                return error
                
            }
            
            }else{
             nameFile2 = '' 
             const { name, cost, sugested_price, wholesale_price } = req.body;
                const id = req.params.id        
                const response = await pool.query("UPDATE products SET name = $1, cost = $2, lowest_price = $3, list_price = $4, updated = $5  WHERE id_product = $6 ", [name, cost, wholesale_price, sugested_price,fechaActual.toDate() ,id] )
              return `Product: ${id} updated successfully`
        }

            
            
    
        // if (req.files && req.files.photo) {
        //     try {
                
        //     } catch (error) {
        //         console.log(error);
        //         return error
        //     }
        // }else{
        //     try {
                
        //     } catch (error) {
                
        //     }
        // }
        
    }
    async getLatestUpdates(){
        try {
            const response = await pool.query("SELECT * FROM public.products ORDER BY id_product DESC LIMIT 7");
            return  response.rows
        } catch (error) {
            console.log(error);
            return error
        }
    }

    async uploadImageService(req){
        try {
            
            
          //  await uploadFile(req)
            /* const response = await uploadImage(req)
            return response */
            console.log('imagen subida con exito');
        } catch (error) {
            console.log(error);
        }
    }
}
 
module.exports = {ProductsService}

    
 
  

  