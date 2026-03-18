import * as cheerio from 'cheerio';
import { fetchFallbackEndpointResponse } from '../fetcher/confluence';
import { MockEndpoint, MockSchema } from './schema-types';

/**
 * Parses API endpoint definitions from Confluence HTML
 * Supports both code blocks and table-based formats
 */
export interface ParseERDOptions {
  fallbackBaseUrl?: string;
}

interface ExtractedJSONSnippet {
  raw: string | null;
  value: unknown | null;
  partialValue: unknown | null;
  isTruncated: boolean;
}

export async function parseERDFromHTML(
  html: string,
  options: ParseERDOptions = {},
): Promise<MockSchema> {
  const $ = cheerio.load(html);
  let endpoints: MockSchema = [];

  // Strategy 1: Try parsing tables (common in Confluence ERD pages)
  const tableEndpoints = await parseTableBasedEndpoints($, html, options);
  if (tableEndpoints.length > 0) {
    endpoints.push(...tableEndpoints);
  }

  // Strategy 2: Try parsing code blocks (original format)
  const codeBlocks = $('pre, code, div.code, div.codeContent').toArray();
  for (const block of codeBlocks) {
    const text = $(block).text().trim();
    
    if (!text) continue;

    try {
      const endpoint = await parseEndpointFromText(text, options);
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
async function parseEndpointFromText(
  text: string,
  options: ParseERDOptions,
): Promise<MockEndpoint | null> {
  // Match HTTP method and path (e.g., "POST /api/categories")
  const methodPathRegex = /^(GET|POST|PUT|DELETE|PATCH)\s+(\/[^\s\n]*)/im;
  const methodPathMatch = text.match(methodPathRegex);

  if (!methodPathMatch) {
    return null;
  }

  const method = methodPathMatch[1].toUpperCase() as MockEndpoint['method'];
  const path = methodPathMatch[2];

  // Extract Request JSON
  let request: unknown = undefined;
  const requestSnippet = extractStructuredJSON(text, 'Request:');
  if (requestSnippet.value !== null) {
    request = requestSnippet.value;
  }

  // Extract Response JSON
  let response: unknown = {};
  const responseSnippet = extractStructuredJSON(text, 'Response:');
  if (responseSnippet.raw) {
    response = await resolveResponseSnippet(
      { method, path, request, response: {}, status: undefined },
      responseSnippet,
      options,
    ) ?? {};
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
async function extractFromAssociatedBlocks(
  endpoint: Partial<MockEndpoint>,
  blocks: Array<{ position: number; content: string }>,
  options: ParseERDOptions,
): Promise<{ request?: unknown; response?: unknown }> {
  const result: { request?: unknown; response?: unknown } = {};

  for (const block of blocks) {
    const content = block.content;

    if (!result.response) {
      if (content.includes('Response Structure:') || content.includes('Response Structure')) {
        const snippet = extractStructuredJSONFromKeywords(content, [
          'Response Structure:',
          'Response Structure',
        ]);

        if (snippet.raw && endpoint.method && endpoint.path) {
          const resolved = await resolveResponseSnippet(
            {
              method: endpoint.method,
              path: endpoint.path,
              request: endpoint.request,
              response: {},
              status: endpoint.status,
            },
            snippet,
            options,
          );
          if (resolved !== undefined) {
            result.response = resolved;
          }
        } else if (snippet.value !== null) {
          result.response = snippet.value;
        }
      }
    }

    if (!result.request) {
      if (content.includes('Request Structure:')) {
        const snippet = extractStructuredJSON(content, 'Request Structure:');
        if (snippet.value !== null) result.request = snippet.value;
      } else if (content.includes('Body:')) {
        const snippet = extractStructuredJSON(content, 'Body:');
        if (snippet.value !== null) result.request = snippet.value;
      } else if (content.includes('Request Body:')) {
        const snippet = extractStructuredJSON(content, 'Request Body:');
        if (snippet.value !== null) result.request = snippet.value;
      } else if (content.includes('Request:') && !content.includes('Response')) {
        const snippet = extractStructuredJSON(content, 'Request:');
        if (snippet.value !== null) result.request = snippet.value;
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
async function parseTableBasedEndpoints(
  $: cheerio.CheerioAPI,
  html: string,
  options: ParseERDOptions,
): Promise<MockSchema> {
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

      const snippet = await extractFromAssociatedBlocks(endpoint, associatedBlocks, options);

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
        let url = value.split('?')[0].trim(); // Remove query params
        
        // Fix truncated path params: {filter -> {filter}, {id -> {id}
        // Confluence sometimes splits/truncates path params across elements
        url = url.replace(/\{([^}]*)$/, (_, param) => (param ? `{${param}}` : ''));
        
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
function extractStructuredJSON(text: string, startKeyword: string): ExtractedJSONSnippet {
  const raw = extractRawJSONBlock(text, startKeyword);
  if (!raw) {
    return {
      raw: null,
      value: null,
      partialValue: null,
      isTruncated: false,
    };
  }

  const parsed = parseJSONWithComments(raw);
  const isTruncated = hasTruncationMarker(raw);
  const partialValue = isTruncated ? parsePartialJSON(raw) : null;

  return {
    raw,
    value: parsed ?? partialValue,
    partialValue,
    isTruncated,
  };
}

function extractStructuredJSONFromKeywords(
  text: string,
  keywords: string[],
): ExtractedJSONSnippet {
  for (const keyword of keywords) {
    const snippet = extractStructuredJSON(text, keyword);
    if (snippet.raw) {
      return snippet;
    }
  }

  return {
    raw: null,
    value: null,
    partialValue: null,
    isTruncated: false,
  };
}

function extractRawJSONBlock(text: string, startKeyword: string): string | null {
  const startIndex = text.indexOf(startKeyword);
  if (startIndex === -1) return null;

  const objectStart = text.indexOf('{', startIndex);
  const arrayStart = text.indexOf('[', startIndex);
  const jsonStart = getFirstJSONStart(objectStart, arrayStart);
  if (jsonStart === -1) return null;

  const stack: string[] = [];
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
      stack.push('}');
    } else if (char === '[') {
      stack.push(']');
    } else if (char === '}' || char === ']') {
      if (stack.length === 0 || stack[stack.length - 1] !== char) {
        return null;
      }

      stack.pop();
      if (stack.length === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
  }

  if (jsonEnd === -1) return null;

  return text.substring(jsonStart, jsonEnd);
}

function getFirstJSONStart(objectStart: number, arrayStart: number): number {
  if (objectStart === -1) return arrayStart;
  if (arrayStart === -1) return objectStart;
  return Math.min(objectStart, arrayStart);
}

function parseJSONWithComments(jsonStr: string): unknown | null {
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

function hasTruncationMarker(jsonStr: string): boolean {
  return jsonStr
    .split('\n')
    .some(line => /^\s*\.{3,},?\s*$/.test(line));
}

function parsePartialJSON(jsonStr: string): unknown | null {
  const withoutMarkers = jsonStr
    .split('\n')
    .filter(line => !/^\s*\.{3,},?\s*$/.test(line))
    .join('\n');

  const withoutTrailingCommas = stripTrailingCommas(withoutMarkers);
  return parseJSONWithComments(withoutTrailingCommas);
}

function stripTrailingCommas(jsonStr: string): string {
  let current = jsonStr;
  let previous = '';

  while (current !== previous) {
    previous = current;
    current = current.replace(/,\s*([}\]])/g, '$1');
  }

  return current;
}

async function resolveResponseSnippet(
  endpoint: MockEndpoint,
  snippet: ExtractedJSONSnippet,
  options: ParseERDOptions,
): Promise<unknown | undefined> {
  if (!snippet.raw) {
    return undefined;
  }

  if (!snippet.isTruncated) {
    return snippet.value ?? undefined;
  }

  return hydrateTruncatedResponse(endpoint, snippet.partialValue, options);
}

async function hydrateTruncatedResponse(
  endpoint: MockEndpoint,
  documentedResponse: unknown | null,
  options: ParseERDOptions,
): Promise<unknown | undefined> {
  if (!options.fallbackBaseUrl) {
    console.warn(
      `[WARN] Truncated response for ${endpoint.method} ${endpoint.path} has no fallback URL. Using documented fields only.`
    );
    return documentedResponse ?? undefined;
  }

  try {
    const fallbackResponse = await fetchFallbackEndpointResponse(
      options.fallbackBaseUrl,
      endpoint.path,
      endpoint.method,
    );

    if (documentedResponse === null || documentedResponse === undefined) {
      return fallbackResponse;
    }

    return mergeMissingFields(fallbackResponse, documentedResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(
      `[WARN] Failed to hydrate truncated response for ${endpoint.method} ${endpoint.path}: ${message}`
    );
    return documentedResponse ?? undefined;
  }
}

function mergeMissingFields(base: unknown, documented: unknown): unknown {
  if (base === undefined) return documented;
  if (Array.isArray(base) && Array.isArray(documented)) {
    if (base.length === 0) return documented;
    if (documented.length === 0) return base;

    const [first, ...rest] = base;
    return [mergeMissingFields(first, documented[0]), ...rest];
  }

  if (isPlainObject(base) && isPlainObject(documented)) {
    const result: Record<string, unknown> = { ...base };

    for (const [key, value] of Object.entries(documented)) {
      if (!(key in result)) {
        result[key] = value;
        continue;
      }

      result[key] = mergeMissingFields(result[key], value);
    }

    return result;
  }

  return base;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
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
