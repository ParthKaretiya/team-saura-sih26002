import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const routingConfig = {
  graphHopperUrl: process.env.GRAPHHOPPER_URL || 'http://localhost:8989',
  graphHopperTimeoutMs: parseInt(process.env.GRAPHHOPPER_TIMEOUT_MS || '5000', 10),
  profile: process.env.GRAPHHOPPER_PROFILE || 'car',
};
