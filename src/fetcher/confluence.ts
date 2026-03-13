import axios, { AxiosRequestConfig } from 'axios';
import { readFileSync } from 'fs';

/**
 * Extracts page ID from Confluence URL
 */
function extractPageId(url: string): string | null {
  // Match patterns like /pages/655949830/ or /pages/655949830/Page+Title
  const match = url.match(/\/pages\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Extracts Confluence base URL
 */
function extractBaseUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  } catch {
    return null;
  }
}

/**
 * Fetches HTML content from a Confluence page
 * Supports optional Basic Auth via environment variables
 * Automatically uses Confluence REST API for Atlassian Cloud URLs
 */
export async function fetchConfluencePage(url: string): Promise<string> {
  try {
    // Handle local file URLs
    if (url.startsWith('file://')) {
      console.log('📁 Reading local file\n');
      try {
        let filePath = url.replace('file://', '');
        
        // Handle Windows paths: file:///c:/path or file:///c|/path
        if (filePath.startsWith('/') && filePath.match(/^\/[a-zA-Z][:|\|]/)) {
          filePath = filePath.substring(1).replace('|', ':');
        }
        
        return readFileSync(filePath, 'utf-8');
      } catch (error) {
        throw new Error(`Failed to read local file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const email = process.env.CONFLUENCE_EMAIL;
    const token = process.env.CONFLUENCE_API_TOKEN;

    // Check if this is an Atlassian Cloud URL
    const isAtlassianCloud = url.includes('.atlassian.net');
    const pageId = extractPageId(url);
    const baseUrl = extractBaseUrl(url);

    // For Atlassian Cloud with credentials, use the REST API
    if (isAtlassianCloud && email && token && pageId && baseUrl) {
      console.log('🔐 Using Confluence REST API with authentication\n');
      return await fetchViaRestApi(baseUrl, pageId, email, token);
    }

    // Fallback: Try direct fetch (for local files or public pages)
    const config: AxiosRequestConfig = {
      headers: {
        'Accept': 'text/html',
      },
    };

    if (email && token) {
      config.auth = {
        username: email,
        password: token,
      };
    } else if (isAtlassianCloud) {
      console.log('⚠️  No authentication credentials found');
      console.log('   Set CONFLUENCE_EMAIL and CONFLUENCE_API_TOKEN for private pages\n');
    }

    const response = await axios.get(url, config);
    const html = response.data;

    // Check if we got a login page instead of content
    if (html.includes('Log in with Atlassian account') || 
        html.includes('id-frontend.prod') ||
        html.includes('JavaScript is disabled')) {
      throw new Error(
        'Received login page instead of content. Please provide authentication credentials.\n' +
        '   Set CONFLUENCE_EMAIL and CONFLUENCE_API_TOKEN environment variables.\n' +
        '   See AUTH_SETUP.md for detailed instructions.'
      );
    }

    return html;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error(
          'Authentication failed (401 Unauthorized).\n' +
          '   Check your CONFLUENCE_EMAIL and CONFLUENCE_API_TOKEN credentials.\n' +
          '   See AUTH_SETUP.md for setup instructions.'
        );
      }
      if (error.response?.status === 403) {
        throw new Error(
          'Access forbidden (403). You don\'t have permission to view this page.\n' +
          '   Ask your Confluence admin for access.'
        );
      }
      throw new Error(
        `Failed to fetch Confluence page: ${error.message}${
          error.response?.status ? ` (Status: ${error.response.status})` : ''
        }`
      );
    }
    throw error;
  }
}

/**
 * Fetches a live endpoint payload from the fallback API during parsing.
 * This is intentionally limited to safe read-only methods.
 */
export async function fetchFallbackEndpointResponse(
  baseUrl: string,
  path: string,
  method: string,
): Promise<unknown> {
  const normalizedMethod = method.toUpperCase();
  if (!['GET', 'HEAD'].includes(normalizedMethod)) {
    throw new Error(
      `Skipping fallback hydration for ${normalizedMethod} ${path} because parse-time hydration only supports read-only endpoints.`
    );
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = `${normalizedBaseUrl}${normalizedPath}`;

  const response = await axios({
    method: normalizedMethod as 'GET' | 'HEAD',
    url: targetUrl,
    headers: {
      Accept: 'application/json',
    },
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Fallback request failed for ${normalizedMethod} ${targetUrl} with status ${response.status}.`
    );
  }

  return response.data;
}

/**
 * Fetches page content via Confluence REST API
 */
async function fetchViaRestApi(
  baseUrl: string,
  pageId: string,
  email: string,
  token: string
): Promise<string> {
  try {
    // Try v1 API first (more commonly used)
    const apiUrl = `${baseUrl}/wiki/rest/api/content/${pageId}?expand=body.storage`;
    
    const config: AxiosRequestConfig = {
      headers: {
        'Accept': 'application/json',
      },
      auth: {
        username: email,
        password: token,
      },
    };

    const response = await axios.get(apiUrl, config);
    
    // The API returns JSON with the page body in storage format (HTML)
    const pageData = response.data;
    
    if (pageData.body && pageData.body.storage && pageData.body.storage.value) {
      return pageData.body.storage.value;
    }
    
    throw new Error('Page body not found in API response');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error(
          'Authentication failed (401 Unauthorized).\n' +
          '   Check your CONFLUENCE_EMAIL and CONFLUENCE_API_TOKEN credentials.\n' +
          '   Make sure the API token is valid and not expired.'
        );
      }
      if (error.response?.status === 403) {
        throw new Error(
          'Access forbidden (403). You don\'t have permission to view this page.\n' +
          '   Ask your Confluence admin for access.'
        );
      }
      if (error.response?.status === 404) {
        throw new Error(
          'Page not found (404). Check that the page ID is correct.\n' +
          '   URL should contain /pages/[PAGE_ID]/'
        );
      }
      throw new Error(
        `Confluence API error: ${error.message}${
          error.response?.status ? ` (Status: ${error.response.status})` : ''
        }`
      );
    }
    throw error;
  }
}
