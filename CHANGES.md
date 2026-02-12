# Recent Updates

## What Was Fixed

### 1. **Table-Based Parser Support** ✅
The original parser only supported code blocks. Your Confluence page uses a **table format** with:
- Work (title)
- URL (endpoint path)
- Method (HTTP method badge like "GET", "POST")
- Parameters (description)

The parser now supports **both formats**:
- ✅ Code blocks (original format)
- ✅ Table-based endpoints (new format)

### 2. **Code Snippets Extraction** ✅
Your Confluence has expandable "Code snippets" sections below tables with:
- "Response Structure:" containing JSON
- "Request Structure/Body:" containing JSON

The parser now:
- Finds code snippet sections near table rows
- Extracts JSON from Response Structure
- Extracts JSON from Request Structure
- Associates them with the correct endpoint

### 3. **Authentication Support** ✅
Your Confluence page requires login. The tool now:
- Detects when it receives a login page
- Provides clear error messages
- Shows how to set up authentication
- Supports Atlassian API tokens

### 4. **Debug Mode** ✅
Added `--debug` flag to help troubleshoot parsing issues:
- Saves fetched HTML to `debug.html`
- Shows parsed endpoints before validation
- Helps debug authentication issues

### 5. **PATCH Method Support** ✅
Added support for PATCH HTTP method (in addition to GET, POST, PUT, DELETE)

## What You Need to Do Next

### Option A: Set Up Authentication (Recommended)

1. **Create API Token:**
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Click "Create API token"
   - Name it "MockMock" and copy the token

2. **Set Environment Variables:**
   ```bash
   # Windows CMD
   set CONFLUENCE_EMAIL=your@totersapps.com
   set CONFLUENCE_API_TOKEN=paste-your-token-here
   
   # Windows PowerShell
   $env:CONFLUENCE_EMAIL="your@totersapps.com"
   $env:CONFLUENCE_API_TOKEN="paste-your-token-here"
   
   # Mac/Linux
   export CONFLUENCE_EMAIL=your@totersapps.com
   export CONFLUENCE_API_TOKEN=paste-your-token-here
   ```

3. **Run the CLI:**
   ```bash
   npm run dev -- --url https://totersapps.atlassian.net/wiki/spaces/ProductEng/pages/655949830/Milestone+3+-+Mother+Category+ERD --port 4000
   ```

### Option B: Export Page as HTML

If you can't get authentication working:

1. Open the Confluence page in your browser
2. Right-click → "Save As" → Save as HTML
3. Run with local file:
   ```bash
   npm run dev -- --url file:///path/to/saved-page.html --port 4000
   ```

## Testing the Parser

Once you have authentication set up, test with debug mode:

```bash
npm run dev -- --url YOUR_CONFLUENCE_URL --port 4000 --debug
```

This will:
1. Show if authentication works
2. Save the HTML to `debug.html`
3. Show what endpoints were parsed
4. Help troubleshoot any issues

## Current Status

✅ Parser updated to support table format  
✅ Code snippets extraction added  
✅ Authentication detection added  
✅ PATCH method support added  
✅ Debug mode added  
⏳ **Waiting for you to set up authentication**  

## Files Changed

- `src/parser/erd-parser.ts` - Added table parser and code snippet extraction
- `src/parser/schema-types.ts` - Added PATCH method
- `src/server/mock-server.ts` - Added PATCH handler
- `src/fetcher/confluence.ts` - Improved auth handling and error messages
- `src/cli.ts` - Added debug mode
- `AUTH_SETUP.md` - Complete authentication guide
- `QUICKSTART.md` - Updated with auth instructions

## Expected Behavior After Auth

Once authentication is set up, you should see:

```
🚀 MockMock CLI

📄 Fetching Confluence page: https://totersapps.atlassian.net/...
✅ Page fetched successfully

🔍 Parsing API endpoints...
✅ Found X endpoint(s)

📡 Registering endpoints:

   GET    /api/inventory/mother-categories
   POST   /api/inventory/mother-categories
   ...

✅ Mock server started successfully!

🌐 Base URL: http://localhost:4000
📊 Total endpoints: X
💚 Health check: http://localhost:4000/health
```

Then you can test your endpoints:

```bash
curl http://localhost:4000/api/inventory/mother-categories
```
