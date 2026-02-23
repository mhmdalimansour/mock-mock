import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import axios from 'axios';
import readline from 'readline';
import { MockSchema, MockEndpoint } from '../parser/schema-types';
import { generateFakeData } from './data-generator';

let responseDelay = 0;

function convertPathParams(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ':$1');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function startMockServer(schema: MockSchema, port: number, fallbackUrl?: string, delay: number = 0): void {
  responseDelay = delay;

  const app: Application = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  console.log('\n📡 Registering endpoints:\n');
  
  for (const endpoint of schema) {
    registerEndpoint(app, endpoint);
    const expressPath = convertPathParams(endpoint.path);
    console.log(`   ${endpoint.method.padEnd(6)} ${expressPath}`);
  }

  app.get('/health', (_req: Request, res: Response) => {
    const endpointList = schema.map(ep => {
      const expressPath = convertPathParams(ep.path);
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
      fallbackUrl: fallbackUrl || null,
      delay: `${responseDelay}ms`,
      endpoints: endpointList
    });
  });

  app.get('/_config/delay', (_req: Request, res: Response) => {
    res.json({ delay: responseDelay });
  });

  app.put('/_config/delay', (req: Request, res: Response) => {
    const { delay: newDelay } = req.body;
    if (typeof newDelay !== 'number' || newDelay < 0) {
      res.status(400).json({ error: 'delay must be a non-negative number (ms)' });
      return;
    }
    responseDelay = newDelay;
    console.log(`⏱️  Response delay updated to ${responseDelay}ms`);
    res.json({ delay: responseDelay });
  });

  // Fallback proxy / 404 handler
  app.use(async (req: Request, res: Response) => {
    if (fallbackUrl) {
      const baseUrl = fallbackUrl.replace(/\/+$/, '');
      const targetUrl = `${baseUrl}${req.originalUrl}`;

      try {
        console.log(`⤵️  Proxying to fallback: ${req.method} ${targetUrl}`);

        const proxyResponse = await axios({
          method: req.method as any,
          url: targetUrl,
          headers: {
            ...req.headers,
            host: new URL(baseUrl).host,
          },
          data: ['GET', 'HEAD'].includes(req.method.toUpperCase()) ? undefined : req.body,
          params: req.query,
          validateStatus: () => true,
          responseType: 'arraybuffer',
        });

        res.status(proxyResponse.status);

        const skipHeaders = new Set(['transfer-encoding', 'connection', 'keep-alive']);
        for (const [key, value] of Object.entries(proxyResponse.headers)) {
          if (value && !skipHeaders.has(key.toLowerCase())) {
            res.setHeader(key, value as string);
          }
        }

        res.send(Buffer.from(proxyResponse.data));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Fallback proxy error: ${message}`);
        res.status(502).json({
          error: 'Fallback server unavailable',
          target: targetUrl,
          details: message,
        });
      }
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  });

  const server = app.listen(port, () => {
    console.log('\n✅ Mock server started successfully!\n');
    console.log(`🌐 Base URL: http://localhost:${port}`);
    console.log(`📊 Total endpoints: ${schema.length}`);
    console.log(`⏱️  Response delay: ${responseDelay}ms`);
    if (fallbackUrl) {
      console.log(`🔀 Fallback: ${fallbackUrl}`);
    }
    console.log(`💚 Health check: http://localhost:${port}/health\n`);
    console.log('Type "delay <ms>" to change response delay (e.g. "delay 500")');
    console.log('Press Ctrl+C to stop the server\n');

    setupStdinDelayControl();
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

  const expressPath = convertPathParams(path);

  const handler = async (_req: Request, res: Response) => {
    if (responseDelay > 0) {
      await sleep(responseDelay);
    }
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

function setupStdinDelayControl(): void {
  const rl = readline.createInterface({ input: process.stdin });

  rl.on('line', (line: string) => {
    const trimmed = line.trim().toLowerCase();
    const match = trimmed.match(/^delay\s+(\d+)$/);
    if (match) {
      responseDelay = parseInt(match[1], 10);
      console.log(`⏱️  Response delay updated to ${responseDelay}ms`);
    } else if (trimmed === 'delay') {
      console.log(`⏱️  Current response delay: ${responseDelay}ms`);
    } else {
      console.log('Unknown command. Use "delay <ms>" to set delay or "delay" to check current value.');
    }
  });
}
