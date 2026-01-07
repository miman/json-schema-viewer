// Main entry point for the library
export { SchemaViewer, type SchemaViewerProps } from './react';
export { ensureSchemaViewerStyles } from './styles/ensureStyles';
export {
  escapeHtml,
  generateExampleValue,
  getType,
  hasNestedContent,
  hasRemoteRef,
  resolveRef,
  syntaxHighlightJson,
  type SchemaBundle
} from './viewerCore';
export { renderSchemaInto, type RenderSchemaOptions } from './viewerDom';

