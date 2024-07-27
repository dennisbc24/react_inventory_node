require("dotenv").config();

const config = {
  dbUser: process.env.DB_USER,
  dbPassword: process.env.DB_PASSWORD,
  dbName: process.env.DB_NAME,
  dbHost: process.env.DB_HOST,
  jwtSecret: process.env.JWT_SECRET,

  //aws
  awsRegion: process.env.AWS_REGION,
  awsId: process.env.AWS_ACCESS_KEY,
  awsClave: process.env.AWS_SECRET_KEY,
  awsName: process.env.AWS_BUCKET_NAME,

  //cloudinary

cloudName: process.env.CLOUDINARY_CLOUD_NAME,
cloudKey: process.env.CLOUDINARY_API_KEY,
cloudSecret: process.env.CLOUDINARY_API_SECRET,
};

module.exports = { config };
