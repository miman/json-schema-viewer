/**
 * Resolves a $ref pointer to its definition.
 * @param {any} schema The schema object to resolve.
 * @param {any} rootSchema The root schema.
 * @returns {any} The resolved schema object.
 */
export function resolveRef(schema: any, rootSchema: any): any {
    if (!schema || !schema.$ref) {
        return schema || {};
    }

    const ref = schema.$ref;
    if (ref.startsWith('#/definitions/')) {
        const defName = ref.substring('#/definitions/'.length);
        return rootSchema.definitions?.[defName] || schema;
    }
    if (ref.startsWith('#/$defs/')) {
        const defName = ref.substring('#/$defs/'.length);
        return rootSchema.$defs?.[defName] || schema;
    }

    return schema;
}

/**
 * Determines the type of a schema property.
 * @param {any} prop The property object.
 * @returns {string} The type of the property.
 */
export function getType(prop: any): string {
    if (!prop) return 'any';
    if (prop.$ref) return 'ref';
    if (prop.type) {
        if (Array.isArray(prop.type)) {
            return prop.type.join(' | ');
        }
        return prop.type;
    }
    if (prop.enum) return 'enum';
    if (prop.oneOf) return 'oneOf';
    if (prop.anyOf) return 'anyOf';
    if (prop.allOf) return 'allOf';
    if (prop.properties) return 'object';
    if (prop.items) return 'array';
    return 'any';
}

/**
 * Checks if a property has nested content that can be expanded.
 * @param {any} prop The property object.
 * @returns {boolean} True if the property has nested content.
 */
export function hasNestedContent(prop: any): boolean {
    if (!prop) return false;
    return !!(
        prop.properties ||
        prop.items ||
        prop.oneOf ||
        prop.anyOf ||
        prop.allOf ||
        prop.description ||
        prop.enum ||
        prop.default !== undefined ||
        prop.example !== undefined ||
        prop.format ||
        prop.pattern ||
        prop.minimum !== undefined ||
        prop.maximum !== undefined ||
        prop.minLength !== undefined ||
        prop.maxLength !== undefined
    );
}

/**
 * Generates an example value from a schema property.
 * @param {any} prop The property object.
 * @param {any} rootSchema The root schema.
 * @param {Set<string>} visitedRefs A set of visited $refs to prevent circular recursion.
 * @returns {any} An example value.
 */
export function generateExampleValue(prop: any, rootSchema: any, visitedRefs: Set<string>): any {
    if (!prop) return null;

    // Resolve $ref
    if (prop.$ref) {
        if (visitedRefs.has(prop.$ref)) {
            return '...';
        }
        visitedRefs.add(prop.$ref);
        const resolved = resolveRef(prop, rootSchema);
        const result = generateExampleValue(resolved, rootSchema, visitedRefs);
        visitedRefs.delete(prop.$ref);
        return result;
    }

    // Use example if provided
    if (prop.example !== undefined) {
        return prop.example;
    }

    // Use default if provided
    if (prop.default !== undefined) {
        return prop.default;
    }

    // Use first enum value if available
    if (prop.enum && prop.enum.length > 0) {
        return prop.enum[0];
    }

    // Use const if available
    if (prop.const !== undefined) {
        return prop.const;
    }

    // Handle oneOf/anyOf - use first option
    if (prop.oneOf && prop.oneOf.length > 0) {
        return generateExampleValue(prop.oneOf[0], rootSchema, visitedRefs);
    }
    if (prop.anyOf && prop.anyOf.length > 0) {
        return generateExampleValue(prop.anyOf[0], rootSchema, visitedRefs);
    }

    // Handle allOf - merge all schemas
    if (prop.allOf && prop.allOf.length > 0) {
        let merged = {};
        for (const subSchema of prop.allOf) {
            const resolved = resolveRef(subSchema, rootSchema);
            if (resolved.properties) {
                const subExample = generateExampleValue(resolved, rootSchema, visitedRefs);
                merged = { ...merged, ...subExample };
            }
        }
        return merged;
    }

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
            if (prop.format === 'date-time') return new Date().toISOString();
            if (prop.format === 'date') return new Date().toISOString().split('T')[0];
            if (prop.format === 'time') return '12:00:00';
            if (prop.format === 'email') return 'user@example.com';
            if (prop.format === 'uri' || prop.format === 'url') return 'https://example.com';
            if (prop.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
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
            // Try to infer from properties
            if (prop.properties) {
                const obj: {[key: string]: any} = {};
                for (const [key, value] of Object.entries(prop.properties)) {
                    obj[key] = generateExampleValue(value, rootSchema, visitedRefs);
                }
                return obj;
            }
            if (prop.items) {
                return [generateExampleValue(prop.items, rootSchema, visitedRefs)];
            }
            return null;
    }
}

/**
 * Basic syntax highlighting for JSON.
 * @param {string} json The JSON string.
 * @returns {string} HTML string with syntax highlighting.
 */
export function syntaxHighlightJson(json: string): string {
    return json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/("(\s*\\u[a-zA-Z0-9]{4}|\\s*\\\\\[^u]\\s*|[^\\\\\"])*")(\s*:)?/g, function (match) {
            let cls = 'json-string';
            if (/:$/.test(match)) {
                cls = 'json-key';
            }
            return '<span class=\"'+ cls +'\">' + match + '</span>';
        })
        .replace(/\b(true|false)\b/g, '<span class=\"json-boolean\">$1</span>')
        .replace(/\bnull\b/g, '<span class=\"json-null\">null</span>')
        .replace(/\b(-?\d+(\.\d+)?([eE][+-]?\d+)?)\b/g, '<span class=\"json-number\">$1</span>');
}
