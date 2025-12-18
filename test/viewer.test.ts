import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// --- Functions copied and adapted from src/webview/scripts.ts for testing ---

// This resolveRef is enhanced for testing to handle file refs, which the original does not.
function resolveRef(schema: any, rootSchema: any): any {
    if (!schema || !schema.$ref) {
        return schema || {};
    }

    const ref = schema.$ref;

    // Handle file-based refs with local pointers (e.g., "common_defs.schema.json#/$defs/EmailFormat")
    if (ref.includes('.json#/')) {
        const [fileName, localRef] = ref.split('#');
        const externalSchema = rootSchema.__mock_external_files?.[fileName];
        if (!externalSchema) return schema;

        let current = externalSchema;
        const parts = localRef.split('/').slice(1); // remove initial '/'
        for (const part of parts) {
            if (current[part]) {
                current = current[part];
            } else {
                return schema; // Path part not found
            }
        }
        return current;
    }

    // Handle file-only refs (e.g., "address.schema.json")
    if (ref.includes('.json')) {
        const fileName = ref.split('/').pop() as string;
        return rootSchema.__mock_external_files?.[fileName] || schema;
    }

    // Handle local refs (e.g., "#/$defs/myDef")
    if (ref.startsWith('#/')) {
        let current = rootSchema;
        const parts = ref.split('/').slice(1); // remove '#'
         for (const part of parts) {
            if (current[part]) {
                current = current[part];
            } else {
                return schema; // Path part not found
            }
        }
        return current;
    }

    return schema;
}

function generateExampleValue(prop: any, rootSchema: any, visitedRefs = new Set<string>()): any {
    if (!prop) return null;

    if (prop.$ref) {
        if (visitedRefs.has(prop.$ref)) {
            return '...'; // Circular reference detected
        }
        visitedRefs.add(prop.$ref);
        const resolved = resolveRef(prop, rootSchema);
        const result = generateExampleValue(resolved, rootSchema, visitedRefs);
        visitedRefs.delete(prop.$ref);
        return result;
    }

    if (prop.example !== undefined) return prop.example;
    if (prop.default !== undefined) return prop.default;
    if (prop.const !== undefined) return prop.const;
    if (prop.enum && prop.enum.length > 0) return prop.enum[0];

    if (prop.oneOf && prop.oneOf.length > 0) return generateExampleValue(prop.oneOf[0], rootSchema, visitedRefs);
    if (prop.anyOf && prop.anyOf.length > 0) return generateExampleValue(prop.anyOf[0], rootSchema, visitedRefs);

    const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;

    switch (type) {
        case 'object':
            if (prop.properties) {
                const obj: {[key: string]: any} = {};
                for (const [key, value] of Object.entries(prop.properties)) {
                    obj[key] = generateExampleValue(value, rootSchema, visitedRefs);
                }
                return obj;
            }
            return {};

        case 'array':
            if (prop.items) {
                const itemExample = generateExampleValue(prop.items, rootSchema, visitedRefs);
                return [itemExample];
            }
            return [];

        case 'string':
            if (prop.format === 'email') return 'user@example.com';
            if (prop.minLength) return 'x'.repeat(prop.minLength);
            return 'string';

        case 'number':
        case 'integer':
            if (prop.minimum !== undefined) return prop.minimum;
            if (prop.maximum !== undefined) return prop.maximum;
            return type === 'integer' ? 0 : 0.0;

        case 'boolean':
            return true;

        case 'null':
            return null;

        default:
             if (prop.properties) { // Treat as object if properties are present without type
                const obj: {[key: string]: any} = {};
                for (const [key, value] of Object.entries(prop.properties)) {
                    obj[key] = generateExampleValue(value, rootSchema, visitedRefs);
                }
                return obj;
            }
            return null;
    }
}

// --- Test Suite ---

describe('Schema Viewer Logic', () => {

    const examplesPath = path.join(__dirname, '..', 'examples');

    const personSchema = JSON.parse(fs.readFileSync(path.join(examplesPath, 'person.schema.json'), 'utf-8'));
    const addressSchema = JSON.parse(fs.readFileSync(path.join(examplesPath, 'address.schema.json'), 'utf-8'));
    const commonDefsSchema = JSON.parse(fs.readFileSync(path.join(examplesPath, 'common_defs.schema.json'), 'utf-8'));

    // Mock the file system for resolving external $refs
    const rootSchemaForTesting = {
        ...personSchema,
        __mock_external_files: {
            'common_defs.schema.json': commonDefsSchema,
            'address.schema.json': addressSchema,
        }
    };

    describe('resolveRef (test-enhanced version)', () => {
        it('should resolve local $defs', () => {
            const prop = { $ref: '#/$defs/EmailFormat' };
            const resolved = resolveRef(prop, commonDefsSchema);
            expect(resolved).toEqual(commonDefsSchema.$defs.EmailFormat);
        });

        it('should resolve external file refs', () => {
            const prop = { $ref: 'address.schema.json' };
            const resolved = resolveRef(prop, rootSchemaForTesting);
            expect(resolved.title).toBe('Adress');
        });

        it('should resolve external file refs with local pointers', () => {
            const prop = { $ref: 'common_defs.schema.json#/$defs/EmailFormat' };
            const resolved = resolveRef(prop, rootSchemaForTesting);
            expect(resolved.format).toBe('email');
        });
    });

    describe('generateExampleValue with real schemas', () => {

        it('should generate a complete example from person.schema.json', () => {
            const example = generateExampleValue(rootSchemaForTesting, rootSchemaForTesting);

            expect(example).toHaveProperty('firstName');
            expect(example.firstName).toBe('x'); // minLength: 1
            
            expect(example).toHaveProperty('age');
            expect(example.age).toBe(0); // minimum: 0
            
            expect(example).toHaveProperty('email');
            expect(example.email).toBe('user@example.com'); // from resolved ref with format: email
            
            expect(example).toHaveProperty('contactAddresses');
            expect(Array.isArray(example.contactAddresses)).toBe(true);
        });
        
        it('should correctly generate array items from resolved external ref', () => {
            const example = generateExampleValue(rootSchemaForTesting, rootSchemaForTesting);
            const address = example.contactAddresses[0];
            
            expect(address).toHaveProperty('gata');
            expect(address).toHaveProperty('postnummer');
            expect(address).toHaveProperty('stad');
        });

        it('should correctly generate properties for an object without explicit type', () => {
            const schema = {
                properties: {
                    a: { type: 'string' },
                    b: { type: 'number' }
                }
            };
            const example = generateExampleValue(schema, schema);
            expect(example).toEqual({ a: 'string', b: 0.0 });
        });
        
        it('should handle enum keyword by picking the first value', () => {
            const prop = commonDefsSchema.properties.typ;
            const example = generateExampleValue(prop, commonDefsSchema);
            expect(example).toBe('PRIVAT');
        });
    });
});
