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

    // Remove the old hotfix, as it's no longer the correct approach
    newContent = newContent.replace(
      /\/\* JSON-SCHEMA-VIEWER-HOTFIX-START \*\/[\s\S]*\/\* JSON-SCHEMA-VIEWER-HOTFIX-END \*\//,
      ''
    );

    // 1. Add imports for the new renderer approach
    const importRegex = /from\s+['"]@backstage\/plugin-api-docs['"]/;
    if (importRegex.test(newContent)) {
      // If the import exists, modify it
      newContent = newContent.replace(
        importRegex,
        "from '@backstage/plugin-api-docs';\nimport { defaultDefinitionWidgets } from '@backstage/plugin-api-docs';"
      );
      // Clean up old imports if they are now duplicates
      newContent = newContent.replace(/,?\s*apiDocsConfigRef/g, '');
      newContent = newContent.replace(/,?\s*ApiDocsConfig/g, '');
      newContent = newContent.replace(/,?\s*defaultRenderers/g, '');
    } else {
      // If no import exists, add the correct ones
      newContent = "import { apiDocsConfigRef, defaultDefinitionWidgets } from '@backstage/plugin-api-docs';\n" + newContent;
    }

    if (!newContent.includes("'./components/catalog/SchemaViewer'")) {
      newContent = "import { EntitySchemaViewer } from './components/catalog/SchemaViewer';\n" + newContent;
    }

    if (!newContent.includes("import React")) {
      newContent = "import React from 'react';\n" + newContent;
    }
    
    // Ensure createApiFactory is imported
    if (!newContent.includes('createApiFactory')) {
        newContent = newContent.replace(
            /(import\s+{[^}]+)\s+from\s+(['"]@backstage\/core-plugin-api['"])/,
            '$1, createApiFactory $2'
        )
    }


    // 2. Add/Update Factory using the api-docs definition widget approach
    const factoryBlock = `
  /* JSON-SCHEMA-VIEWER-START */
  createApiFactory({
    api: apiDocsConfigRef,
    deps: {},
    factory: () => {
      const definitionWidgets = defaultDefinitionWidgets();
      return {
        getApiDefinitionWidget: (apiEntity) => {
          if (apiEntity.spec?.type === 'jsonSchema') {
            return {
              type: 'jsonSchema',
              title: 'JSON Schema',
              component: (definition) =>
                React.createElement(EntitySchemaViewer, { schema: definition }),
            };
          }
          return definitionWidgets.find(d => d.type === apiEntity.spec?.type);
        },
      };
    },
  }),
  /* JSON-SCHEMA-VIEWER-END */`;

    if (newContent.includes('/* JSON-SCHEMA-VIEWER-START */')) {
      newContent = newContent.replace(
        /\/\* JSON-SCHEMA-VIEWER-START \*\/[\s\S]*\/\* JSON-SCHEMA-VIEWER-END \*\//,
        factoryBlock
      );
    } else {
      const exportApisRegex = /(export\s+const\s+apis(?:\s*:\s*[^=]+)?\s*=\s*\[)/;
      const apisRegex = /(const\s+apis(?:\s*:\s*[^=]+)?\s*=\s*\[)/;

      if (exportApisRegex.test(newContent)) {
        newContent = newContent.replace(exportApisRegex, `$1${factoryBlock}`);
      } else if (apisRegex.test(newContent)) {
        newContent = newContent.replace(apisRegex, `$1${factoryBlock}`);
      }
    }
    
    // Remove empty import statements like `import {} from '...'`
    newContent = newContent.replace(/import\s+\{\s*\}\s+from\s+['"][^'"]+['"];?/g, '');
    
    return newContent.trim();
  };



  if (!editFile(APIS_PATH, registerRenderer)) {
    editFile(APP_PATH, registerRenderer);
  }
}

run();
