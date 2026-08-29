import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root (two levels up from services/api/)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'sauraroute_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'sauraroute_dev_2026',
};

export const serverConfig = {
  port: parseInt(process.env.API_PORT || '3000', 10),
};
