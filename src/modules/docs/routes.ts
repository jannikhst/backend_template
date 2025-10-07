import { Router, Request, Response } from 'express';
import { generateOpenApiDocument } from './generator';
import { getRedocHtml } from './redoc';

const router = Router();

/**
 * GET /docs - Serve ReDoc documentation UI
 */
router.get('/', (req: Request, res: Response) => {
  const specUrl = `${req.protocol}://${req.get('host')}/v1/docs/openapi.json`;
  res.setHeader('Content-Type', 'text/html');
  res.send(getRedocHtml(specUrl));
});

/**
 * GET /docs/openapi.json - Serve OpenAPI specification as JSON
 */
router.get('/openapi.json', (_req: Request, res: Response) => {
  try {
    const document = generateOpenApiDocument();
    res.setHeader('Content-Type', 'application/json');
    res.json(document);
  } catch (error) {
    res.status(500).json({
      status: 500,
      code: 'OPENAPI_GENERATION_ERROR',
      message: 'Failed to generate OpenAPI document',
      error: error instanceof Error ? error.message : 'Unknown error',
      traceId: res.locals.traceId,
    });
  }
});

/**
 * GET /docs/openapi.yaml - Serve OpenAPI specification as YAML
 */
router.get('/openapi.yaml', (_req: Request, res: Response) => {
  try {
    const document = generateOpenApiDocument();
    const { stringify } = require('yaml');
    res.setHeader('Content-Type', 'text/yaml');
    res.send(stringify(document));
  } catch (error) {
    res.status(500).json({
      status: 500,
      code: 'OPENAPI_GENERATION_ERROR',
      message: 'Failed to generate OpenAPI YAML document',
      error: error instanceof Error ? error.message : 'Unknown error',
      traceId: res.locals.traceId,
    });
  }
});

export default router;
