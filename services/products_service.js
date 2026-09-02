const { pool } = require("../config/db");
const moment = require("moment-timezone");
const {uploadFile} = require("../helpers/aws")

class ProductsService {
    constructor(){
        }
    parseAttributes(raw){
        if (raw === undefined || raw === '' || raw === null) return null;
        try {
            const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) throw new Error();
            return obj;
        } catch { throw Object.assign(new Error('attributes debe ser JSON objeto {clave:valor}'), {status:400}); }
    }
    async create(req){
        // compat: frontend puede enviar unit/total en lugar de list_price/lowest_price
        let { name, cost, fk_supplier, lowest_price, list_price, fk_category, is_online, attributes} = req.body;
        if (req.body.unit !== undefined && (list_price === undefined || list_price === '')) list_price = req.body.unit;
        if (req.body.total !== undefined && (lowest_price === undefined || lowest_price === '')) lowest_price = req.body.total;
        // normaliza fk_category: '' -> null, valida número
        if (fk_category === '' || fk_category === 'null') fk_category = null;
        if (fk_category != null) {
          const fk = Number(fk_category);
          if (Number.isNaN(fk)) throw Object.assign(new Error('fk_category inválido'), { status: 400 });
          const exists = await pool.query('SELECT 1 FROM categories WHERE id_category=$1', [fk]);
          if (exists.rowCount === 0) throw Object.assign(new Error('Categoría no existe'), { status: 400 });
          fk_category = fk;
        }
        console.log(req.body);
        
        const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
      console.log(name, cost, fk_supplier, lowest_price, list_price, fk_category);
      
        try {
                const isOnline = is_online === 'true' || is_online === true || is_online === '1' || is_online === 1 ? true : is_online === 'false' || is_online === false || is_online === '0' ? false : false;
                const attrs = this.parseAttributes(attributes);
                const response = await pool.query('INSERT INTO products (name, cost, created, lowest_price, list_price,fk_supplier,fk_category, is_online, attributes) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9 ) RETURNING id_product', [name, cost, fechaActual.toDate(), lowest_price || null, list_price || null,fk_supplier || null, fk_category || null, isOnline, attrs ? JSON.stringify(attrs) : '{}']);
                const newProductId = response.rows[0].id_product;
                // si viene foto, súbela igual que en actualizar (S3 products/image-{id}.ext)
                if (req.files && req.files.photo) {
                    let nameFile2 = '';
                    switch (true) {
                        case req.files.photo.name.endsWith('.png'): nameFile2 = `${newProductId}.png`; break;
                        case req.files.photo.name.endsWith('.jpg'): nameFile2 = `${newProductId}.jpg`; break;
                        case req.files.photo.name.endsWith('.jpeg'): nameFile2 = `${newProductId}.jpeg`; break;
                        default: nameFile2 = `${newProductId}.jpg`; break;
                    }
                    const nameFile3 = `products/image-${nameFile2}`;
                    const urlImage = `https://caja-for-many-products-dennis.s3.sa-east-1.amazonaws.com/${nameFile3}`;
                    await uploadFile(req.files.photo, nameFile2);
                    await pool.query('UPDATE products SET url_image=$1 WHERE id_product=$2', [urlImage, newProductId]);
                }
                return `Product ${newProductId} created successfully`
              
        } catch (error) {
            console.log(error);
            throw error
        }
        
    }
     async get(){
        try {
            const response = await pool.query(
                "SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p LEFT JOIN categories c ON p.fk_category=c.id_category ORDER BY p.name ASC"
              );
              
              return response.rows
        } catch (error) {
            console.log(error);
            throw error
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
                     
                       let { name, cost, sugested_price, wholesale_price, fk_category, is_online, attributes } = req.body;
                // normaliza/ valida fk_category
                if (fk_category === '' || fk_category === 'null') fk_category = null;
                if (fk_category != null) {
                  const fk = Number(fk_category);
                  if (Number.isNaN(fk)) throw Object.assign(new Error('fk_category inválido'), { status: 400 });
                  const exists = await pool.query('SELECT 1 FROM categories WHERE id_category=$1', [fk]);
                  if (exists.rowCount === 0) throw Object.assign(new Error('Categoría no existe'), { status: 400 });
                  fk_category = fk;
                }
                let isOnline = undefined;
                if (is_online !== undefined) isOnline = is_online === 'true' || is_online === true || is_online === '1' || is_online === 1;
                const attrs = this.parseAttributes(attributes);
                const id = req.params.id
                if (isOnline !== undefined) {
                  const response = await pool.query("UPDATE products SET name = $1, cost = $2, lowest_price = $3, list_price = $4, updated = $5, url_image = $6, fk_category=$7, is_online=$8  WHERE id_product = $9 ", [name, cost, wholesale_price || null, sugested_price || null,fechaActual.toDate(),urlImage ,fk_category||null ,isOnline ,id] )
                } else {
                  const response = await pool.query("UPDATE products SET name = $1, cost = $2, lowest_price = $3, list_price = $4, updated = $5, url_image = $6, fk_category=$7  WHERE id_product = $8 ", [name, cost, wholesale_price || null, sugested_price || null,fechaActual.toDate(),urlImage ,fk_category||null ,id] )
                }
                if (attrs !== null) await pool.query("UPDATE products SET attributes=$1 WHERE id_product=$2", [JSON.stringify(attrs), id]);
              return `Product: ${id} updated successfully`
            } catch (error) {
                console.log(error);
                throw error
                
            }
            
            }else{
             nameFile2 = '' 
             let { name, cost, sugested_price, wholesale_price, fk_category, is_online, attributes } = req.body;
                if (fk_category === '' || fk_category === 'null') fk_category = null;
                if (fk_category != null) {
                  const fk = Number(fk_category);
                  if (Number.isNaN(fk)) throw Object.assign(new Error('fk_category inválido'), { status: 400 });
                  const exists = await pool.query('SELECT 1 FROM categories WHERE id_category=$1', [fk]);
                  if (exists.rowCount === 0) throw Object.assign(new Error('Categoría no existe'), { status: 400 });
                  fk_category = fk;
                }
                let isOnline2 = undefined;
                if (is_online !== undefined) isOnline2 = is_online === 'true' || is_online === true || is_online === '1' || is_online === 1;
                const attrs2 = this.parseAttributes(attributes);
                const id = req.params.id   
                console.log(name, cost, sugested_price, wholesale_price, fk_category, is_online);
                if (isOnline2 !== undefined) {
                  const response = await pool.query("UPDATE products SET name = $1, cost = $2, lowest_price = $3, list_price = $4, updated = $5, fk_category=$6, is_online=$7  WHERE id_product = $8 ", [name, cost, wholesale_price || null, sugested_price || null,fechaActual.toDate() ,fk_category||null ,isOnline2 ,id] )
                } else {
                  const response = await pool.query("UPDATE products SET name = $1, cost = $2, lowest_price = $3, list_price = $4, updated = $5, fk_category=$6  WHERE id_product = $7 ", [name, cost, wholesale_price || null, sugested_price || null,fechaActual.toDate() ,fk_category||null ,id] )
                }
                if (attrs2 !== null) await pool.query("UPDATE products SET attributes=$1 WHERE id_product=$2", [JSON.stringify(attrs2), id]);
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


  