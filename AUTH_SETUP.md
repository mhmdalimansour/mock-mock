# Setting Up Confluence Authentication

## The Problem

Your Confluence page requires authentication. Without credentials, the tool receives the login page instead of the actual content.

## Solution: Set Up API Token

### Step 1: Create an Atlassian API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **"Create API token"**
3. Give it a name (e.g., "MockMock CLI")
4. Copy the generated token (you won't be able to see it again!)

### Step 2: Set Environment Variables

Create a `.env` file in the project root:

```bash
CONFLUENCE_EMAIL=your-email@totersapps.com
CONFLUENCE_API_TOKEN=your-api-token-here
```

Or export them in your terminal:

```bash
export CONFLUENCE_EMAIL=your-email@totersapps.com
export CONFLUENCE_API_TOKEN=your-api-token-here
```

### Step 3: Run the CLI

```bash
npm run dev -- --url https://totersapps.atlassian.net/wiki/spaces/ProductEng/pages/655949830/Milestone+3+-+Mother+Category+ERD --port 4000 --debug
```

## Testing Authentication

The debug mode will save the HTML to `debug.html`. If authentication works, you'll see the actual Confluence page content instead of the login page.

## Alternative: Use Confluence API Directly

If Basic Auth doesn't work with your Confluence setup, you can:

1. **Export the page** - Save it as HTML from Confluence
2. **Use file:// URL**:
   ```bash
   npm run dev -- --url file://$(pwd)/exported-page.html --port 4000
   ```

## Troubleshooting

### "401 Unauthorized"
- Check your email is correct
- Verify the API token is valid
- Make sure you have access to the page

### "403 Forbidden"
- Your account doesn't have permission to view this page
- Ask your Confluence admin for access

### Still Getting Login Page
- The token might be expired
- Create a new API token
- Try exporting the page as HTML instead
