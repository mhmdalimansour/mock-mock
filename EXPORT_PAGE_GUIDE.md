# Quick Alternative: Export Page Manually

Since API authentication is having issues, here's a **5-minute workaround** that will get you up and running immediately:

## Step 1: Export the Confluence Page

1. Open your Confluence page in a browser:
   https://totersapps.atlassian.net/wiki/spaces/ProductEng/pages/655949830/Milestone+3+-+Mother+Category+ERD

2. Press **F12** to open Developer Tools

3. Go to the **Console** tab

4. Paste this JavaScript and press Enter:
   ```javascript
   const html = document.documentElement.outerHTML;
   const blob = new Blob([html], {type: 'text/html'});
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = 'confluence-page.html';
   a.click();
   ```

5. This will download `confluence-page.html` to your Downloads folder

## Step 2: Move the File

Move the downloaded file to your MockMock project folder:

```bash
# Windows (PowerShell)
Move-Item ~\Downloads\confluence-page.html .

# Or just drag and drop it into the project folder
```

## Step 3: Run MockMock with Local File

```bash
npm run dev -- --url file://$(pwd)/confluence-page.html --port 4000 --debug
```

Or on Windows:

```bash
npm run dev -- --url file:///%cd%/confluence-page.html --port 4000 --debug
```

## This Will Work Because:

✅ No authentication needed  
✅ Gets the full rendered HTML (including JavaScript-loaded content)  
✅ Includes all tables and code snippets  
✅ Works offline  

## Expected Output:

```
🚀 MockMock CLI

📄 Fetching Confluence page: file:///c:/path/to/confluence-page.html
✅ Page fetched successfully

🐛 Debug: HTML saved to debug.html

🔍 Parsing API endpoints...
✅ Found X endpoint(s)

📡 Registering endpoints:
   GET    /api/inventory/mother-categories
   ...
```

## Troubleshooting

### "No endpoints found"

The exported HTML might be different. Try this alternative export method:

1. Right-click on the Confluence page
2. Select "Save Page As"
3. Choose "Web Page, Complete"
4. Save as `confluence-page.html`

### "File not found"

Make sure you're in the project directory:

```bash
cd c:\Users\Mohamad Mansour\Desktop\extensions\mock-mock
ls confluence-page.html  # Should exist
```

## Why is API Auth Failing?

Your Atlassian instance might be:
- Using OAuth instead of Basic Auth  
- Requiring IP whitelisting
- Having token permissions issues
- Using a different auth method

The manual export bypasses all of this!
