# MockMock - Presentation Material & Gemini Prompt

---

## PART 1: COMPLETE PROJECT DOCUMENTATION (for context)

### What is MockMock?

MockMock is an internal CLI tool that **automatically generates a fully functional mock API server** by reading API endpoint documentation from Confluence pages. Frontend developers no longer need to wait for backend APIs to be ready — they just point MockMock at a Confluence page and get a running server with realistic fake data in seconds.

### The Problem It Solves

In our current workflow:
- Backend engineers write API documentation in Confluence (ERD pages) describing endpoints, request/response schemas.
- Frontend developers must **wait** for the backend to finish implementing these APIs before they can start integration work.
- This creates bottlenecks, idle time, and delays in delivery.
- Manually creating mock data is tedious, error-prone, and goes out of sync with the actual API spec.

### How MockMock Works (3-Step Pipeline)

**Step 1: Fetch** — The tool fetches the HTML content from a Confluence page URL. It supports Atlassian Cloud authentication via API tokens for private pages.

**Step 2: Parse** — It parses the HTML using Cheerio, extracting API endpoint definitions from either:
- Confluence **tables** (with rows for URL, Method, Parameters)
- **Code blocks** (with method, path, request/response JSON)
- **CDATA blocks** inside Confluence expand/code macros (for Response Structure / Request Structure JSON)

**Step 3: Serve** — It spins up an Express.js mock server that:
- Registers all parsed endpoints as real routes
- Converts path parameters (`{userId}` becomes `:userId`)
- Uses Faker.js to generate realistic fake data based on field names (e.g., `email` fields get fake emails, `name` fields get fake names, `price` fields get realistic prices)
- Enables CORS for frontend apps
- Provides a `/health` endpoint listing all available routes

### Key Features

1. **One command setup**: `npm run dev -- --url <confluence-url> --port 4000`
2. **Smart data generation**: Faker.js infers field types from names — `email` gets emails, `image` gets image URLs, `ar` fields get Arabic text, `price` gets decimal numbers, etc.
3. **Two parsing formats supported**: Tables (common in Confluence ERD pages) and code blocks
4. **Path parameter support**: `{categoryId}`, `{userId}` etc. are auto-converted to Express route params
5. **CORS enabled**: Works out of the box with any frontend app
6. **Health check endpoint**: `GET /health` lists all registered endpoints
7. **Debug mode**: `--debug` flag saves raw HTML and shows parsed endpoints for troubleshooting
8. **Localization support**: Handles `{ en: "...", ar: "..." }` structures natively
9. **Graceful shutdown**: Handles Ctrl+C properly
10. **Authentication**: Supports Atlassian API tokens via `.env` file

### How to Use MockMock (for Frontend Developers)

**Initial Setup (one time):**
```bash
git clone <repo-url>
cd mock-mock
npm install
```

**Configure authentication (if Confluence pages are private):**
Create a `.env` file:
```
CONFLUENCE_EMAIL=your-email@company.com
CONFLUENCE_API_TOKEN=your-api-token
```
Get your API token from: https://id.atlassian.com/manage-profile/security/api-tokens

**Run the mock server:**
```bash
# Point to any Confluence API documentation page
npm run dev -- --url https://yourcompany.atlassian.net/wiki/spaces/TEAM/pages/123456 --port 4000

# Debug mode (if endpoints aren't being parsed correctly)
npm run dev -- --url <url> --port 4000 --debug
```

**Test it:**
```bash
# See all available endpoints
curl http://localhost:4000/health

# Hit any endpoint — you'll get realistic fake data
curl http://localhost:4000/api/categories
curl http://localhost:4000/api/users/5
```

### How Backend Engineers Should Write the ERD (CRITICAL SECTION)

For MockMock to correctly parse endpoints, the Confluence page should follow one of these formats:

#### FORMAT A: Table Format (Recommended for Confluence)

Create a Confluence table with these rows:

| Row Header | Value |
|---|---|
| **Work** | Description of what the endpoint does (e.g., "Get all categories") |
| **URL** | `api/inventory/mother-categories/{motherCatId}/linkedCategories` |
| **Method** | GET (or POST, PUT, DELETE, PATCH) |
| **Parameters** | `store_company_id: Optional` |

Then below the table, add a **Confluence Expand macro** titled "Code snippets" containing:

```
Response Structure:
{
  "errors": false,
  "data": [
    {
      "id": 1,
      "title": { "en": "Category Name", "ar": "اسم الفئة" },
      "image": "https://example.com/image.jpg",
      "priority": 2,
      "sub_categories_count": 3,
      "sub_categories": [
        {
          "id": 10,
          "title": { "en": "Sub Category", "ar": "فئة فرعية" },
          "image": "https://example.com/sub.jpg",
          "priority": 1
        }
      ]
    }
  ]
}
```

For POST/PUT endpoints, also include:
```
Request Structure:
{
  "name": "Technology",
  "description": "Tech category",
  "priority": 1
}
```

#### FORMAT B: Code Block Format

Create a Confluence code block with this structure:

```
POST /api/categories

Request:
{
  "name": "Technology",
  "description": "A technology category"
}

Response:
{
  "id": 1,
  "name": "Technology",
  "description": "A technology category",
  "created_at": "2026-02-12T10:00:00Z"
}

Status: 201
```

#### Rules for Backend Engineers:

1. **Always include the full URL path** starting with `api/` or `/api/`
2. **Always specify the HTTP method** (GET, POST, PUT, DELETE, PATCH)
3. **Always include a Response JSON** — this is the template MockMock uses to generate fake data. The more complete the JSON, the better the mock data.
4. **Use curly braces for path parameters**: `{userId}`, `{categoryId}`, etc.
5. **Include nested structures** — MockMock handles nested objects and arrays
6. **Use descriptive field names** — MockMock infers data types from names:
   - `email` → generates fake emails
   - `name`, `title` → generates fake names/words
   - `image`, `avatar` → generates image URLs
   - `price`, `cost` → generates decimal numbers
   - `count`, `total` → generates integers
   - `description` → generates sentences
   - `url`, `link` → generates URLs
   - `en` → generates English text
   - `ar` → generates Arabic text
   - `id` → generates numeric IDs
7. **Include request body for POST/PUT** — helps document what the endpoint expects
8. **Specify status codes** if non-standard (defaults: GET=200, POST=201)

### Smart Data Generation Examples

When the response template contains:
```json
{
  "id": 1,
  "name": "John",
  "email": "john@example.com",
  "avatar": "https://example.com/photo.jpg",
  "company_name": "Acme Corp",
  "price": 29.99,
  "items_count": 5,
  "description": "Some text",
  "title": { "en": "English Title", "ar": "عنوان عربي" }
}
```

MockMock generates:
```json
{
  "id": 847,
  "name": "lorem ipsum",
  "email": "Kyla.Bradtke@hotmail.com",
  "avatar": "https://picsum.photos/seed/abc/200/300",
  "company_name": "Schiller, Wunsch and Bayer",
  "price": 542.31,
  "items_count": 67,
  "description": "Corporis voluptatem quia tempora.",
  "title": { "en": "dolor sit", "ar": "عربي" }
}
```

Arrays in the template automatically generate 2-3 items with varied fake data.

### Architecture Overview

```
Confluence Page (HTML)
        │
        ▼
┌─────────────────┐
│  Fetcher Layer   │  axios + Atlassian REST API
│  (confluence.ts) │  Handles auth, cloud/server URLs
└────────┬────────┘
         │ HTML string
         ▼
┌─────────────────┐
│  Parser Layer    │  cheerio + custom JSON extractor
│  (erd-parser.ts) │  Tables, code blocks, CDATA
└────────┬────────┘
         │ MockEndpoint[]
         ▼
┌─────────────────────┐
│  Server Layer        │  Express.js + Faker.js
│  (mock-server.ts)    │  Dynamic route registration
│  (data-generator.ts) │  Smart fake data from field names
└─────────────────────┘
         │
         ▼
   http://localhost:4000
   Ready for frontend!
```

### Tech Stack

- **TypeScript** — Type-safe codebase
- **Commander.js** — CLI argument parsing
- **Axios** — HTTP client for fetching Confluence pages
- **Cheerio** — HTML parsing (jQuery-like, server-side)
- **Express.js** — Mock server framework
- **Faker.js** — Realistic fake data generation
- **dotenv** — Environment variable management
- **CORS** — Cross-origin resource sharing middleware

### Benefits Summary

**For Frontend Developers:**
- Zero wait time — start integration immediately after API docs are written
- Realistic fake data — no more hardcoded `"test123"` values
- CORS enabled — plug directly into your Angular/React/Vue app
- One command — no configuration files to maintain

**For Backend Engineers:**
- No pressure to rush API implementation for frontend deadlines
- Documentation becomes immediately useful (not just docs)
- Encourages writing complete, well-structured API documentation

**For the Team:**
- Frontend and backend work in parallel — faster delivery
- Single source of truth — Confluence docs drive both mock and real APIs
- Easy to update — change Confluence page, restart MockMock
- Catches API design issues early — frontend can test integration before backend is done

**For QA:**
- Can test frontend flows without backend dependency
- Consistent mock data for reproducible testing

---

## PART 2: GEMINI PROMPT (Copy and paste this into Google Gemini)

---

```
Create a professional, visually appealing Google Slides presentation (16:9 aspect ratio) with the following content. Use a modern, clean tech design with a dark navy/deep blue primary color, white text, and accent colors of electric blue and green. Use simple icons and minimal text per slide — the slides should be presentation-friendly (not walls of text).

PRESENTATION TITLE: MockMock — From Docs to Mock Server in Seconds

---

SLIDE 1 — TITLE SLIDE
Title: MockMock
Subtitle: From Confluence Docs to Mock Server in Seconds
Tagline at bottom: "Stop waiting. Start building."
Include a simple terminal/code icon.

---

SLIDE 2 — THE PROBLEM
Title: The Problem We All Face
Use 3-4 bullet points with icons:
• Frontend developers wait for backend APIs to be implemented before starting integration
• Manually creating mock data is tedious and goes out of sync with actual API specs
• Backend feels pressure to rush implementation for frontend deadlines
• Delays compound — blocked frontend = delayed features = delayed releases
Add a simple illustration of a developer waiting/clock.

---

SLIDE 3 — THE SOLUTION
Title: Meet MockMock
Center text: "A CLI tool that reads your API documentation from Confluence and instantly generates a fully functional mock server with realistic fake data."
Below that, a simple one-line command:
npm run dev -- --url <confluence-page-url> --port 4000
Tagline: "One command. That's it."

---

SLIDE 4 — HOW IT WORKS (Architecture Flow)
Title: How It Works
Show a 3-step horizontal flow diagram with arrows:

Step 1: FETCH — "Reads the Confluence page HTML (supports authentication for private pages)"
Step 2: PARSE — "Extracts API endpoints, methods, paths, request/response schemas from tables and code blocks"
Step 3: SERVE — "Spins up an Express.js server with all endpoints, generating realistic fake data using Faker.js"

Below the flow: "Result: A running mock API server at http://localhost:4000"

---

SLIDE 5 — KEY FEATURES
Title: Key Features
Use a 2-column grid layout with icons for each:
• One command setup — no config files needed
• Smart data generation — infers types from field names (email → fake emails, price → decimals)
• Two parsing formats — supports Confluence tables and code blocks
• Path parameters — {userId} auto-converts to Express :userId
• CORS enabled — works with any frontend framework out of the box
• Health check — GET /health lists all available endpoints
• Localization — handles { en: "...", ar: "..." } natively
• Debug mode — troubleshoot parsing issues easily

---

SLIDE 6 — SMART DATA GENERATION
Title: Smart Fake Data from Field Names
Show a before/after comparison:

LEFT SIDE (labeled "Your Response Template in Confluence"):
{
  "id": 1,
  "name": "John",
  "email": "john@example.com",
  "avatar": "https://example.com/photo.jpg",
  "price": 29.99,
  "items_count": 5,
  "title": { "en": "Title", "ar": "عنوان" }
}

RIGHT SIDE (labeled "What MockMock Generates"):
{
  "id": 847,
  "name": "lorem ipsum",
  "email": "Kyla.Bradtke@hotmail.com",
  "avatar": "https://picsum.photos/seed/abc/200",
  "price": 542.31,
  "items_count": 67,
  "title": { "en": "dolor sit", "ar": "عربي" }
}

Note at bottom: "Arrays automatically generate 2-3 items with varied data."

---

SLIDE 7 — BENEFITS FOR FRONTEND DEVELOPERS
Title: Benefits — Frontend Developers
Use large icons with short text:
• Zero wait time — start integration as soon as API docs are written
• Realistic responses — no more hardcoded "test123" values
• CORS ready — plug directly into Angular, React, or Vue
• One command — no mock files or interceptors to maintain
• Always in sync — regenerate from updated Confluence page anytime

---

SLIDE 8 — BENEFITS FOR THE TEAM
Title: Benefits — The Whole Team
Use icons:
• Frontend & Backend work in parallel — faster delivery cycles
• Single source of truth — Confluence docs drive both mock and real APIs
• Backend engineers get time — no pressure to rush for frontend deadlines
• Catches API design issues early — frontend tests integration before backend is done
• QA can test frontend flows independently

---

SLIDE 9 — HOW TO USE IT (SETUP)
Title: Getting Started
Show numbered steps:

1. Clone the repo:
   git clone <repo-url> && cd mock-mock && npm install

2. Set up authentication (for private Confluence pages):
   Create .env file with:
   CONFLUENCE_EMAIL=your-email@company.com
   CONFLUENCE_API_TOKEN=your-api-token
   (Get token from: https://id.atlassian.com/manage-profile/security/api-tokens)

3. Run it:
   npm run dev -- --url <confluence-page-url> --port 4000

4. Test it:
   curl http://localhost:4000/health

---

SLIDE 10 — FOR BACKEND ENGINEERS: ERD FORMAT (Table Format)
Title: For Backend Engineers — How to Write the ERD
Subtitle: Format A: Table Format (Recommended)

Show a Confluence-style table example:
| Row      | Value                                              |
|----------|----------------------------------------------------|
| Work     | Get all linked parent categories                   |
| URL      | api/inventory/mother-categories/{motherCatId}/linkedCategories |
| Method   | GET                                                |
| Parameters | store_company_id: Optional                       |

Then below it, show text:
"Below the table, add a Confluence Expand macro titled 'Code snippets' with:"

Response Structure:
{
  "errors": false,
  "data": [
    {
      "id": 1,
      "title": { "en": "Category", "ar": "فئة" },
      "image": "https://example.com/img.jpg",
      "sub_categories": [...]
    }
  ]
}

---

SLIDE 11 — FOR BACKEND ENGINEERS: ERD FORMAT (Code Block Format)
Title: For Backend Engineers — How to Write the ERD
Subtitle: Format B: Code Block Format

Show a code block example:
POST /api/categories

Request:
{
  "name": "Technology",
  "description": "A technology category"
}

Response:
{
  "id": 1,
  "name": "Technology",
  "created_at": "2026-02-12T10:00:00Z"
}

Status: 201

---

SLIDE 12 — ERD GOLDEN RULES FOR BACKEND ENGINEERS
Title: ERD Writing Rules (Must Follow)
Use a checklist style with checkmarks:
✅ Always include the full URL path starting with api/ or /api/
✅ Always specify the HTTP method (GET, POST, PUT, DELETE, PATCH)
✅ Always include a complete Response JSON — the more detailed, the better the mock data
✅ Use curly braces for path parameters: {userId}, {categoryId}
✅ Use descriptive field names — MockMock infers types from names
✅ Include request body examples for POST/PUT endpoints
✅ Include nested objects and arrays to get realistic nested mock data

Show a small field-name-to-type mapping:
email → fake emails | name/title → fake names | image/avatar → image URLs
price/cost → decimals | count/total → integers | id → numeric IDs
en → English text | ar → Arabic text | description → sentences

---

SLIDE 13 — LIVE DEMO / QUICK EXAMPLE
Title: See It In Action
Show a terminal-style visual:

$ npm run dev -- --url https://confluence.example.com/pages/12345 --port 4000

🚀 MockMock CLI
📄 Fetching Confluence page...
✅ Page fetched successfully
🔍 Parsing API endpoints...
✅ Found 8 endpoint(s)

📡 Registering endpoints:
   GET    /api/categories
   POST   /api/categories
   GET    /api/categories/:id
   PUT    /api/categories/:id
   DELETE /api/categories/:id
   GET    /api/users
   POST   /api/users
   GET    /api/users/:id

✅ Mock server started!
🌐 Base URL: http://localhost:4000
💚 Health check: http://localhost:4000/health

---

SLIDE 14 — THANK YOU / Q&A
Title: Questions?
Subtitle: Start using MockMock today
Repo: <repo-url>
Contact: Mohamad Mansour
Large text at center: "Stop waiting. Start building."
```

---

## PART 3: TIPS FOR USING THE PROMPT

1. **Go to** Google Gemini (gemini.google.com)
2. **Copy everything** inside the code block in PART 2 above
3. **Paste it** into Gemini
4. If Gemini asks clarifying questions, you can reference PART 1 of this document for detailed answers
5. You can also ask Gemini follow-up requests like:
   - "Make the design more colorful"
   - "Add speaker notes to each slide"
   - "Add an animation suggestion for slide 4"
   - "Make it more visual and less text-heavy"
   - "Export this as a Google Slides link"
