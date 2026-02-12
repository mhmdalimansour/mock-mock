# Contributing to MockMock

## Project Structure

### Core Modules

1. **CLI Layer** (`src/cli.ts`)
   - Commander.js integration
   - Argument parsing
   - Error handling

2. **Fetcher Layer** (`src/fetcher/`)
   - Confluence HTTP client
   - Authentication handling
   - Response processing

3. **Parser Layer** (`src/parser/`)
   - HTML parsing with Cheerio
   - Endpoint extraction
   - Schema normalization
   - Validation

4. **Server Layer** (`src/server/`)
   - Express setup
   - Dynamic route registration
   - Response handling

## Adding New Features

### Adding a New HTTP Method

1. Update `MockEndpoint` in `schema-types.ts`:
   ```typescript
   method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
   ```

2. Update parser regex in `erd-parser.ts`:
   ```typescript
   const methodPathRegex = /^(GET|POST|PUT|DELETE|PATCH)\s+(\/[^\s\n]*)/im;
   ```

3. Add handler in `mock-server.ts`:
   ```typescript
   case 'PATCH':
     app.patch(path, handler);
     break;
   ```

### Adding Request Validation

Extend `MockEndpoint` with schema:

```typescript
interface MockEndpoint {
  // ... existing fields
  requestSchema?: JSONSchema;
}
```

### Adding Response Generation

Use `@faker-js/faker` in `mock-server.ts`:

```typescript
import { faker } from '@faker-js/faker';

function generateMockData(schema: unknown) {
  // Generate fake data based on schema
}
```

## Code Quality Standards

- ✅ TypeScript strict mode
- ✅ No `any` types (use `unknown`)
- ✅ Async/await (no callbacks)
- ✅ Error boundaries at layer boundaries
- ✅ Single responsibility per module
- ✅ Interface-based communication

## Testing Locally

```bash
# Test with local HTML
npm run dev -- --url file://$(pwd)/example-confluence.html

# Test build
npm run build
node dist/cli.js --url file://$(pwd)/example-confluence.html
```

## Architecture Principles

1. **Separation of Concerns**: Each layer has one job
2. **Schema Contract**: All layers communicate via `MockSchema`
3. **No Side Effects**: Functions are pure where possible
4. **Fail Gracefully**: Invalid data is skipped, not crashed
5. **Type Safety**: Leverage TypeScript fully

## Common Patterns

### Error Handling

```typescript
try {
  // Operation
} catch (error) {
  if (error instanceof SpecificError) {
    // Handle specifically
  }
  throw new Error(`Context: ${error.message}`);
}
```

### Parsing

```typescript
// Always validate before using
const match = text.match(regex);
if (!match) return null;

// Always try/catch JSON parsing
try {
  const data = JSON.parse(match[1]);
} catch {
  // Skip invalid JSON
}
```

### Type Guards

```typescript
function isValidEndpoint(obj: unknown): obj is MockEndpoint {
  // Runtime validation
}
```
