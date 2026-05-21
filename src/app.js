import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import { corsOrigins } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openApiDocument = YAML.load(path.join(__dirname, '..', 'openapi.yaml'));

export const app = express();

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS origin is not allowed.'));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'leanstock-api' });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use('/api/v1', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
