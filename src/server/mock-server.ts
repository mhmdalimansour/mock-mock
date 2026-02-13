import express, { Request, Response, Application } from 'express';
import { MockSchema, MockEndpoint } from '../parser/schema-types';
import { generateFakeData } from './data-generator';

/**
 * Converts path parameters from {param} format to Express :param format
 */
function convertPathParams(path: string): string {
  // Convert {paramName} to :paramName for Express routing
  return path.replace(/\{([^}]+)\}/g, ':$1');
}

/**
 * Starts an Express mock server with dynamically registered endpoints
 */
export function startMockServer(schema: MockSchema, port: number): void {
  const app: Application = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Register endpoints dynamically
  console.log('\n📡 Registering endpoints:\n');
  
  for (const endpoint of schema) {
    registerEndpoint(app, endpoint);
    const expressPath = convertPathParams(endpoint.path);
    console.log(`   ${endpoint.method.padEnd(6)} ${expressPath}`);
  }

  // Health check endpoint - lists all available endpoints
  app.get('/health', (_req: Request, res: Response) => {
    const endpointList = schema.map(ep => {
      const expressPath = convertPathParams(ep.path);
      // Create example URL with actual values for path params
      const examplePath = expressPath.replace(/:([^/]+)/g, (_, param) => `{${param}}`);
      
      return {
        method: ep.method,
        path: expressPath,
        example: `http://localhost:${port}${examplePath}`,
        description: `Replace {paramName} with actual values`
      };
    });

    res.json({
      status: 'ok',
      server: 'MockMock',
      totalEndpoints: schema.length,
      baseUrl: `http://localhost:${port}`,
      endpoints: endpointList
    });
  });

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Start server
  const server = app.listen(port, () => {
    console.log('\n✅ Mock server started successfully!\n');
    console.log(`🌐 Base URL: http://localhost:${port}`);
    console.log(`📊 Total endpoints: ${schema.length}`);
    console.log(`💚 Health check: http://localhost:${port}/health\n`);
    console.log('Press Ctrl+C to stop the server\n');
  });

  // Graceful shutdown on Ctrl+C (SIGINT) or SIGTERM
  const shutdown = () => {
    console.log('\n\n🛑 Shutting down mock server...');
    server.close(() => {
      console.log('✅ Server stopped gracefully\n');
      process.exit(0);
    });

    // Force close after 5 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

/**
 * Registers a single endpoint with Express
 */
function registerEndpoint(app: Application, endpoint: MockEndpoint): void {
  const { method, path, response, status = 200 } = endpoint;

  // Convert path parameters to Express format
  const expressPath = convertPathParams(path);

  const handler = (_req: Request, res: Response) => {
    // Generate fake data based on the response template
    const fakeData = generateFakeData(response);
    res.status(status).json(fakeData);
  };

  switch (method) {
    case 'GET':
      app.get(expressPath, handler);
      break;
    case 'POST':
      app.post(expressPath, handler);
      break;
    case 'PUT':
      app.put(expressPath, handler);
      break;
    case 'PATCH':
      app.patch(expressPath, handler);
      break;
    case 'DELETE':
      app.delete(expressPath, handler);
      break;
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
}
