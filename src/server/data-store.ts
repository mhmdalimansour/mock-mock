import { faker } from '@faker-js/faker';
import { generateFakeData } from './data-generator';
import { MockEndpoint } from '../parser/schema-types';

interface Collection {
  items: Record<string, unknown>[];
  template: unknown;
}

/**
 * In-memory store that generates data once per server run.
 * Provides stateful GET / POST / PUT / PATCH / DELETE semantics.
 */
export class DataStore {
  private collections: Map<string, Collection> = new Map();

  /**
   * Scan the schema for GET-array endpoints and pre-generate 15-30 records
   * for each discovered collection. Called once on server start.
   */
  initFromSchema(schema: MockEndpoint[]): void {
    for (const endpoint of schema) {
      if (
        endpoint.method === 'GET' &&
        Array.isArray(endpoint.response) &&
        (endpoint.response as unknown[]).length > 0
      ) {
        const key = extractCollectionKey(endpoint.path);
        if (!this.collections.has(key)) {
          const template = (endpoint.response as unknown[])[0];
          const count = faker.number.int({ min: 15, max: 30 });
          const items = Array.from({ length: count }, (_, i) => {
            const item = generateFakeData(template) as Record<string, unknown>;
            const idField = findIdField(item) ?? 'id';
            item[idField] = i + 1;
            return item;
          });
          this.collections.set(key, { items, template });
        }
      }
    }
  }

  hasCollection(key: string): boolean {
    return this.collections.has(key);
  }

  getCollection(key: string): Record<string, unknown>[] | null {
    return this.collections.get(key)?.items ?? null;
  }

  getItem(key: string, id: string | number): Record<string, unknown> | null {
    const col = this.collections.get(key);
    if (!col) return null;
    return col.items.find(item => matchesId(item, id)) ?? null;
  }

  addItem(key: string, body: Record<string, unknown>): Record<string, unknown> {
    const col = this.collections.get(key);
    if (!col) {
      const newItem: Record<string, unknown> = { id: 1, ...body };
      this.collections.set(key, { items: [newItem], template: body });
      return newItem;
    }
    const maxId = col.items.reduce((max, item) => {
      const f = findIdField(item);
      const v = f ? Number(item[f]) : 0;
      return Math.max(max, isNaN(v) ? 0 : v);
    }, 0);
    const newItem = {
      ...(generateFakeData(col.template) as Record<string, unknown>),
      ...body,
    };
    const idField = findIdField(newItem) ?? 'id';
    newItem[idField] = maxId + 1;
    col.items.push(newItem);
    return newItem;
  }

  updateItem(
    key: string,
    id: string | number,
    updates: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const col = this.collections.get(key);
    if (!col) return null;
    const idx = col.items.findIndex(item => matchesId(item, id));
    if (idx === -1) return null;
    col.items[idx] = { ...col.items[idx], ...updates };
    // Ensure the ID field stays intact
    const idField = findIdField(col.items[idx]) ?? 'id';
    col.items[idx][idField] = coerceId(id);
    return col.items[idx];
  }

  deleteItem(key: string, id: string | number): boolean {
    const col = this.collections.get(key);
    if (!col) return false;
    const idx = col.items.findIndex(item => matchesId(item, id));
    if (idx === -1) return false;
    col.items.splice(idx, 1);
    return true;
  }
}

/**
 * Derive a stable collection key from an endpoint path.
 * Returns the last non-parameter path segment.
 * Examples:
 *   /api/users          → "users"
 *   /api/users/{id}     → "users"
 *   /api/users/:id      → "users"
 *   /api/users/:id/posts → "posts"
 */
export function extractCollectionKey(path: string): string {
  const segments = path.replace(/^\//, '').split('/');
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (!seg.startsWith(':') && !seg.startsWith('{')) {
      return seg;
    }
  }
  return path;
}

function findIdField(item: Record<string, unknown>): string | null {
  if ('id' in item) return 'id';
  const key = Object.keys(item).find(
    k => k.toLowerCase() === 'id' || k.toLowerCase().endsWith('id'),
  );
  return key ?? null;
}

function matchesId(item: Record<string, unknown>, id: string | number): boolean {
  const field = findIdField(item);
  if (!field) return false;
  return String(item[field]) === String(id);
}

function coerceId(id: string | number): number | string {
  const n = Number(id);
  return isNaN(n) ? id : n;
}
