const cloudinary = require('cloudinary').v2;

const { config } = require('../config/config');


const cloudi_name = config.cloudName
const cloudi_key = config.cloudKey;
const cloudi_secret = config.cloudSecret;

async function uploadImage(path) {
    // Configuration
    cloudinary.config({ 
        cloud_name: cloudi_name, 
        api_key: cloudi_key, 
        api_secret: cloudi_secret
    });

    // Upload an image
    const uploadResult = await cloudinary.uploader
    .upload(path, {
            public_id: 'shoes',
        }
    )
    .catch((error) => {
        console.log(error);
    });
 
    console.log(uploadResult);
}


/* (async function() {

    // Configuration
    cloudinary.config({ 
        cloud_name: cloudi_name, 
        api_key: cloudi_key, 
        api_secret: cloudi_secret
    });
    
    // Upload an image
     const uploadResult = await cloudinary.uploader
       .upload(
           'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
               public_id: 'shoes',
           }
       )
       .catch((error) => {
           console.log(error);
       });
    
    console.log(uploadResult);
    
    // Optimize delivery by resizing and applying auto-format and auto-quality
    const optimizeUrl = cloudinary.url('shoes', {
        fetch_format: 'auto',
        quality: 'auto'
    });
    
    console.log(optimizeUrl);
    
    // Transform the image: auto-crop to square aspect_ratio
    const autoCropUrl = cloudinary.url('shoes', {
        crop: 'auto',
        gravity: 'auto',
        width: 500,
        height: 500,
    });
    
    console.log(autoCropUrl);    
})(); */

module.exports = {uploadImage}