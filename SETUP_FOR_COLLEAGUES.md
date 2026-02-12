# MockMock Setup Guide for Team

## 🎯 What is MockMock?

MockMock is a CLI tool that generates mock API servers from Confluence documentation. It reads API endpoint definitions from Confluence pages and spins up a working Express server with those endpoints.

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)
- **Atlassian API Token** (only if accessing private Confluence pages)

## 🚀 Setup Instructions

### Step 1: Get the Code

```bash
# Clone or download the project
cd mock-mock
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages (~30 seconds).

### Step 3: Set Up Authentication (Optional)

**Only needed if your Confluence pages are private.**

1. **Create an Atlassian API Token:**
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Click "Create API token"
   - Give it a name (e.g., "MockMock")
   - Copy the token

2. **Create a `.env` file:**
   ```bash
   # Copy the example file
   cp .env.example .env
   ```

3. **Edit `.env` and add your credentials:**
   ```
   CONFLUENCE_EMAIL=your-email@company.com
   CONFLUENCE_API_TOKEN=your-token-here
   ```

   ⚠️ **Important:** Never commit the `.env` file to git!

### Step 4: Test with Example

Test that everything works:

```bash
npm run dev -- --url file://$(pwd)/example-confluence.html --port 4000
```

You should see:
```
🚀 MockMock CLI
✅ Found 4 endpoint(s)
✅ Mock server started successfully!
🌐 Base URL: http://localhost:4000
```

### Step 5: Test with Real Confluence

```bash
npm run dev -- --url https://your-confluence.com/pages/123456 --port 4000
```

Replace the URL with your actual Confluence page URL.

## 🧪 Testing the Server

Open a new terminal and test the endpoints:

```bash
# Health check
curl http://localhost:4000/health

# Test an endpoint (example)
curl http://localhost:4000/api/users
```

## 📐 How to Format API Definitions in Confluence

In your Confluence page, create code blocks with this format:

```
POST /api/users

Request:
{
  "name": "John Doe",
  "email": "john@example.com"
}

Response:
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2026-02-12T10:00:00Z"
}

Status: 201
```

### Supported HTTP Methods
- GET
- POST
- PUT
- DELETE

### Required Fields
- HTTP Method and Path (first line)
- Response (JSON object)

### Optional Fields
- Request (JSON object for request body)
- Status (HTTP status code, defaults to 200)

## 🔧 Common Commands

```bash
# Run in development mode
npm run dev -- --url <confluence-url> --port 4000

# Build the project
npm run build

# Run the built version
npm start -- --url <confluence-url> --port 4000
```

## ❓ Troubleshooting

### Authentication Errors
- Make sure your `.env` file has correct email and API token
- Verify the API token is still valid at https://id.atlassian.com/manage-profile/security/api-tokens

### "No endpoints found"
- Check that your Confluence page has code blocks with the correct format
- Verify the code blocks are not inside collapsed sections or macros

### Port Already in Use
- Change the port: `npm run dev -- --url <url> --port 5000`
- Or kill the process using port 4000

### Cannot Fetch Page
- Verify the Confluence URL is accessible
- Check if authentication is required (set up `.env`)
- Ensure you're connected to the internet

## 📚 Additional Resources

- **QUICKSTART.md** - Detailed quick start guide
- **AUTH_SETUP.md** - Authentication setup details
- **README.md** - Full project documentation
- **EXPORT_PAGE_GUIDE.md** - How to export Confluence pages

## 🎯 Quick Reference

### Starting the Server
```bash
npm run dev -- --url <confluence-url> --port 4000
```

### Stopping the Server
Press `Ctrl+C` in the terminal

### Getting Help
```bash
npm run dev -- --help
```

## 💡 Tips

1. **Use the example file first** to verify everything works
2. **Keep your `.env` file secret** - never share it or commit it
3. **Use descriptive endpoint names** in your Confluence documentation
4. **Test endpoints immediately** after starting the server
5. **Check console output** for parsing errors if endpoints are missing

---

**Need help?** Contact the team or check the documentation files in the project.
