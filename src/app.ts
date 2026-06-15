import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { correlationIdMiddleware } from './middleware/correlationId';
import { requestLoggerMiddleware } from './middleware/requestLogger';
import {
  errorHandlerMiddleware,
  notFoundHandler,
} from './middleware/errorHandler';
import routes from './routes';

export function createApp(): express.Application {
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(correlationIdMiddleware);
  app.use(requestLoggerMiddleware);

  const openApiCandidates = [
    path.join(__dirname, 'docs', 'openapi.yaml'),
    path.join(process.cwd(), 'src', 'docs', 'openapi.yaml'),
  ];
  for (const openApiPath of openApiCandidates) {
    try {
      const swaggerDocument = YAML.load(openApiPath);
      app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
      break;
    } catch {
      // try next candidate
    }
  }

  app.use(routes);
  app.use(notFoundHandler);
  app.use(errorHandlerMiddleware);

  return app;
}
