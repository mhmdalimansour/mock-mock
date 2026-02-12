# MockMock

> Production-grade CLI tool to generate mock API servers from Confluence documentation

MockMock fetches API endpoint definitions from Confluence pages, parses them into a structured schema, and spins up an Express mock server with those endpoints.

## Features

- 🚀 **Fast Setup**: Generate a mock server in seconds
- 📄 **Confluence Integration**: Fetches API definitions directly from Confluence pages
- 🔒 **Auth Support**: Optional Basic Auth for private Confluence pages
- 🎯 **Type-Safe**: Built with TypeScript for reliability
- 🧩 **Modular Architecture**: Clean separation of concerns
- 🌐 **Express-Powered**: Reliable and extensible mock server

## Installation

```bash
npm install
npm run build
```

## Usage

### Basic Usage

```bash
npm run dev -- --url https://your-confluence.com/pages/123456 --port 4000
```

Or using the built CLI:

```bash
mockgen --url <confluence-url> --port 4000
```

### Options

- `--url, -u` **(required)**: Confluence page URL containing API definitions
- `--port, -p` (optional): Port for the mock server (default: 4000)

### Authentication

For private Confluence pages, set these environment variables:

```bash
export CONFLUENCE_EMAIL=your-email@example.com
export CONFLUENCE_API_TOKEN=your-api-token
```

Then run the CLI as normal.

## API Definition Format

MockMock expects code blocks in your Confluence page with this format:

```
POST /api/categories

Request:
{
  "name": "string"
}

Response:
{
  "id": 1,
  "name": "string"
}
```

### Supported Fields

- **HTTP Method**: GET, POST, PUT, DELETE
- **Path**: The endpoint path (e.g., `/api/users`)
- **Request** (optional): JSON body schema
- **Response** (required): JSON response body
- **Status** (optional): HTTP status code (default: 200)

### Example

```
GET /api/users

Response:
{
  "users": [
    {
      "id": 1,
      "name": "John Doe"
    }
  ]
}
```

```
POST /api/users

Request:
{
  "name": "string",
  "email": "string"
}

Response:
{
  "id": 1,
  "name": "string",
  "email": "string"
}

Status: 201
```

## Architecture

```
mock-mock/
  src/
    cli.ts              # CLI entry point
    fetcher/
      confluence.ts     # Confluence page fetcher
    parser/
      erd-parser.ts     # Endpoint parser
      schema-types.ts   # Schema definitions
    server/
      mock-server.ts    # Express mock server
  package.json
  tsconfig.json
```

### Layer Independence

Each layer is independent and communicates through the `MockSchema` interface:

1. **Fetcher**: Retrieves raw HTML from Confluence
2. **Parser**: Extracts and normalizes endpoints into `MockSchema`
3. **Server**: Consumes `MockSchema` and creates Express routes

## Development

### Run in Development Mode

```bash
npm run dev -- --url <confluence-url>
```

### Build

```bash
npm run build
```

### Run Built Version

```bash
npm start -- --url <confluence-url>
```

## Error Handling

MockMock gracefully handles:

- ❌ Invalid Confluence URLs
- ❌ Network errors
- ❌ Malformed JSON in code blocks
- ❌ Missing endpoints
- ❌ Invalid port numbers

## Example Output

```
🚀 MockMock CLI

📄 Fetching Confluence page: https://confluence.example.com/123456
✅ Page fetched successfully

🔍 Parsing API endpoints...
✅ Found 3 endpoint(s)

📡 Registering endpoints:

   GET    /api/users
   POST   /api/users
   DELETE /api/users/1

✅ Mock server started successfully!

🌐 Base URL: http://localhost:4000
📊 Total endpoints: 3
💚 Health check: http://localhost:4000/health
```

## License

MIT
