# Backstage Integration

This guide shows how to use the JSON Schema Viewer as a React component in [Backstage](https://backstage.io/).

## Installation

The component is exported from the `web/react` directory. In a Backstage plugin, you can either:

1. **Copy the `web/` folder** into your Backstage plugin and import from there, or
2. **Publish as an npm package** (see below).

## Usage in Backstage

```tsx
import React, { useEffect, useState } from 'react';
import { SchemaViewer } from './web/react'; // adjust path as needed

export function MySchemaPage() {
  const [schema, setSchema] = useState<any>(null);

  useEffect(() => {
    // Fetch from your backend, catalog, or a URL
    fetch('/api/my-schema.json')
      .then(res => res.json())
      .then(setSchema);
  }, []);

  if (!schema) {
    return <div>Loading...</div>;
  }

  return (
    <SchemaViewer
      schema={schema}
      bundle={{}}               // optional: external $ref'd schemas keyed by filename
      importedFileNames={[]}    // optional: list of imported file names
      missingFileNames={[]}     // optional: list of files that couldn't be loaded
    />
  );
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `schema` | `any` | The root JSON Schema object to visualize |
| `bundle` | `Record<string, any>` | A map of external schemas by filename (for `$ref` resolution) |
| `importedFileNames` | `string[]` | Files referenced via `$ref` |
| `missingFileNames` | `string[]` | Files that could not be loaded |
| `className` | `string` | Optional CSS class for the container |

## Styling

The component injects its own `<style>` element on first render. If you need to customize, you can:

- Override CSS variables (see `src/webview/styles.ts` for the list)
- Import and call `ensureSchemaViewerStyles()` yourself and provide your own stylesheet

## Resolving External References

If your schema uses `$ref` to external files (e.g., `"$ref": "common_defs.schema.json#/$defs/Email"`), you need to load those files and pass them in the `bundle` prop:

```tsx
const bundle = {
  'common_defs.schema.json': commonDefsSchema,
  'address.schema.json': addressSchema,
};

<SchemaViewer schema={mainSchema} bundle={bundle} />
```

## Publishing as an npm package

To publish the React component separately:

1. Create a new package in `packages/json-schema-viewer-react/`
2. Move `web/` contents there
3. Add `react` and `react-dom` as peer dependencies
4. Publish to your npm registry

Example `package.json`:

```json
{
  "name": "@yourorg/json-schema-viewer-react",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  }
}
```
