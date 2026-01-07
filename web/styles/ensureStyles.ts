import { getStyles } from './styles';

const STYLE_ELEMENT_ID = 'json-schema-viewer-styles';

export function ensureSchemaViewerStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ELEMENT_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = getStyles();
  document.head.appendChild(style);
}
