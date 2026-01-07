import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * A class to recursively load a root JSON schema and all its external references.
 */
export class SchemaLoader {
  // Maps a schema's absolute URI to its parsed content.
  private loadedSchemas: Map<string, any> = new Map();
  // A set of URIs that have been visited to prevent infinite loops.
  private visitedUris: Set<string> = new Set();
  // A set to store paths of schemas explicitly imported via $ref, excluding the root.
  private _importedFilePaths: Set<string> = new Set();
  // A set to store paths of schemas that failed to load.
  private _missingFilePaths: Set<string> = new Set();

  /**
   * Loads the initial schema and all its file-based references.
   * @param initialSchemaUri The URI of the root schema file to load.
   * @returns The root schema with all referenced schemas bundled into a `__loaded_schemas` property.
   */
  public async load(initialSchemaUri: vscode.Uri): Promise<{ rootSchema: any, schemaBundle: { [key: string]: any }, importedFileNames: string[], missingFileNames: string[], sourcePositions: Map<string, number> }> {
    // Clear previous state for a new load operation
    this.loadedSchemas.clear();
    this.visitedUris.clear();
    this._importedFilePaths.clear();
    this._missingFilePaths.clear();

    const sourceText = Buffer.from(await vscode.workspace.fs.readFile(initialSchemaUri)).toString('utf-8');
    const sourcePositions = this.buildSourcePositionsMap(sourceText);

    await this.resolve(initialSchemaUri, initialSchemaUri);

    const rootSchema = this.loadedSchemas.get(initialSchemaUri.fsPath);
    const schemaBundle = this.getSchemaBundle();
    const importedFileNames = Array.from(this._importedFilePaths).map(filePath => path.basename(filePath));
    const missingFileNames = Array.from(this._missingFilePaths).map(filePath => path.basename(filePath));

    return { rootSchema, schemaBundle, importedFileNames, missingFileNames, sourcePositions };
  }

  /**
   * Returns all loaded schemas as a dictionary keyed by their file basename.
   * @returns A dictionary of schema objects.
   */
  public getSchemaBundle(): { [key: string]: any } {
    const bundledSchemas: { [key: string]: any } = {};
    for (const [uri, schema] of this.loadedSchemas.entries()) {
      const relativePath = path.basename(uri); // Use basename as a simple key
      bundledSchemas[relativePath] = schema;
    }
    return bundledSchemas;
  }

  /**
   * Recursively resolves and loads a schema and its references.
   * @param schemaUri The URI of the schema to resolve.
   * @param initialSchemaUri The URI of the very first schema loaded (root schema).
   */
  private async resolve(schemaUri: vscode.Uri, initialSchemaUri: vscode.Uri) {
    if (this.visitedUris.has(schemaUri.fsPath)) {
      return;
    }
    this.visitedUris.add(schemaUri.fsPath);

    // If this is not the initial schema, it's an imported schema
    if (schemaUri.fsPath !== initialSchemaUri.fsPath) {
      this._importedFilePaths.add(schemaUri.fsPath);
    }

    try {
      const content = await vscode.workspace.fs.readFile(schemaUri);
      const schema = JSON.parse(Buffer.from(content).toString('utf-8'));
      this.loadedSchemas.set(schemaUri.fsPath, schema);

      const refs = this.findRefsIn(schema);
      const currentDir = vscode.Uri.file(path.dirname(schemaUri.fsPath));

      for (const ref of refs) {
        // We only care about refs that point to other files.
        if (typeof ref === 'string' && ref.includes('.json')) {
          const refFileName = ref.split('#')[0];
          const nextSchemaUri = vscode.Uri.joinPath(currentDir, refFileName);
          await this.resolve(nextSchemaUri, initialSchemaUri); // Pass initialSchemaUri
        }
      }
    } catch (e: any) {
      this._missingFilePaths.add(schemaUri.fsPath); // Add to missing paths
    }
  }

  /**
   * Builds a map from JSON paths to line numbers in the source file.
   * @param sourceText The raw JSON text.
   * @returns A map from JSON path to zero-based line number.
   */
  private buildSourcePositionsMap(sourceText: string): Map<string, number> {
    const posMap = new Map<string, number>();
    const errors: jsonc.ParseError[] = [];
    const root = jsonc.parseTree(sourceText, errors);

    if (!root) {
      return posMap;
    }

    const traverse = (node: jsonc.Node, path: string[]) => {
      const currentPath = path.join('.');
      if (node.offset !== undefined) {
        const pos = jsonc.getLocation(sourceText, node.offset);
        const line = pos.path.length === 0 ? 0 : this.offsetToLine(sourceText, node.offset);
        posMap.set(currentPath, line);
      }

      if (node.type === 'object' && node.children) {
        for (const child of node.children) {
          if (child.type === 'property' && child.children && child.children.length >= 2) {
            const keyNode = child.children[0];
            const valueNode = child.children[1];
            const key = keyNode.value;
            traverse(valueNode, [...path, key]);
          }
        }
      } else if (node.type === 'array' && node.children) {
        node.children.forEach((child, idx) => {
          traverse(child, [...path, String(idx)]);
        });
      }
    };

    traverse(root, []);
    return posMap;
  }

  /**
   * Converts a character offset to a zero-based line number.
   * @param text The source text.
   * @param offset The character offset.
   * @returns The zero-based line number.
   */
  private offsetToLine(text: string, offset: number): number {
    let line = 0;
    for (let i = 0; i < offset && i < text.length; i++) {
      if (text[i] === '\n') {
        line++;
      }
    }
    return line;
  }

  /**
   * Traverses an object to find all string values for the "$ref" key.
   * @param obj The object to traverse.
   * @returns An array of found $ref values.
   */
  private findRefsIn(obj: any): string[] {
    const refs: string[] = [];
    const traverse = (current: any) => {
      if (!current || typeof current !== 'object') {
        return;
      }

      if (current['$ref'] && typeof current['$ref'] === 'string') {
        refs.push(current['$ref']);
      }

      // Recursively traverse arrays and objects
      for (const key in current) {
        if (Object.prototype.hasOwnProperty.call(current, key)) {
          traverse(current[key]);
        }
      }
    };

    traverse(obj);
    return refs;
  }
}
