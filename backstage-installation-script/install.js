const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Backstage Installer for JSON Schema Viewer
 * 
 * Usage: npm run install-viewer <backstage-root-path>
 */

const backstageRoot = process.argv[2];

if (!backstageRoot) {
  console.error('Error: Please provide the path to the Backstage root directory.');
  console.error('Usage: npm run install-viewer <backstage-root-path>');
  process.exit(1);
}

const resolvedBackstageRoot = path.resolve(backstageRoot);

if (!fs.existsSync(resolvedBackstageRoot)) {
  console.error(`Error: Backstage root directory does not exist: ${resolvedBackstageRoot}`);
  process.exit(1);
}

const SCRIPT_DIR = __dirname;
const SRC_DIR = path.join(SCRIPT_DIR, 'src');

async function run() {
  try {
    console.log('--- Starting Backstage Integration for JSON Schema Viewer ---');

    // 1. Copy SchemaViewer.tsx component
    console.log('Copying SchemaViewer.tsx to Backstage components...');
    const componentTargetDir = path.join(resolvedBackstageRoot, 'packages/app/src/components/catalog');
    if (!fs.existsSync(componentTargetDir)) {
      fs.mkdirSync(componentTargetDir, { recursive: true });
    }
    const componentSource = path.join(SRC_DIR, 'SchemaViewer.tsx');
    if (fs.existsSync(componentSource)) {
      fs.copyFileSync(componentSource, path.join(componentTargetDir, 'SchemaViewer.tsx'));
    } else {
      console.warn('Warning: SchemaViewer.tsx not found in src folder. Skipping.');
    }

    // 2. Run yarn add in backstage root
    const packageName = '@miman/json-schema-viewer-react';
    console.log(`Running 'yarn add ${packageName}' in Backstage root...`);
    try {
      execSync(`yarn add ${packageName}`, { cwd: resolvedBackstageRoot, stdio: 'inherit' });
    } catch (installError) {
      console.warn('Warning: yarn add failed. Attempting npm install as fallback...');
      execSync(`npm install ${packageName}`, { cwd: resolvedBackstageRoot, stdio: 'inherit' });
    }

    // 5. Automate configuration edits
    console.log('Automating Backstage configuration...');
    await automateConfig(resolvedBackstageRoot);

    console.log('--- Installation and Configuration Complete! ---');
    console.log('\nNext Steps:');
    console.log('1. Verify the "Definition" tab on an API entity with spec.type: jsonSchema');
    console.log('2. Restart your Backstage app.');

  } catch (error) {
    console.error('An error occurred during installation:', error);
    process.exit(1);
  }
}

async function automateConfig(backstageRoot) {
  const APIS_PATH = path.join(backstageRoot, 'packages/app/src/apis.ts');
  const APP_PATH = path.join(backstageRoot, 'packages/app/src/App.tsx');
  const ENTITY_PAGE_PATH = path.join(backstageRoot, 'packages/app/src/components/catalog/EntityPage.tsx');

  // Helper to edit files
  const editFile = (filePath, editFn) => {
    if (!fs.existsSync(filePath)) return false;
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = editFn(content);
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated: ${filePath}`);
      return true;
    }
    return false;
  };

  // Register Renderer Logic
  const registerRenderer = (content) => {
    let newContent = content;
    if (!newContent.includes("'@backstage/plugin-api-docs'")) {
      newContent = "import { apiDocsConfigRef } from '@backstage/plugin-api-docs';\n" + newContent;
    }
    if (!newContent.includes("'./components/catalog/SchemaViewer'")) {
      newContent = "import { EntitySchemaViewer } from './components/catalog/SchemaViewer';\n" + newContent;
    }

    const factoryBlock = `
  createApiFactory({
    api: apiDocsConfigRef,
    deps: {},
    factory: () => {
      const config = new ApiDocsConfig();
      config.registerRenderer({
        type: 'jsonSchema',
        component: (definition) => (
          <EntitySchemaViewer schema={JSON.parse(definition)} />
        ),
      });
      return config;
    },
  }),`;

    if ((newContent.includes('const apis = [') || newContent.includes('export const apis = [')) && !newContent.includes('type: \'jsonSchema\'')) {
      newContent = newContent.replace(/const apis = \[|export const apis = \[/, (match) => `${match}${factoryBlock}`);
    }
    return newContent;
  };

  if (!editFile(APIS_PATH, registerRenderer)) {
    editFile(APP_PATH, registerRenderer);
  }
}

run();
