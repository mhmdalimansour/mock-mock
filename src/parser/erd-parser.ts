import * as cheerio from 'cheerio';
import { MockEndpoint, MockSchema } from './schema-types';

/**
 * Parses API endpoint definitions from Confluence HTML
 * Supports both code blocks and table-based formats
 */
export function parseERDFromHTML(html: string): MockSchema {
  const $ = cheerio.load(html);
  let endpoints: MockSchema = [];

  // Strategy 1: Try parsing tables (common in Confluence ERD pages)
  const tableEndpoints = parseTableBasedEndpoints($, html);
  if (tableEndpoints.length > 0) {
    endpoints.push(...tableEndpoints);
  }

  // Strategy 2: Try parsing code blocks (original format)
  const codeBlocks = $('pre, code, div.code, div.codeContent').toArray();
  for (const block of codeBlocks) {
    const text = $(block).text().trim();
    
    if (!text) continue;

    try {
      const endpoint = parseEndpointFromText(text);
      if (endpoint) {
        endpoints.push(endpoint);
      }
    } catch (error) {
      // Gracefully skip invalid blocks
      continue;
    }
  }

  return endpoints;
}

/**
 * Parses a single endpoint definition from text
 */
function parseEndpointFromText(text: string): MockEndpoint | null {
  // Match HTTP method and path (e.g., "POST /api/categories")
  const methodPathRegex = /^(GET|POST|PUT|DELETE)\s+(\/[^\s\n]*)/im;
  const methodPathMatch = text.match(methodPathRegex);

  if (!methodPathMatch) {
    return null;
  }

  const method = methodPathMatch[1].toUpperCase() as MockEndpoint['method'];
  const path = methodPathMatch[2];

  // Extract Request JSON
  let request: unknown = undefined;
  const requestMatch = text.match(/Request:\s*\n\s*(\{[\s\S]*?\})/i);
  if (requestMatch) {
    try {
      request = JSON.parse(requestMatch[1]);
    } catch {
      // Invalid JSON, skip request
    }
  }

  // Extract Response JSON
  let response: unknown = {};
  const responseMatch = text.match(/Response:\s*\n\s*(\{[\s\S]*?\})/i);
  if (responseMatch) {
    try {
      response = JSON.parse(responseMatch[1]);
    } catch {
      // Invalid JSON, use empty object
      response = {};
    }
  }

  // Extract status code if specified
  let status: number | undefined = undefined;
  const statusMatch = text.match(/Status:\s*(\d{3})/i);
  if (statusMatch) {
    status = parseInt(statusMatch[1], 10);
  }

  return {
    method,
    path,
    request,
    response,
    status,
  };
}

/**
 * Extracts request/response from CDATA blocks associated with a specific endpoint.
 * Each block is checked for Response Structure and Body/Request keywords.
 */
function extractFromAssociatedBlocks(blocks: Array<{ position: number; content: string }>): { request?: unknown; response?: unknown } {
  const result: { request?: unknown; response?: unknown } = {};

  for (const block of blocks) {
    const content = block.content;

    if (!result.response) {
      if (content.includes('Response Structure:')) {
        const json = extractCompleteJSON(content, 'Response Structure:');
        if (json) result.response = json;
      } else if (content.includes('Response Structure')) {
        const json = extractCompleteJSON(content, 'Response Structure');
        if (json) result.response = json;
      }
    }

    if (!result.request) {
      if (content.includes('Request Structure:')) {
        const json = extractCompleteJSON(content, 'Request Structure:');
        if (json) result.request = json;
      } else if (content.includes('Body:')) {
        const json = extractCompleteJSON(content, 'Body:');
        if (json) result.request = json;
      } else if (content.includes('Request Body:')) {
        const json = extractCompleteJSON(content, 'Request Body:');
        if (json) result.request = json;
      } else if (content.includes('Request:') && !content.includes('Response')) {
        const json = extractCompleteJSON(content, 'Request:');
        if (json) result.request = json;
      }
    }
  }

  return result;
}

/**
 * Parses endpoints from Confluence table format.
 * Uses positional association to correctly map CDATA code snippets
 * to their owning table, even when endpoints have multiple CDATA blocks.
 */
function parseTableBasedEndpoints($: cheerio.CheerioAPI, html: string): MockSchema {
  const endpoints: MockSchema = [];

  // Find positions of every <table in the raw HTML
  const tablePositions: number[] = [];
  const tableRegex = /<table[\s>]/gi;
  let tMatch;
  while ((tMatch = tableRegex.exec(html)) !== null) {
    tablePositions.push(tMatch.index);
  }

  // Find every CDATA block together with its position
  const cdataBlocks: Array<{ position: number; content: string }> = [];
  const cdataRegex = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
  let cMatch;
  while ((cMatch = cdataRegex.exec(html)) !== null) {
    cdataBlocks.push({ position: cMatch.index, content: cMatch[1] });
  }

  const tables = $('table').toArray();

  console.log(`[DEBUG] Found ${tables.length} tables, ${cdataBlocks.length} CDATA blocks`);

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const endpoint = parseEndpointFromTable($, table);

    console.log(`[DEBUG] Table ${i + 1}: ${endpoint ? `${endpoint.method} ${endpoint.path}` : 'No endpoint found'}`);

    if (endpoint) {
      const thisTablePos = i < tablePositions.length ? tablePositions[i] : 0;
      const nextTablePos = (i + 1 < tablePositions.length)
        ? tablePositions[i + 1]
        : html.length;

      const associatedBlocks = cdataBlocks.filter(
        b => b.position > thisTablePos && b.position < nextTablePos
      );

      console.log(`[DEBUG]   Associated CDATA blocks: ${associatedBlocks.length}`);

      const snippet = extractFromAssociatedBlocks(associatedBlocks);

      endpoint.response = snippet.response || { message: 'Success', data: {} };
      endpoint.request = snippet.request;

      if (!endpoint.status) {
        endpoint.status = endpoint.method === 'POST' ? 201 : 200;
      }

      endpoints.push(endpoint as MockEndpoint);
    }
  }

  console.log(`[DEBUG] Total endpoints parsed: ${endpoints.length}`);

  return endpoints;
}

/**
 * Parses a single endpoint from a table
 */
function parseEndpointFromTable($: cheerio.CheerioAPI, table: any): Partial<MockEndpoint> | null {
  const rows = $(table).find('tr').toArray();
  const endpoint: Partial<MockEndpoint> = {};
  let hasMethodRow = false;
  let hasUrlRow = false;

  for (const row of rows) {
    try {
      const th = $(row).find('th').first();
      const td = $(row).find('td').first();

      if (th.length === 0 || td.length === 0) continue;

      const label = th.text().trim().toLowerCase();
      const valueElem = td;

      // Extract value - handle both text and code elements
      let value = valueElem.find('code').text().trim() || valueElem.text().trim();

      // Parse URL field
      if (label.includes('url') || label.includes('endpoint')) {
        hasUrlRow = true;
        let url = value.split('?')[0]; // Remove query params
        
        // Handle paths like "api/inventory/..." or "/api/inventory/..."
        if (url.startsWith('api/')) {
          url = '/' + url;
        } else if (!url.startsWith('/') && url.includes('api/')) {
          url = '/' + url;
        }
        
        endpoint.path = url;
      }

      // Parse Method field
      if (label.includes('method')) {
        hasMethodRow = true;
        // Extract method from status macro or plain text (no word boundaries needed - handles "POSTPurple", etc.)
        const methodMatch = value.match(/(GET|POST|PUT|DELETE|PATCH)/i);
        if (methodMatch) {
          endpoint.method = methodMatch[1].toUpperCase() as MockEndpoint['method'];
        } else {
          // Debug: couldn't find method in value
          console.log(`[DEBUG] Method field found but no HTTP method in value: "${value}"`);
        }
      }
    } catch (error) {
      continue;
    }
  }

  // Debug logging
  if (hasMethodRow || hasUrlRow) {
    console.log(`[DEBUG] Table scan: URL=${hasUrlRow}(${endpoint.path || 'none'}), Method=${hasMethodRow}(${endpoint.method || 'none'})`);
  }

  // Only return if we have both method and path
  if (endpoint.method && endpoint.path) {
    return endpoint;
  }

  return null;
}

/**
 * Extracts a complete JSON object from text, handling nested structures
 */
function extractCompleteJSON(text: string, startKeyword: string): unknown | null {
  const startIndex = text.indexOf(startKeyword);
  if (startIndex === -1) return null;
  
  // Find the first opening brace after the keyword
  const jsonStart = text.indexOf('{', startIndex);
  if (jsonStart === -1) return null;
  
  // Count braces to find the matching closing brace
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  let jsonEnd = -1;
  
  for (let i = jsonStart; i < text.length; i++) {
    const char = text[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
  }
  
  if (jsonEnd === -1) return null;
  
  const jsonStr = text.substring(jsonStart, jsonEnd);
  try {
    return JSON.parse(jsonStr);
  } catch {
    const sanitized = stripJSONComments(jsonStr);
    try {
      return JSON.parse(sanitized);
    } catch {
      return null;
    }
  }
}

/**
 * Strips single-line // comments that appear outside of JSON string values.
 */
function stripJSONComments(jsonStr: string): string {
  return jsonStr
    .split('\n')
    .map(line => {
      let inString = false;
      let escaped = false;
      for (let i = 0; i < line.length - 1; i++) {
        const char = line[i];
        if (escaped) { escaped = false; continue; }
        if (char === '\\') { escaped = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (!inString && char === '/' && line[i + 1] === '/') {
          return line.substring(0, i).trimEnd();
        }
      }
      return line;
    })
    .join('\n');
}

/**
 * Validates that the parsed schema contains at least one endpoint
 */
export function validateSchema(schema: MockSchema): void {
  if (schema.length === 0) {
    throw new Error('No valid endpoints found in the Confluence page');
  }
}
