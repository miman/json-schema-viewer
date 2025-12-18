import * as path from 'path';
import * as vscode from 'vscode';
import { getHtmlTemplate } from './webview';

/**
 * Manages the webview panel for displaying a JSON schema.
 * Ensures that only one panel exists at a time.
 */
export class SchemaViewerPanel {
  /**
   * The currently active panel.
   */
  public static currentPanel: SchemaViewerPanel | undefined;
  /**
   * The view type for the webview panel.
   */
  public static readonly viewType = 'jsonSchemaViewer';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _fileName: string;
  private _schemaBundle: { [key: string]: any };
  private _importedFileNames: string[]; // New property to store imported file names
  private _missingFileNames: string[]; // New property to store missing file names

  /**
   * Creates a new panel or shows an existing one.
   * @param extensionUri The URI of the extension.
   * @param rootSchema The root JSON schema to display.
   * @param schemaBundle A dictionary of all loaded schemas.
   * @param fileName The name of the file containing the schema.
   * @param importedFileNames An array of names of files imported by the schema.
   * @param missingFileNames An array of names of files that failed to load.
   */
  public static createOrShow(extensionUri: vscode.Uri, rootSchema: any, schemaBundle: {[key: string]: any}, fileName: string, importedFileNames: string[], missingFileNames: string[]) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If panel already exists, update it
    if (SchemaViewerPanel.currentPanel) {
      SchemaViewerPanel.currentPanel._panel.reveal(column);
      SchemaViewerPanel.currentPanel.updateSchema(rootSchema, schemaBundle, fileName, importedFileNames, missingFileNames);
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      SchemaViewerPanel.viewType,
      `Schema: ${path.basename(fileName)}`,
      column || vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri]
      }
    );

    SchemaViewerPanel.currentPanel = new SchemaViewerPanel(panel, extensionUri, rootSchema, schemaBundle, fileName, importedFileNames, missingFileNames);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, rootSchema: any, schemaBundle: {[key: string]: any}, fileName: string, importedFileNames: string[], missingFileNames: string[]) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._fileName = fileName;
    this._schemaBundle = schemaBundle;
    this._importedFileNames = importedFileNames;
    this._missingFileNames = missingFileNames;

    // Set initial content
    this._update(rootSchema, schemaBundle, importedFileNames, missingFileNames);

    // Handle disposal
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'alert':
            vscode.window.showErrorMessage(message.text);
            return;
        }
      },
      null,
      this._disposables
    );
  }

  /**
   * Sends a message to the webview to update the schema.
   * @param rootSchema The new schema to display.
   * @param schemaBundle A dictionary of all loaded schemas.
   * @param fileName The name of the file containing the schema.
   * @param importedFileNames An array of names of files imported by the schema.
   * @param missingFileNames An array of names of files that failed to load.
   */
  public updateSchema(rootSchema: any, schemaBundle: {[key: string]: any}, fileName: string, importedFileNames: string[], missingFileNames: string[]) {
    this._fileName = fileName;
    this._panel.title = `Schema: ${path.basename(fileName)}`;
    this._schemaBundle = schemaBundle;
    this._importedFileNames = importedFileNames;
    this._missingFileNames = missingFileNames;
    this._panel.webview.postMessage({ command: 'updateSchema', schema: rootSchema, bundle: this._schemaBundle, importedFiles: this._importedFileNames, missingFiles: this._missingFileNames });
  }

  /**
   * Gets the file path of the schema currently being displayed.
   */
  public getCurrentFile(): string {
    return this._fileName;
  }

  /**
   * Sets the HTML content of the webview panel.
   * @param rootSchema The root JSON schema to display.
   * @param schemaBundle A dictionary of all loaded schemas.
   * @param importedFileNames An array of names of files imported by the schema.
   * @param missingFileNames An array of names of files that failed to load.
   */
  private _update(rootSchema: any, schemaBundle: {[key: string]: any}, importedFileNames: string[], missingFileNames: string[]) {
    this._panel.webview.html = this._getHtmlContent(rootSchema, schemaBundle, importedFileNames, missingFileNames);
  }

  /**
   * Disposes the panel and its resources.
   */
  public dispose() {
    SchemaViewerPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  /**
   * Generates the HTML content for the webview.
   * @param rootSchema The root JSON schema to display.
   * @param schemaBundle A dictionary of all loaded schemas.
   * @param importedFileNames An array of names of files imported by the schema.
   * @param missingFileNames An array of names of files that failed to load.
   * @returns The HTML content.
   */
  private _getHtmlContent(rootSchema: any, schemaBundle: {[key: string]: any}, importedFileNames: string[], missingFileNames: string[]): string {
    const nonce = getNonce();
    return getHtmlTemplate(rootSchema, schemaBundle, importedFileNames, missingFileNames, nonce);
  }
}
/**
 * Generates a random nonce.
 * @returns A 32-character random string.
 */
function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
