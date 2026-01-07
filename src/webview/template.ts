/**
 * Generates the HTML content for the webview.
 *
 * @param {any} schema The JSON schema to render.
 * @param {string} nonce A random nonce for the Content Security Policy.
 * @param {string} scriptUri The URI to the bundled webview script.
 * @returns {string} The HTML content for the webview.
 */
import { getStyles } from './styles';

export function getHtmlTemplate(
  rootSchema: any,
  schemaBundle: { [key: string]: any },
  importedFileNames: string[],
  missingFileNames: string[],
  sourcePositions: { [key: string]: number },
  nonce: string,
  scriptUri: string
): string {
  const styles = getStyles();

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>JSON Schema Viewer</title>
    <style>
        ${styles}
    </style>
</head>
<body>
    <div class="schema-container" id="schemaContainer">
        <div class="loading">Loading schema...</div>
    </div>
    <script nonce="${nonce}">
        // Pass initial data to the webview bundle
        window.__INITIAL_SCHEMA__ = ${JSON.stringify(rootSchema)};
        window.__INITIAL_BUNDLE__ = ${JSON.stringify(schemaBundle)};
        window.__INITIAL_IMPORTED_FILES__ = ${JSON.stringify(importedFileNames)};
        window.__INITIAL_MISSING_FILES__ = ${JSON.stringify(missingFileNames)};
        window.__INITIAL_SOURCE_POSITIONS__ = ${JSON.stringify(sourcePositions)};
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
