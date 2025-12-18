/**
 * Generates the HTML content for the webview.
 *
 * @param {any} schema The JSON schema to render.
 * @param {string} nonce A random nonce for the Content Security Policy.
 * @returns {string} The HTML content for the webview.
 */
import { getScripts } from './scripts';
import { getStyles } from './styles';

export function getHtmlTemplate(rootSchema: any, schemaBundle: {[key: string]: any}, importedFileNames: string[], missingFileNames: string[], nonce: string): string {
  const styles = getStyles();
  const scripts = getScripts();

  const importedFilesHtml = importedFileNames.length > 0
    ? `
    <h2 class="section-title">Imported files</h2>
    <div class="imported-files-container">
        <ul>
            ${importedFileNames.map(name => {
              const isMissing = missingFileNames.includes(name);
              return `<li>${name} ${isMissing ? '<span class="missing-badge">missing</span>' : ''}</li>`;
            }).join('')}
        </ul>
    </div>
    `
    : '';

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
        const schemaBundle = ${JSON.stringify(schemaBundle)};
        const importedFileNames = ${JSON.stringify(importedFileNames)};
        const missingFileNames = ${JSON.stringify(missingFileNames)};
        
        ${scripts}

        // Initial render with the schema
        initSchema(${JSON.stringify(rootSchema)}, schemaBundle, importedFileNames, missingFileNames);
    </script>
</body>
</html>`;
}
