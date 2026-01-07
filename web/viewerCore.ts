export type SchemaBundle = Record<string, any>;

function getBasename(posixOrUrlPath: string): string {
  const lastSlash = Math.max(posixOrUrlPath.lastIndexOf('/'), posixOrUrlPath.lastIndexOf('\\'));
  return lastSlash >= 0 ? posixOrUrlPath.slice(lastSlash + 1) : posixOrUrlPath;
}

export function hasRemoteRef(obj: any): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const value = obj[key];
    if (key === '$ref' && typeof value === 'string' && value.includes('.json')) {
      return true;
    }
    if (hasRemoteRef(value)) {
      return true;
    }
  }

  return false;
}

/**
 * Resolves a $ref pointer.
 * Supports:
 * - local refs: "#/..."
 * - file refs: "other.schema.json"
 * - file + pointer: "other.schema.json#/$defs/X"
 */
export function resolveRef(schema: any, rootSchema: any, bundle: SchemaBundle): any {
  if (!schema || !schema.$ref) {
    return schema || {};
  }

  const ref: string = schema.$ref;
  const loadedSchemas = bundle || {};

  let resolved: any = null;
  let isImport = false;

  // file + local pointer
  if (ref.includes('.json#/')) {
    const [filePart, localRefRaw] = ref.split('#');
    const fileKey = getBasename(filePart);
    const externalSchema = loadedSchemas[fileKey];

    if (!externalSchema) {
      return { $ref: ref, __isMissing: true };
    }

    let current: any = externalSchema;
    const parts = (localRefRaw || '').split('/').slice(1);
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return { $ref: ref, __isMissing: true };
      }
    }

    resolved = current;
    isImport = true;
  }
  // file only
  else if (ref.includes('.json')) {
    const fileKey = getBasename(ref.split('#')[0]);
    resolved = loadedSchemas[fileKey];
    if (!resolved) {
      return { $ref: ref, __isMissing: true };
    }
    isImport = true;
  }
  // local ref
  else if (ref.startsWith('#/')) {
    let current: any = rootSchema;
    const parts = ref.split('/').slice(1);
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return { $ref: ref, __isMissing: true };
      }
    }
    resolved = current;
  }

  if (resolved && isImport) {
    const cloned = { ...resolved };
    Object.defineProperty(cloned, '__isImported', { value: true, enumerable: false });
    return cloned;
  }

  return resolved || schema;
}

export function getType(prop: any): string {
  if (!prop) return 'any';
  if (prop.__isMissing) return 'missing';
  if (prop.$ref) return 'ref';
  if (prop.type) {
    return Array.isArray(prop.type) ? prop.type.join(' | ') : prop.type;
  }
  if (prop.enum) return 'enum';
  if (prop.oneOf) return 'oneOf';
  if (prop.anyOf) return 'anyOf';
  if (prop.allOf) return 'allOf';
  if (prop.properties) return 'object';
  if (prop.items) return 'array';
  return 'any';
}

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

export function generateExampleValue(prop: any, rootSchema: any, bundle: SchemaBundle, visitedRefs: Set<string>): any {
  if (!prop) return null;

  if (prop.$ref) {
    if (visitedRefs.has(prop.$ref)) {
      return '...';
    }
    visitedRefs.add(prop.$ref);
    const resolved = resolveRef(prop, rootSchema, bundle);
    const result = generateExampleValue(resolved, rootSchema, bundle, visitedRefs);
    visitedRefs.delete(prop.$ref);
    return result;
  }

  if (prop.example !== undefined) return prop.example;
  if (prop.default !== undefined) return prop.default;
  if (prop.enum && prop.enum.length > 0) return prop.enum[0];
  if (prop.const !== undefined) return prop.const;

  if (prop.oneOf && prop.oneOf.length > 0) {
    return generateExampleValue(prop.oneOf[0], rootSchema, bundle, visitedRefs);
  }
  if (prop.anyOf && prop.anyOf.length > 0) {
    return generateExampleValue(prop.anyOf[0], rootSchema, bundle, visitedRefs);
  }

  if (prop.allOf && prop.allOf.length > 0) {
    let merged: any = {};
    for (const subSchema of prop.allOf) {
      const resolved = resolveRef(subSchema, rootSchema, bundle);
      if (resolved.properties) {
        const subExample = generateExampleValue(resolved, rootSchema, bundle, visitedRefs);
        merged = { ...merged, ...subExample };
      }
    }
    return merged;
  }

  const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;

  switch (type) {
    case 'object': {
      if (prop.properties) {
        const obj: Record<string, any> = {};
        for (const [key, value] of Object.entries(prop.properties)) {
          obj[key] = generateExampleValue(value, rootSchema, bundle, visitedRefs);
        }
        return obj;
      }
      return {};
    }

    case 'array': {
      if (prop.items) {
        const itemExample = generateExampleValue(prop.items, rootSchema, bundle, visitedRefs);
        return [itemExample];
      }
      return [];
    }

    case 'string': {
      if (prop.format === 'date-time') return new Date().toISOString();
      if (prop.format === 'date') return new Date().toISOString().split('T')[0];
      if (prop.format === 'time') return '12:00:00';
      if (prop.format === 'email') return 'user@example.com';
      if (prop.format === 'uri' || prop.format === 'url') return 'https://example.com';
      if (prop.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
      if (prop.minLength) return 'x'.repeat(prop.minLength);
      return 'string';
    }

    case 'number':
    case 'integer': {
      if (prop.minimum !== undefined) return prop.minimum;
      if (prop.maximum !== undefined) return prop.maximum;
      return type === 'integer' ? 0 : 0.0;
    }

    case 'boolean':
      return true;

    case 'null':
      return null;

    default: {
      if (prop.properties) {
        const obj: Record<string, any> = {};
        for (const [key, value] of Object.entries(prop.properties)) {
          obj[key] = generateExampleValue(value, rootSchema, bundle, visitedRefs);
        }
        return obj;
      }
      if (prop.items) {
        return [generateExampleValue(prop.items, rootSchema, bundle, visitedRefs)];
      }
      return null;
    }
  }
}

export function syntaxHighlightJson(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\\"])*")(\s*:)?/g, match => {
      let cls = 'json-string';
      if (/:$/.test(match)) {
        cls = 'json-key';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    })
    .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
    .replace(/\bnull\b/g, '<span class="json-null">null</span>')
    .replace(/\b(-?\d+(\.\d+)?([eE][+-]?\d+)?)\b/g, '<span class="json-number">$1</span>');
}

export function escapeHtml(text: unknown): string {
  if (typeof text !== 'string') return String(text ?? '');
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
