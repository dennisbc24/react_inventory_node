const cloudinary = require('cloudinary').v2;


const { config } = require('../config/config');


const cloudi_name = config.cloudName
const cloudi_key = config.cloudKey;
const cloudi_secret = config.cloudSecret;


// Configuration
cloudinary.config({ 
    cloud_name: cloudi_name, 
    api_key: cloudi_key, 
    api_secret: cloudi_secret
}); 


async function uploadFile(file) {{
    const b64 = Buffer.from(file.fileBuffer).toString('base64');
    const dataURI = `data:${file.mimetype};base64,${b64}`;
    const res = await cloudinary.uploader.upload(dataURI, {
      resource_type: 'auto',
    });
    return res;
  }
  }


module.exports = {uploadFile}