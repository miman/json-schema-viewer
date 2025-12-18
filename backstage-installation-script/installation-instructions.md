# Backstage Installation Guide

This guide describes how to install the JSON Schema Viewer as a React component into a Backstage instance.

## Automated Installation

The `scripts/` folder contains a self-sustained Node application to automate the installation.

1. Build and pack the package:
   ```bash
   npm run build:pack
   ```
2. Move the generated `.tgz` file (found in the `web/` folder) to the `backstage-installation-script/` folder of the `json-schema-viewer` repository.
3. Run the installer from the `backstage-installation-script/` folder:
   ```bash
   cd backstage-installation-script
   npm install
   npm run install-viewer -- /path/to/backstage
   ```

The script will:
- Copy the `.tgz` to your Backstage root.
- Run `npm install` on the package in the Backstage directory.
- Copy `backstage-installation-script/src/SchemaViewer.tsx` to `packages/app/src/components/catalog/SchemaViewer.tsx`.
- **Automate code edits**: Register the custom renderer in `App.tsx` or `apis.ts` and add the Schema tab to `EntityPage.tsx`.

## Manual Installation

If you prefer to perform the steps manually:

### 1. Building the Package

1. Navigate to the root of the `json-schema-viewer` repository.
2. Build the web component:
   ```bash
   npm run web:build
   ```
3. Navigate to the `web` directory and create the package:
   ```bash
   cd web
   npm pack
   ```
   This will generate a file like `miman-json-schema-viewer-react-1.0.0.tgz`.

### 2. Fetching the Backstage Repo

If you don't already have a Backstage repository, you can create one using the official CLI:

```bash
npx @backstage/create-app@latest
```

Follow the prompts to set up your app.

### 3. Installing the Viewer into Backstage

1. Copy the `.tgz` file generated in step 1 to your Backstage repository root.
2. Install it using `npm`:
   ```bash
   npm install ./miman-json-schema-viewer-react-1.0.0.tgz
   ```
3. Copy the `backstage-installation-script/src/SchemaViewer.tsx` file to `packages/app/src/components/catalog/SchemaViewer.tsx` in your Backstage app.

## 4. Configuration for `kind: API` and `jsonSchema`

You can configure Backstage to use this viewer for entities of `kind: API` when their `spec.type` is set to `jsonSchema`. This will make the viewer appear in the **Definition** tab of the API entity page.

### 1. Define the API Entity

In your `catalog-info.yaml`, set the `spec.type` to `jsonSchema`:

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: my-json-schema-api
  description: A sample JSON Schema API
spec:
  type: jsonSchema
  lifecycle: experimental
  owner: guest
  definition: |
    {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {
        "name": { "type": "string" }
      }
    }
```

### 2. Register the Custom Renderer

In your Backstage application (usually in `packages/app/src/App.tsx` or `packages/app/src/apis.ts`), register a custom renderer for the `jsonSchema` type.

```tsx
import { apiDocsConfigRef } from '@backstage/plugin-api-docs';
// Import the component we just installed
import { EntitySchemaViewer } from './components/catalog/SchemaViewer';

// ... in your App or API configuration
export const apis = [
  // ... other APIs
  createApiFactory({
    api: apiDocsConfigRef,
    deps: {},
    factory: () => {
      // Create a configuration that includes our custom renderer
      const config = new ApiDocsConfig(); // Note: check your Backstage version for the exact class name
      config.registerRenderer({
        type: 'jsonSchema',
        component: (definition) => (
          <EntitySchemaViewer schema={JSON.parse(definition)} />
        ),
      });
      return config;
    },
  }),
];
```

> [!NOTE]
> The exact registration method may vary depending on your Backstage version. Older versions might use `bind(apiDocsConfigRef).to(...)` in `apis.ts`.

## 5. Adding the Schema Tab to EntityPage

You can add a tab to your Entity Page to display a schema associated with an entity. For example, in `packages/app/src/components/catalog/EntityPage.tsx`:

```tsx
import { EntitySchemaViewer } from './SchemaViewer';

// ... inside your entity page definition
const apiPage = (
  <EntityLayout>
    <EntityLayout.Item title="Overview">
      <Grid container spacing={3}>
        {/* ... */}
      </Grid>
    </EntityLayout.Item>

    <EntityLayout.Item title="Schema">
      <EntitySchemaViewer schema={mySchemaObject} />
    </EntityLayout.Item>
  </EntityLayout>
);
```

> [!TIP]
> Since Backstage uses Material UI, you might want to wrap the `SchemaViewer` in a Backstage `Content` or `InfoCard` for better visual integration.
