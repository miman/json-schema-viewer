import * as vscode from 'vscode';
import { SchemaViewerPanel } from './schemaViewerPanel';
import { SchemaLoader } from './schemaLoader';

export function activate(context: vscode.ExtensionContext) {
  console.log('JSON Schema Viewer is now active');

  const showPreview = async (fileUri: vscode.Uri) => {
    const loader = new SchemaLoader();
    try {
      const { rootSchema, schemaBundle, importedFileNames, missingFileNames } = await loader.load(fileUri);
      if (rootSchema) {
        SchemaViewerPanel.createOrShow(context.extensionUri, rootSchema, schemaBundle, fileUri.fsPath, importedFileNames, missingFileNames);
      }
    } catch (e: any) {
      vscode.window.showErrorMessage(`Failed to load schema and its references: ${e.message}`);
    }
  };

  const previewCommand = vscode.commands.registerCommand(
    'jsonSchemaViewer.preview',
    async (uri?: vscode.Uri) => {
      let fileUri: vscode.Uri | undefined;

      if (uri) {
        fileUri = uri;
      } else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage('No active editor found');
          return;
        }
        if (editor.document.languageId !== 'json') {
          vscode.window.showErrorMessage('Current file is not a JSON file');
          return;
        }
        fileUri = editor.document.uri;
      }

      if (fileUri) {
        await showPreview(fileUri);
      }
    }
  );

  context.subscriptions.push(previewCommand);

  // Watch for changes in the active editor
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(async (e) => {
      if (
        e.document.uri.fsPath === SchemaViewerPanel.currentPanel?.getCurrentFile() &&
        e.document.languageId === 'json' &&
        SchemaViewerPanel.currentPanel
      ) {
        const loader = new SchemaLoader();
        try {
          const { rootSchema, schemaBundle, importedFileNames, missingFileNames } = await loader.load(e.document.uri);
          if (rootSchema) {
            SchemaViewerPanel.currentPanel.updateSchema(rootSchema, schemaBundle, e.document.fileName, importedFileNames, missingFileNames);
          }
        } catch {
          // Ignore errors during live typing
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (!editor) {
        return;
      }
      if (editor.document.languageId === 'json' && SchemaViewerPanel.currentPanel) {
        const loader = new SchemaLoader();
        try {
          const { rootSchema, schemaBundle, importedFileNames, missingFileNames } = await loader.load(editor.document.uri);
          if (rootSchema) {
            SchemaViewerPanel.currentPanel.updateSchema(rootSchema, schemaBundle, editor.document.fileName, importedFileNames, missingFileNames);
          }
        } catch {
          // Ignore parse errors on editor change
        }
      }
    })
  );
}

export function deactivate() { }
