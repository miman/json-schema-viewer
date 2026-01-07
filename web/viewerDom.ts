import { escapeHtml } from './viewerCore';
import { renderNormalViewInto, type RenderSchemaOptions as NormalOptions } from './viewerDomNormal';
import { renderTreeViewInto } from './viewerDomTree';

export type RenderSchemaOptions = NormalOptions & {
  initialView?: 'normal' | 'tree';
  sourcePositions?: { [key: string]: number };
  activeLinkEnabled?: boolean;
  onActiveLinkChange?: (enabled: boolean) => void;
  onNavigateToSource?: (line: number) => void;
};

let currentView: 'normal' | 'tree' = 'normal';

export function renderSchemaInto(container: HTMLElement, options: RenderSchemaOptions): void {
  const schema = options.schema;
  if (options.initialView) {
    currentView = options.initialView;
  }
  container.innerHTML = '';
  container.classList.add('schema-container');
  container.classList.toggle('normal-view', currentView === 'normal');

  if (!schema) {
    const loading = document.createElement('div');
    loading.className = 'loading';
    loading.textContent = 'Loading schema...';
    container.appendChild(loading);
    return;
  }

  // Header
  const header = document.createElement('div');
  header.className = 'schema-header';

  const title = schema.title || 'JSON Schema';
  const description = schema.description || '';
  const schemaVersion = schema.$schema || '';
  const schemaId = schema.$id || '';

  header.innerHTML = `
    <div class="schema-header-top">
      <div class="schema-title">${escapeHtml(title)}</div>
      <div class="view-selector">
        <div class="view-switch" title="Toggle between normal and tree view modes">
          <span class="view-switch-label view-switch-left">Normal</span>
          <input type="checkbox" id="view-toggle" class="view-switch-checkbox" aria-label="Toggle Tree View" ${currentView === 'tree' ? 'checked' : ''} />
          <span class="view-switch-label view-switch-right">Tree view</span>
        </div>
      </div>
    </div>
    ${description ? `<div class="schema-description">${escapeHtml(description)}</div>` : ''}
    <div class="schema-meta">
      ${schemaVersion ? `<div class="schema-meta-item"><span class="schema-meta-label">Schema:</span><span class="schema-meta-value">${escapeHtml(schemaVersion)}</span></div>` : ''}
      ${schemaId ? `<div class="schema-meta-item"><span class="schema-meta-label">ID:</span><span class="schema-meta-value">${escapeHtml(schemaId)}</span></div>` : ''}
    </div>
    ${options.onActiveLinkChange ? `<div class="active-link-bottom-row">
      <label class="active-link-label" title="Enable clicking on properties to navigate to their source location">
        <input type="checkbox" id="active-link-toggle" class="active-link-checkbox" ${options.activeLinkEnabled ? 'checked' : ''} />
        <span>Active link</span>
      </label>
    </div>` : ''}
  `;
  container.appendChild(header);

  const toggle = header.querySelector('#view-toggle') as HTMLInputElement | null;
  if (toggle) {
    toggle.addEventListener('change', () => {
      const newView = toggle.checked ? 'tree' : 'normal';
      currentView = newView;
      renderSchemaInto(container, { ...options, initialView: currentView });
    });
  }

  const activeLinkToggle = header.querySelector('#active-link-toggle') as HTMLInputElement | null;
  if (activeLinkToggle && options.onActiveLinkChange) {
    activeLinkToggle.addEventListener('change', () => {
      if (options.onActiveLinkChange) {
        options.onActiveLinkChange(activeLinkToggle.checked);
      }
    });
  }

  const contentContainer = document.createElement('div');
  contentContainer.className = 'schema-content-root';
  container.appendChild(contentContainer);

  if (currentView === 'tree') {
    renderTreeViewInto(contentContainer, options);
  } else {
    renderNormalViewInto(contentContainer, options);
  }
}
