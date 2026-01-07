/**
 * Webview entry point that uses the shared web/ rendering logic.
 * This eliminates code duplication between VS Code extension and standalone/Backstage versions.
 */
import type { SchemaBundle } from '../../web/viewerCore';
import { renderSchemaInto } from '../../web/viewerDom';

// VS Code API type declaration
declare function acquireVsCodeApi(): {
  postMessage(message: any): void;
  setState(state: any): void;
  getState(): any;
};

// Window globals set by the extension
declare global {
  interface Window {
    __INITIAL_SCHEMA__: any;
    __INITIAL_BUNDLE__: SchemaBundle;
    __INITIAL_IMPORTED_FILES__: string[];
    __INITIAL_MISSING_FILES__: string[];
    __INITIAL_SOURCE_POSITIONS__: { [key: string]: number };
  }
}

// Get VS Code API
const vscode = acquireVsCodeApi();

// Global state - initialize from window globals
let currentSchema: any = window.__INITIAL_SCHEMA__ || null;
let currentSchemaBundle: SchemaBundle = window.__INITIAL_BUNDLE__ || {};
let currentImportedFileNames: string[] = window.__INITIAL_IMPORTED_FILES__ || [];
let currentMissingFileNames: string[] = window.__INITIAL_MISSING_FILES__ || [];
let currentSourcePositions: { [key: string]: number } = window.__INITIAL_SOURCE_POSITIONS__ || {};
let currentView: 'normal' | 'tree' = 'normal';
let activeLinkEnabled: boolean = false;

// Initial render
renderSchemaView();

/**
 * Listen for messages from the extension to update the schema.
 */
window.addEventListener('message', event => {
  const message = event.data;
  if (message.command === 'updateSchema') {
    currentSchema = message.schema;
    currentSchemaBundle = message.bundle || {};
    currentImportedFileNames = message.importedFiles || [];
    currentMissingFileNames = message.missingFiles || [];
    currentSourcePositions = message.sourcePositions || {};
    renderSchemaView();
  } else if (message.command === 'highlightSourceLine') {
    if (activeLinkEnabled) {
      highlightElementAtLine(message.line);
    }
  }
});

/**
 * Renders the schema using the shared web/ rendering logic.
 */
function renderSchemaView(): void {
  const container = document.getElementById('schemaContainer');
  if (!container) {
    console.error('schemaContainer not found!');
    return;
  }

  renderSchemaInto(container, {
    schema: currentSchema,
    bundle: currentSchemaBundle,
    importedFileNames: currentImportedFileNames,
    missingFileNames: currentMissingFileNames,
    initialView: currentView,
    sourcePositions: currentSourcePositions,
    activeLinkEnabled: activeLinkEnabled,
    onActiveLinkChange: (enabled: boolean) => {
      activeLinkEnabled = enabled;
      // Re-render to update click handlers with new activeLinkEnabled value
      renderSchemaView();
    },
    onNavigateToSource: (line: number) => {
      if (activeLinkEnabled) {
        vscode.postMessage({
          command: 'navigateToSource',
          line: line
        });
      }
    }
  });
}

/**
 * Highlights an element that corresponds to a source line.
 * @param line The zero-based line number.
 */
function highlightElementAtLine(line: number): void {
  // Remove previous highlights
  document.querySelectorAll('.source-highlight').forEach(el => {
    el.classList.remove('source-highlight');
  });

  // Find elements with matching source line
  const elementsWithSourceLine = document.querySelectorAll('[data-source-line]');
  elementsWithSourceLine.forEach(el => {
    const elLine = parseInt((el as HTMLElement).dataset.sourceLine || '-1', 10);
    if (elLine === line) {
      el.classList.add('source-highlight');
    }
  });
}
