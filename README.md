# MockMock

MockMock is a TypeScript CLI that turns Confluence API documentation into a running mock API server.

It fetches a Confluence page or local HTML export, parses endpoint definitions into a normalized schema, and starts an Express server that returns generated yet stateful mock responses. It is useful when frontend or integration work needs a realistic API before the real backend is ready.

## What This Project Does

- Reads API definitions from Confluence pages or exported HTML files
- Extracts endpoints from both table-based ERD pages and code blocks
- Starts an Express server with dynamically registered routes
- Generates realistic response data with `@faker-js/faker`
- Keeps data in memory so `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` behave like a lightweight API
- Optionally proxies unmatched requests to a fallback server
- Lets you simulate latency with startup flags, runtime endpoints, or stdin commands

## How It Works

MockMock has four main steps:

1. The CLI in `src/cli.ts` reads command-line options and environment variables.
2. The fetcher in `src/fetcher/confluence.ts` loads HTML from:
   - a `file://` path
   - a public Confluence page
   - an authenticated Atlassian Confluence page via REST API
3. The parser in `src/parser/erd-parser.ts` converts the HTML into a `MockSchema`.
4. The server in `src/server/mock-server.ts` registers routes and serves responses backed by the in-memory `DataStore`.

### Runtime Behavior

- `GET` list endpoints return a generated collection if the response template contains an array.
- `GET` item endpoints return one stored record when a matching item exists.
- `POST` creates a new in-memory record.
- `PUT` and `PATCH` update an existing record by id.
- `DELETE` removes an existing record and returns `204`.
- If no stored collection exists for an endpoint, MockMock falls back to generating data from the response template on demand.

## Architecture

```text
mock-mock/
├── src/
│   ├── cli.ts
│   ├── fetcher/
│   │   └── confluence.ts
│   ├── parser/
│   │   ├── erd-parser.ts
│   │   └── schema-types.ts
│   └── server/
│       ├── data-generator.ts
│       ├── data-store.ts
│       └── mock-server.ts
├── example-confluence.html
├── package.json
└── tsconfig.json
```

### Core Modules

- `src/cli.ts`: entrypoint, option parsing, orchestration
- `src/fetcher/confluence.ts`: Confluence and local-file fetching
- `src/parser/erd-parser.ts`: HTML parsing and endpoint extraction
- `src/parser/schema-types.ts`: shared contract between parser and server
- `src/server/data-generator.ts`: fake response generation
- `src/server/data-store.ts`: in-memory collections and CRUD-like behavior
- `src/server/mock-server.ts`: Express app, route registration, fallback proxy, health/config endpoints

## Installation

### Install From npm

```bash
npm install -g @mhmdalimansour/mock-mock
```

This installs the package published on npm as `@mhmdalimansour/mock-mock` and exposes the CLI command `mock-mock`.

### Local Development

```bash
npm install
```

### Build the CLI

```bash
npm run build
```

### Global Usage

After installing globally, the CLI command is:

```bash
mock-mock --url <confluence-url>
```

## Quick Start

### 1. Run Against the Example HTML

```bash
npm run dev -- --url file://C:/absolute/path/to/example-confluence.html --port 4000
```

On macOS or Linux:

```bash
npm run dev -- --url file:///absolute/path/to/example-confluence.html --port 4000
```

### 2. Run Against a Confluence Page

```bash
npm run dev -- --url https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456/Page+Title --port 4000
```

### 3. Test the Server

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/users
curl -X POST http://localhost:4000/api/users -H "Content-Type: application/json" -d "{\"name\":\"John\"}"
```

## CLI Usage

### Development Mode

```bash
npm run dev -- --url <url>
```

### Run the Built CLI

```bash
npm start -- --url <url>
```

### CLI Options

| Option | Description | Default |
| --- | --- | --- |
| `-u, --url <url>` | Confluence page URL or `file://` HTML path | required |
| `-p, --port <port>` | Port for the mock server | `4000` |
| `-f, --fallback <url>` | Base URL used for truncated-response hydration during parsing and as a proxy target for unmatched runtime requests | none |
| `--delay <ms>` | Response delay in milliseconds | `0` |
| `-e, --email <email>` | Confluence email, overrides env var | none |
| `-t, --token <token>` | Confluence API token, overrides env var | none |
| `-d, --debug` | Save fetched HTML to `debug.html` and print parsed schema | `false` |

### Example Commands

```bash
npm run dev -- --url file:///tmp/exported-page.html --port 4000
npm run dev -- --url https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456/Page+Title --delay 500
npm run dev -- --url https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456/Page+Title --fallback https://api.dev.example.com
```

## Authentication

Private Confluence pages usually require credentials.

Create a `.env` file or export the following variables:

```bash
CONFLUENCE_EMAIL=your-email@example.com
CONFLUENCE_API_TOKEN=your-api-token
```

You can also pass them directly:

```bash
npm run dev -- --url <url> --email your-email@example.com --token your-api-token
```

### Fetching Rules

- `file://...` reads a local HTML file
- Atlassian Cloud URLs with credentials use the Confluence REST API
- Other URLs are fetched as raw HTML
- If Confluence returns a login page instead of the document, MockMock exits with an authentication error

For more setup details, see `AUTH_SETUP.md`.

## Supported Input Formats

MockMock currently supports two Confluence patterns:

- table-based endpoint documentation
- code blocks containing endpoint definitions

### Code Block Format

```text
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

Status: 201
```

### Supported Methods

- Table-based parsing supports `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`.
- Plain code-block parsing currently recognizes `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`.
- The server runtime supports `PATCH` once an endpoint is present in the parsed schema.

### Notes About Response Templates

- Response objects are used as templates for fake data generation.
- Response arrays are expanded into collections with about 15 to 30 records.
- Wrapped collections such as `{ "errors": false, "data": [...] }` are preserved.
- If a table-based `Response Structure` contains `.....`, MockMock treats it as a truncated example, fetches the live payload from `--fallback` for safe read-only endpoints, then adds any documented fields that are missing from that payload.
- Path parameters in documentation can use `{id}` and are converted to Express-style params internally.
- Plain code-block parsing is best with object-shaped JSON responses; table-based ERD pages are more flexible.

## Server Endpoints

In addition to parsed API routes, MockMock exposes a few built-in endpoints:

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/health` | `GET` | Shows registered endpoints and current configuration |
| `/_config/delay` | `GET` | Returns current response delay |
| `/_config/delay` | `PUT` | Updates response delay at runtime |

You can also change delay from stdin while the server is running:

```text
delay 500
delay
```

## Developer Guide

### Scripts

```bash
npm install
npm run build
npm run dev -- --url file://C:/absolute/path/to/example-confluence.html
npm start -- --url file://C:/absolute/path/to/example-confluence.html
```

### Tech Stack

- TypeScript
- Commander
- Axios
- Cheerio
- Express
- Faker

### Development Flow

1. Update fetching logic in `src/fetcher/` if the Confluence source format changes.
2. Update parsing logic in `src/parser/` when new ERD/table/code patterns need to be supported.
3. Keep `MockEndpoint` and `MockSchema` in `src/parser/schema-types.ts` as the contract between layers.
4. Update server behavior in `src/server/` when changing how routes, state, or fake responses work.
5. Run `npm run build` to verify TypeScript compilation.

### Important Design Choices

- The parser and server communicate through a simple schema contract.
- The server is stateful only in memory; restarting the process resets all data.
- Fake data generation is template-driven, so response structure depends on the documentation input.
- Collections are derived from `GET` endpoints that expose arrays in the response template.

### Project Structure for Contributors

- `example-confluence.html`: local test fixture
- `README.md`: main project documentation
- `AUTH_SETUP.md`: authentication help
- `QUICKSTART.md`: short setup walkthrough
- `CONTRIBUTING.md`: contributor notes

## Troubleshooting

### No endpoints found

- Check that the Confluence page contains supported tables or code blocks.
- Use `--debug` to save `debug.html` and inspect the fetched HTML.

### Authentication failed

- Verify `CONFLUENCE_EMAIL` and `CONFLUENCE_API_TOKEN`.
- Confirm the page is accessible to that account.
- For Atlassian Cloud, make sure the URL contains a valid `/pages/<id>/` segment.

### Unexpected response shape

- Check the response JSON in Confluence.
- Make sure wrapped arrays or nested objects are valid JSON.
- For truncated `.....` examples, provide `--fallback` so MockMock can hydrate the missing structure from the live API.
- Parse-time fallback hydration is limited to read-only endpoints such as `GET`; non-`GET` endpoints keep the documented fields only.
- Remember that fake data is inferred from field names and primitive types.

### Changes disappear after restart

This is expected. Data is stored only in memory.

## Example Output

```text
MockMock CLI

Fetching Confluence page: https://confluence.example.com/pages/123456
Page fetched successfully

Parsing API endpoints...
Found 3 endpoint(s)

Registering endpoints:
  GET    /api/users
  POST   /api/users
  DELETE /api/users/:id

Mock server started successfully
Base URL: http://localhost:4000
Health check: http://localhost:4000/health
```

## License

MIT
