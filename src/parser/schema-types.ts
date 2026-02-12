/**
 * Core schema types for MockMock
 * This is the normalized contract between parser and server
 */

export interface MockEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  request?: unknown;
  response: unknown;
  status?: number;
}

export type MockSchema = MockEndpoint[];
