const { pool } = require("../config/db");
const moment = require("moment-timezone");
const {uploadFile} = require("../helpers/aws")

class ProductsService {
    constructor(){
        }
    async create(req){
        const { name, cost, fk_supplier, lowest_price, list_price, fk_category} = req.body;
        console.log(req.body);
        
        const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
      console.log(name, cost, fk_supplier, lowest_price, list_price, fk_category);
      
        try {
                const response = await pool.query('INSERT INTO products (name, cost, created, lowest_price, list_price,fk_supplier,fk_category) VALUES($1, $2, $3, $4, $5, $6, $7 ) RETURNING id_product', [name, cost, fechaActual.toDate(), lowest_price, list_price,fk_supplier, fk_category || null]);
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
                "SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.fk_category=c.id_category ORDER BY p.name ASC"
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
            const response = await pool.query("DELETE FROM products WHERE id_product = $1", [id] )
            return `Product: ${id} deleted successfully`
        } catch (error) {
            console.log(error);
            return error
        }
    }
    async update(req){
        const id_product = req.params.id
        
        const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
       let nameFile2 = '' 
let nameFile = req.body.name.replaceAll(' ','' )
        if (req.files && req.files.photo) {
            try {
                switch (true) {
                    case req.files.photo.name.endsWith('.png'):
                      nameFile2 = `${id_product}.png`
                      break;
                      case req.files.photo.name.endsWith('.jpg'):
                      nameFile2 = `${id_product}.jpg`
                      break;
                      case req.files.photo.name.endsWith('.jpeg'):
                      nameFile2 = `${id_product}.jpeg`
                      break;
                    default:
                      nameFile2 = `${id_product}.jpg`
                      break;
                  }  
                  let nameFile3 = `products/image-${nameFile2}` 
                  let urlImage = `https://caja-for-many-products-dennis.s3.sa-east-1.amazonaws.com/${nameFile3}`
               
                      const uploadFileRequest = await uploadFile(req.files.photo, nameFile2)
                     
                      const { name, cost, sugested_price, wholesale_price, fk_category } = req.body;
                const id = req.params.id        
                const response = await pool.query("UPDATE products SET name = $1, cost = $2, lowest_price = $3, list_price = $4, updated = $5, url_image = $6, fk_category=$7  WHERE id_product = $8 ", [name, cost, wholesale_price, sugested_price,fechaActual.toDate(),urlImage ,fk_category||null ,id] )
              return `Product: ${id} updated successfully`
            } catch (error) {
                console.log(error);
                return error
                
            }
            
            }else{
             nameFile2 = '' 
             const { name, cost, sugested_price, wholesale_price, fk_category } = req.body;
                const id = req.params.id   
                console.log(name, cost, sugested_price, wholesale_price, fk_category);
                     
                const response = await pool.query("UPDATE products SET name = $1, cost = $2, lowest_price = $3, list_price = $4, updated = $5, fk_category=$6  WHERE id_product = $7 ", [name, cost, wholesale_price, sugested_price,fechaActual.toDate() ,fk_category||null ,id] )
              return `Product: ${id} updated successfully`
        }        
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


  