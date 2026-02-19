#!/usr/bin/env node

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { fetchConfluencePage } from './fetcher/confluence';
import { parseERDFromHTML, validateSchema } from './parser/erd-parser';
import { startMockServer } from './server/mock-server';

const program = new Command();

program
  .name('mockgen')
  .description('Generate mock API server from Confluence API documentation')
  .version('1.0.0')
  .requiredOption('-u, --url <url>', 'Confluence page URL containing API definitions')
  .option('-p, --port <port>', 'Port for mock server', '4000')
  .option('-f, --fallback <url>', 'Fallback base URL to proxy requests not found in the ERD')
  .option('-d, --debug', 'Enable debug mode (saves HTML to debug.html)')
  .action(async (options) => {
    try {
      const url: string = options.url;
      const port: number = parseInt(options.port, 10);
      const fallbackUrl: string | undefined = options.fallback;

      if (isNaN(port) || port < 1 || port > 65535) {
        console.error('❌ Invalid port number. Must be between 1 and 65535.');
        process.exit(1);
      }

      console.log('🚀 MockMock CLI\n');
      console.log(`📄 Fetching Confluence page: ${url}`);

      // Step 1: Fetch HTML from Confluence
      const html = await fetchConfluencePage(url);
      console.log('✅ Page fetched successfully\n');

      // Debug mode: save HTML to file
      if (options.debug) {
        writeFileSync('debug.html', html);
        console.log('🐛 Debug: HTML saved to debug.html\n');
      }

      // Step 2: Parse endpoints
      console.log('🔍 Parsing API endpoints...');
      const schema = parseERDFromHTML(html);
      
      if (options.debug && schema.length > 0) {
        console.log('🐛 Debug: Parsed endpoints:');
        console.log(JSON.stringify(schema, null, 2));
        console.log();
      }
      
      validateSchema(schema);
      console.log(`✅ Found ${schema.length} endpoint(s)\n`);

      // Step 3: Start mock server
      if (fallbackUrl) {
        console.log(`🔀 Fallback URL: ${fallbackUrl}`);
        console.log('   Unmatched requests will be proxied to this URL\n');
      }
      startMockServer(schema, port, fallbackUrl);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\n❌ Error: ${error.message}\n`);
      } else {
        console.error('\n❌ An unexpected error occurred\n');
      }
      process.exit(1);
    }
  });

program.parse();
