This guide describes how to install the JSON Schema Viewer as a React component into a Backstage instance.

## Prerequisites

Backstage projects typically use **Yarn** for dependency management. If you don't have Yarn installed, you can enable it (on Node.js 16.10+) or install it via npm:

```bash
# Recommended for modern Node.js versions
corepack enable

# Fallback/Classic method
npm install --global yarn
```

You can verify it's installed by running `yarn --version`.


## Automated Installation

The `backstage-installation-script/` folder contains a self-sustained Node application to automate the installation.

1. Ensure you have the `backstage-installation-script` folder in your repository.
2. Run the installer from the `backstage-installation-script/` folder:
   ```bash
   cd backstage-installation-script
   npm install
   npm run install-viewer -- /path/to/backstage
   ```

The script will:
- Run `yarn add @miman/json-schema-viewer-react` (or `npm install` as fallback) in the Backstage directory.
- Copy `backstage-installation-script/src/SchemaViewer.tsx` to `packages/app/src/components/catalog/SchemaViewer.tsx`.
- **Automate code edits**: Register the custom renderer in `App.tsx` or `apis.ts` and add the Schema tab to `EntityPage.tsx`.

## Manual Installation

If you prefer to perform the steps manually:

### 1. Fetching the Backstage Repo

If you don't already have a Backstage repository, you can create one using the official CLI:

```bash
npx @backstage/create-app@latest
```

Follow the prompts to set up your app.

### 2. Installing the Viewer into Backstage

1. Navigate to your Backstage repository root.
2. Install the package using `yarn` (recommended for Backstage) or `npm`:
   ```bash
   yarn add @miman/json-schema-viewer-react
   # OR
   npm install @miman/json-schema-viewer-react
   ```
3. Copy the `backstage-installation-script/src/SchemaViewer.tsx` file from this repository to `packages/app/src/components/catalog/SchemaViewer.tsx` in your Backstage app.

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

## 5. Adding a Custom Schema Tab (Optional)

While the default registration above handles the **Definition** tab for APIs, you might want to add a dedicated "Schema" tab to other entity types or as a top-level tab.

In `packages/app/src/components/catalog/EntityPage.tsx`:

```tsx
import { EntitySchemaViewer } from './SchemaViewer';

// ... inside your entity page component (e.g., serviceEntityPage or apiPage)
const mySchema = { /* Your JSON Schema object here */ };

const apiPage = (
  <EntityLayout>
    <EntityLayout.Item title="Overview">
      {/* ... */}
    </EntityLayout.Item>

    <EntityLayout.Item title="Schema">
      <EntitySchemaViewer schema={mySchema} />
    </EntityLayout.Item>
  </EntityLayout>
);
```

> [!IMPORTANT]
> Ensure that the `schema` prop passed to `EntitySchemaViewer` is a valid JSON Schema object. If you are fetching it from the entity metadata, you might use something like `entity.metadata.annotations?.['your-schema-annotation']`.

> [!TIP]
> Since Backstage uses Material UI, you might want to wrap the `SchemaViewer` in a Backstage `Content` or `InfoCard` for better visual integration.
