import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'sauraroute_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'sauraroute_dev_2026',
  connectionTimeoutMillis: 1000, // 1 second timeout to prevent blocking HTTP requests
};

export const serverConfig = {
  port: parseInt(process.env.API_PORT || '3000', 10),
};
