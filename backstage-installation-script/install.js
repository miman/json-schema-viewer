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
    
    // 1. Add/Update Top-level Hotfix
    const hotfixBlock = `/* JSON-SCHEMA-VIEWER-HOTFIX-START */
if (typeof document !== 'undefined' && !document.getElementById('json-schema-viewer-styles')) {
  const style = document.createElement('style');
  style.id = 'json-schema-viewer-styles';
  style.textContent = [
    '.schema-container { ',
      '--bg-color: #1e1e1e; --text-color: #d4d4d4; --border-color: #3c3c3c;',
      '--header-bg: #252526; --type-string: #ce9178; --type-number: #b5cea8;',
      '--type-boolean: #569cd6; --type-array: #dcdcaa; --type-object: #4ec9b0;',
      '--type-null: #808080; --required-color: #d18616; --missing-color: #f14c4c;',
      '--description-color: #6a9955; --property-name: #9cdcfe; --expand-icon: #808080;',
      '--hover-bg: #2a2d2e;',
      'max-width: 1200px; margin: 0 auto; padding: 16px;',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
      'font-size: 13px; line-height: 1.5; color: var(--text-color);',
      'background-color: var(--bg-color); box-sizing: border-box; text-align: left;',
      'min-height: 500px;',
    '}',
    '.schema-container * { box-sizing: border-box; }',
    '.schema-header { background: var(--header-bg); padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid var(--border-color); }',
    '.schema-object { border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 8px; overflow: hidden; }',
    '.schema-object-header { display: flex; align-items: center; padding: 10px 12px; background: var(--header-bg); cursor: pointer; }',
    '.schema-object-content { display: none; padding: 12px; border-top: 1px solid var(--border-color); }',
    '.schema-object-content.expanded { display: block; }',
  ].join(' ');
  document.head.appendChild(style);
}
/* JSON-SCHEMA-VIEWER-HOTFIX-END */`;

    if (newContent.includes('/* JSON-SCHEMA-VIEWER-HOTFIX-START */')) {
      newContent = newContent.replace(
        /\/\* JSON-SCHEMA-VIEWER-HOTFIX-START \*\/[\s\S]*\/\* JSON-SCHEMA-VIEWER-HOTFIX-END \*\//,
        hotfixBlock
      );
    } else {
      newContent = hotfixBlock + "\n" + newContent;
    }

    // 2. Add imports
    const hasPluginApiDocs = /['"]@backstage\/plugin-api-docs['"]/.test(newContent);
    if (hasPluginApiDocs) {
      if (!newContent.includes('apiDocsConfigRef')) {
        newContent = newContent.replace(
          /import\s+\{(.*)\}\s+from\s+['"]@backstage\/plugin-api-docs['"]/g,
          "import {$1, apiDocsConfigRef, ApiDocsConfig, defaultRenderers} from '@backstage/plugin-api-docs'"
        );
      } else if (!newContent.includes('ApiDocsConfig')) {
        newContent = newContent.replace(
          /import\s+\{(.*)apiDocsConfigRef(.*)\}\s+from\s+['"]@backstage\/plugin-api-docs['"]/g,
          "import {$1apiDocsConfigRef$2, ApiDocsConfig, defaultRenderers} from '@backstage/plugin-api-docs'"
        );
      } else if (!newContent.includes('defaultRenderers')) {
        newContent = newContent.replace(
          /import\s+\{(.*)ApiDocsConfig(.*)\}\s+from\s+['"]@backstage\/plugin-api-docs['"]/g,
          "import {$1ApiDocsConfig$2, defaultRenderers} from '@backstage/plugin-api-docs'"
        );
      }
    } else {
      newContent = "import { apiDocsConfigRef, ApiDocsConfig, defaultRenderers } from '@backstage/plugin-api-docs';\n" + newContent;
    }

    if (!newContent.includes("'./components/catalog/SchemaViewer'")) {
      newContent = "import { EntitySchemaViewer } from './components/catalog/SchemaViewer';\n" + newContent;
    }

    if (!newContent.includes("import React")) {
      newContent = "import React from 'react';\n" + newContent;
    }

    // 3. Add/Update Factory
    const factoryBlock = `
  /* JSON-SCHEMA-VIEWER-START */
  createApiFactory({
    api: apiDocsConfigRef,
    deps: {},
    factory: () => {
      const config = new ApiDocsConfig(defaultRenderers);
      config.registerRenderer({
        type: 'jsonSchema',
        component: (definition) => (
          React.createElement(EntitySchemaViewer, { schema: definition })
        ),
      });
      return config;
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
    
    return newContent;
  };



  if (!editFile(APIS_PATH, registerRenderer)) {
    editFile(APP_PATH, registerRenderer);
  }
}

run();
