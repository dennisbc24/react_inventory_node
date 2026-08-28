// Carga .env.development (SSM 127.0.0.1:5433) o .env.production (EC2/RDS) según NODE_ENV
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
require("dotenv").config({ path: envFile });
require("dotenv").config(); // fallback a .env si no existe envFile

const isDev = process.env.NODE_ENV !== "production";

const config = {
  dbUser: process.env.DB_USER,
  dbPassword: process.env.DB_PASSWORD,
  dbName: process.env.DB_NAME,
  // dev: usa tunnel SSM 127.0.0.1:5433 | prod: host real EC2/RDS
  dbHost: isDev ? (process.env.DB_HOST || "127.0.0.1") : process.env.DB_HOST,
  dbPort: isDev ? parseInt(process.env.DB_PORT || "5433", 10) : parseInt(process.env.DB_PORT || "5432", 10),
  jwtSecret: process.env.JWT_SECRET,

  //aws
  awsRegion: process.env.AWS_REGION,
  awsId: process.env.AWS_ACCESS_KEY,
  awsClave: process.env.AWS_SECRET_KEY,
  awsName: process.env.AWS_BUCKET_NAME,


};

module.exports = { config };
