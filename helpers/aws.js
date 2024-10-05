const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const  fs  = require('fs')
const { config } = require('../config/config');


const region1 = config.awsRegion;
const accesKeyId1 = config.awsId;
const secretAccessKey1 = config.awsClave;
const bucketName = config.awsName;

const clientS3 = new S3Client({
    region: region1,
    credentials:{
        accessKeyId: accesKeyId1,
        secretAccessKey: secretAccessKey1
    }
})

//subir archivo
async function uploadFile(file, name){
    console.log('21',name);
    console.log('22 file.path: ',file.tempFilePath);
    const stream = fs.createReadStream(file.tempFilePath)
   console.log('24 name from aws helper: ', name);
   console.log(name);
   
   
    const uploadParams = {
        Bucket: bucketName,
        Key: name,
        Body: stream
    }

    const command = new PutObjectCommand(uploadParams)
    const result = await clientS3.send(command)    
    console.log('file uploaded successfully');
    return result
    
 // Eliminar el archivo del servidor
 fs.unlink(file.tempFilePath, (unlinkErr) => {
    if (unlinkErr) {
      console.error('Error al eliminar el archivo:', unlinkErr);
      return res.status(500).send('Archivo subido pero no se pudo eliminar del servidor.');
    }
console.log('file in backend removed');

})}

//eliminar archivo

async function deleteFile(nameObject){
  console.log('iniciando funcion delete');
  const deleteParams = {
      Bucket: bucketName,
      Key: nameObject,
  }
  console.log('iniciando funcion delete');
  const commandDelete = new DeleteObjectCommand(deleteParams)
  console.log('comando creado');
  const result = await clientS3.send(commandDelete)
  console.log("comando enviado");
}

//obtener un solo archivo
async function getFile(fileName){
    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileName,
    })
    return await clientS3.send(command)

}

module.exports = {
  //  getBuckets,
    //uploadToBucket,
    uploadFile,    getFile,    deleteFile }
