# MockMock Quick Start Guide

## ✅ What Was Built

A production-grade CLI tool with clean architecture:

```
mock-mock/
├── src/
│   ├── cli.ts                      # CLI entry point with Commander
│   ├── fetcher/
│   │   └── confluence.ts           # Confluence page fetcher with auth
│   ├── parser/
│   │   ├── schema-types.ts         # Core schema definitions
│   │   └── erd-parser.ts           # HTML parser with Cheerio
│   └── server/
│       └── mock-server.ts          # Express mock server
├── dist/                           # Compiled JavaScript
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript config
├── README.md                       # Full documentation
├── .env.example                    # Auth template
└── example-confluence.html         # Sample test file
```

## 🚀 Quick Test

### Option 1: Test with Example HTML

```bash
# Start with example file (simulates Confluence page)
npm run dev -- --url file://$(pwd)/example-confluence.html --port 4000
```

### Option 2: Test with Real Confluence

#### If Your Page Requires Authentication

**Step 1:** Create an Atlassian API Token
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name (e.g., "MockMock")
4. Copy the token

**Step 2:** Set credentials
```bash
# Windows (CMD)
set CONFLUENCE_EMAIL=your@email.com
set CONFLUENCE_API_TOKEN=your-api-token

# Windows (PowerShell)
$env:CONFLUENCE_EMAIL="your@email.com"
$env:CONFLUENCE_API_TOKEN="your-api-token"

# Mac/Linux
export CONFLUENCE_EMAIL=your@email.com
export CONFLUENCE_API_TOKEN=your-api-token
```

**Step 3:** Run
```bash
npm run dev -- --url https://your-confluence.com/pages/123456 --port 4000
```

#### If Your Page is Public

```bash
# Just run directly
npm run dev -- --url https://your-confluence.com/pages/123456 --port 4000
```

📖 **See AUTH_SETUP.md for detailed authentication instructions**

## 📝 Expected Output

```
🚀 MockMock CLI

📄 Fetching Confluence page: file:///path/to/example-confluence.html
✅ Page fetched successfully

🔍 Parsing API endpoints...
✅ Found 4 endpoint(s)

📡 Registering endpoints:

   GET    /api/users
   POST   /api/users
   PUT    /api/users/1
   DELETE /api/users/1

✅ Mock server started successfully!

🌐 Base URL: http://localhost:4000
📊 Total endpoints: 4
💚 Health check: http://localhost:4000/health
```

## 🧪 Test the Server

Open another terminal:

```bash
# Health check
curl http://localhost:4000/health

# Test GET endpoint
curl http://localhost:4000/api/users

# Test POST endpoint
curl -X POST http://localhost:4000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'
```

## 📐 API Format in Confluence

The parser expects code blocks in this format:

```
METHOD /path

Request:
{
  "field": "value"
}

Response:
{
  "result": "value"
}

Status: 200
```

### Supported Methods

- `GET`
- `POST`
- `PUT`
- `DELETE`

### Example

```
POST /api/categories

Request:
{
  "name": "Technology"
}

Response:
{
  "id": 1,
  "name": "Technology",
  "created_at": "2026-02-12T10:00:00Z"
}

Status: 201
```

## 🏗 Architecture Highlights

### 1. Schema-First Design

All modules communicate through the `MockSchema` interface:

```typescript
interface MockEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  request?: unknown;
  response: unknown;
  status?: number;
}

type MockSchema = MockEndpoint[];
```

### 2. Layer Independence

- **Fetcher**: Returns raw HTML (no parsing logic)
- **Parser**: Converts HTML → MockSchema (no server logic)
- **Server**: Consumes MockSchema → Express routes (no parsing logic)

### 3. Type Safety

- Full TypeScript throughout
- Strict mode enabled
- Minimal use of `any`
- Unknown types for JSON data

### 4. Error Handling

- Graceful failures for malformed JSON
- Network error messages
- Validation at boundaries
- Clear user feedback

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Run in dev mode
npm run dev -- --url <url>

# Build
npm run build

# Run built version
npm start -- --url <url>
```

## 🎯 Next Steps

You now have a fully functional mock server generator! You can:

1. **Test locally** with example-confluence.html
2. **Connect to Confluence** with real URLs
3. **Extend** with more parser rules
4. **Deploy** as a global CLI tool

## 🔐 Authentication

For private Confluence pages:

1. Copy `.env.example` to `.env`
2. Add your credentials:
   ```
   CONFLUENCE_EMAIL=your@email.com
   CONFLUENCE_API_TOKEN=your-token
   ```
3. Run normally (credentials auto-loaded)

## 📚 Key Files to Know

- `src/cli.ts` - Main entry point
- `src/parser/schema-types.ts` - Core data types
- `src/parser/erd-parser.ts` - Parsing logic
- `src/server/mock-server.ts` - Server logic
- `example-confluence.html` - Test file

## ✨ Features Implemented

✅ Commander CLI with options  
✅ Confluence fetcher with Basic Auth  
✅ HTML parser with Cheerio  
✅ Schema validation  
✅ Dynamic Express routes  
✅ TypeScript strict mode  
✅ Clean architecture  
✅ Error handling  
✅ Health check endpoint  
✅ Console logging  
✅ Documentation  

## 🚫 Not Included (As Requested)

❌ Database  
❌ CRUD memory store  
❌ UI  
❌ Over-engineering  

The tool is clean, focused, and production-ready!
