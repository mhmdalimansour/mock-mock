#!/usr/bin/env node

// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

import { Command } from "commander";
import { writeFileSync } from "fs";
import { fetchConfluencePage } from "./fetcher/confluence";
import { parseERDFromHTML, validateSchema } from "./parser/erd-parser";
import { startMockServer } from "./server/mock-server";
import packageJson from "../package.json";

const banner = `
  __  __            _    __  __            _    
 |  \\/  | ___   ___| | _|  \\/  | ___   ___| | __
 | |\\/| |/ _ \\ / __| |/ / |\\/| |/ _ \\ / __| |/ /
 | |  | | (_) | (__|   <| |  | | (_) | (__|   < 
 |_|  |_|\\___/ \\___|_|\\_\\_|  |_|\\___/ \\___|_|\\_\\

  Generate mock API servers from Confluence docs
`;

const program = new Command();

program
  .name("mock-mock")
  .description(banner)
  .version(packageJson.version)
  .requiredOption(
    "-u, --url <url>",
    "Confluence page URL containing API definitions"
  )
  .option("-p, --port <port>", "Port for mock server", "4000")
  .option(
    "-f, --fallback <url>",
    "Fallback base URL to proxy requests not found in the ERD"
  )
  .option(
    "--delay <ms>",
    "Response delay in milliseconds to simulate real API latency",
    "0"
  )
  .option(
    "-e, --email <email>",
    "Confluence email (overrides CONFLUENCE_EMAIL env var)"
  )
  .option(
    "-t, --token <token>",
    "Confluence API token (overrides CONFLUENCE_API_TOKEN env var)"
  )
  .option("-d, --debug", "Enable debug mode (saves HTML to debug.html)")
  .action(async (options) => {
    try {
      if (options.email) process.env.CONFLUENCE_EMAIL = options.email;
      if (options.token) process.env.CONFLUENCE_API_TOKEN = options.token;

      const url: string = options.url;
      const port: number = parseInt(options.port, 10);
      const delay: number = parseInt(options.delay, 10);
      const fallbackUrl: string | undefined = options.fallback;

      if (isNaN(port) || port < 1 || port > 65535) {
        console.error("❌ Invalid port number. Must be between 1 and 65535.");
        process.exit(1);
      }

      if (isNaN(delay) || delay < 0) {
        console.error(
          "❌ Invalid delay. Must be a non-negative number in milliseconds."
        );
        process.exit(1);
      }

      console.log("🚀 MockMock CLI\n");
      console.log(`📄 Fetching Confluence page: ${url}`);

      // Step 1: Fetch HTML from Confluence
      const html = await fetchConfluencePage(url);
      console.log("✅ Page fetched successfully\n");

      // Debug mode: save HTML to file
      if (options.debug) {
        writeFileSync("debug.html", html);
        console.log("🐛 Debug: HTML saved to debug.html\n");
      }

      // Step 2: Parse endpoints
      console.log("🔍 Parsing API endpoints...");
      const schema = parseERDFromHTML(html);

      if (options.debug && schema.length > 0) {
        console.log("🐛 Debug: Parsed endpoints:");
        console.log(JSON.stringify(schema, null, 2));
        console.log();
      }

      validateSchema(schema);
      console.log(`✅ Found ${schema.length} endpoint(s)\n`);

      // Step 3: Start mock server
      if (fallbackUrl) {
        console.log(`🔀 Fallback URL: ${fallbackUrl}`);
        console.log("   Unmatched requests will be proxied to this URL\n");
      }
      startMockServer(schema, port, fallbackUrl, delay);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\n❌ Error: ${error.message}\n`);
      } else {
        console.error("\n❌ An unexpected error occurred\n");
      }
      process.exit(1);
    }
  });

program.parse();
