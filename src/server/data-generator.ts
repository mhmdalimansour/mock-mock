import { faker } from '@faker-js/faker';

/**
 * Generates fake data based on a template object
 * Replaces string/number/boolean values with realistic fake data
 */
export function generateFakeData(template: unknown): unknown {
  if (template === null || template === undefined) {
    return template;
  }

  // Handle arrays
  if (Array.isArray(template)) {
    if (template.length === 0) {
      // Return empty array
      return [];
    }
    // Generate 2-3 items based on the first template item
    const itemCount = faker.number.int({ min: 2, max: 3 });
    return Array.from({ length: itemCount }, () => generateFakeData(template[0]));
  }

  // Handle objects
  if (typeof template === 'object') {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(template)) {
      result[key] = generateFakeDataForField(key, value);
    }
    
    return result;
  }

  // Primitive values
  return generatePrimitiveValue(template);
}

/**
 * Generates fake data for a specific field based on key name and value type
 */
function generateFakeDataForField(key: string, value: unknown): unknown {
  const lowerKey = key.toLowerCase();
  
  // Handle nested objects
  if (value !== null && typeof value === 'object') {
    return generateFakeData(value);
  }

  // String field inference
  if (typeof value === 'string') {
    // IDs
    if (lowerKey.includes('id') && !lowerKey.includes('title')) {
      return faker.number.int({ min: 1, max: 1000 });
    }
    
    // Names and titles
    if (lowerKey.includes('name') || lowerKey.includes('title')) {
      if (lowerKey.includes('company') || lowerKey.includes('store')) {
        return faker.company.name();
      }
      if (lowerKey.includes('category')) {
        return faker.commerce.department();
      }
      if (lowerKey.includes('product')) {
        return faker.commerce.productName();
      }
      return faker.lorem.words(2);
    }
    
    // Email
    if (lowerKey.includes('email')) {
      return faker.internet.email();
    }
    
    // URLs and images
    if (lowerKey.includes('url') || lowerKey.includes('link')) {
      return faker.internet.url();
    }
    if (lowerKey.includes('image') || lowerKey.includes('img') || lowerKey.includes('avatar')) {
      return faker.image.url();
    }
    
    // Descriptions
    if (lowerKey.includes('description') || lowerKey.includes('desc')) {
      return faker.lorem.sentence();
    }
    
    // Language codes
    if (lowerKey === 'en' || lowerKey === 'english') {
      return faker.lorem.words(2);
    }
    if (lowerKey === 'ar' || lowerKey === 'arabic') {
      return 'عربي'; // Generic Arabic text
    }
    
    // Default string
    return faker.lorem.word();
  }

  // Number field inference
  if (typeof value === 'number') {
    if (lowerKey.includes('count') || lowerKey.includes('total') || lowerKey.includes('quantity')) {
      return faker.number.int({ min: 0, max: 100 });
    }
    if (lowerKey.includes('price') || lowerKey.includes('cost') || lowerKey.includes('amount')) {
      return faker.number.float({ min: 0, max: 1000, fractionDigits: 2 });
    }
    if (lowerKey.includes('priority') || lowerKey.includes('order')) {
      return faker.number.int({ min: 1, max: 10 });
    }
    if (lowerKey.includes('id')) {
      return faker.number.int({ min: 1, max: 1000 });
    }
    return faker.number.int({ min: 1, max: 100 });
  }

  // Boolean field inference
  if (typeof value === 'boolean') {
    if (lowerKey.includes('error') || lowerKey.includes('failed')) {
      return false; // Default to success
    }
    return faker.datatype.boolean();
  }

  return value;
}

/**
 * Generates a primitive fake value based on type
 */
function generatePrimitiveValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return faker.lorem.word();
  }
  if (typeof value === 'number') {
    return faker.number.int({ min: 1, max: 100 });
  }
  if (typeof value === 'boolean') {
    return faker.datatype.boolean();
  }
  return value;
}
