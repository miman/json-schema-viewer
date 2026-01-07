import { escapeHtml, generateExampleValue, getType, hasNestedContent, hasRemoteRef, resolveRef, type SchemaBundle, syntaxHighlightJson } from './viewerCore';

export type RenderSchemaOptions = {
  schema: any;
  bundle?: SchemaBundle;
  importedFileNames?: string[];
  missingFileNames?: string[];
  sourcePositions?: { [key: string]: number };
  activeLinkEnabled?: boolean;
  onNavigateToSource?: (line: number) => void;
};

export function renderNormalViewInto(container: HTMLElement, options: RenderSchemaOptions): void {
  const schema = options.schema;
  const bundle = options.bundle ?? {};
  const importedFileNames = options.importedFileNames ?? [];
  const missingFileNames = options.missingFileNames ?? [];
  const sourcePositions = options.sourcePositions ?? {};
  const activeLinkEnabled = options.activeLinkEnabled ?? false;
  const onNavigateToSource = options.onNavigateToSource;

  // Properties
  if (schema.properties) {
    const propsSection = document.createElement('div');
    propsSection.innerHTML = '<div class="section-title">Properties</div>';
    const required = schema.required || [];
    renderProperties(propsSection, schema.properties, required, schema, bundle, sourcePositions, activeLinkEnabled, onNavigateToSource, 'properties');
    container.appendChild(propsSection);
  }

  // Definitions
  const definitions = schema.definitions || schema.$defs || {};
  if (Object.keys(definitions).length > 0) {
    const defsSection = document.createElement('div');
    defsSection.className = 'definitions-section';
    defsSection.innerHTML = '<div class="section-title">Definitions</div>';

    const defsPath = schema.definitions ? 'definitions' : '$defs';
    for (const [name, def] of Object.entries(definitions)) {
      const defElement = renderDefinition(String(name), def, schema, bundle, sourcePositions, activeLinkEnabled, onNavigateToSource, defsPath);
      defsSection.appendChild(defElement);
    }
    container.appendChild(defsSection);
  }

  // Imported files
  if (importedFileNames.length > 0) {
    const importedFilesHeader = document.createElement('h2');
    importedFilesHeader.className = 'section-title';
    importedFilesHeader.textContent = 'Imported files';
    container.appendChild(importedFilesHeader);

    const importedFilesContainer = document.createElement('div');
    importedFilesContainer.className = 'imported-files-container';
    const ul = document.createElement('ul');

    importedFileNames.forEach(name => {
      const li = document.createElement('li');
      li.textContent = name;
      if (missingFileNames.includes(name)) {
        const span = document.createElement('span');
        span.className = 'missing-badge';
        span.textContent = 'file not found';
        li.appendChild(document.createTextNode(' '));
        li.appendChild(span);
      }
      ul.appendChild(li);
    });

    importedFilesContainer.appendChild(ul);
    container.appendChild(importedFilesContainer);
  }
}

function renderProperties(
  container: HTMLElement,
  properties: Record<string, any>,
  required: string[],
  rootSchema: any,
  bundle: SchemaBundle,
  sourcePositions: { [key: string]: number },
  activeLinkEnabled: boolean,
  onNavigateToSource: ((line: number) => void) | undefined,
  pathPrefix: string
): void {
  for (const [name, prop] of Object.entries(properties)) {
    const isRequired = required.includes(name);
    const propPath = `${pathPrefix}.${name}`;
    const propElement = renderProperty(name, prop, isRequired, rootSchema, bundle, sourcePositions, activeLinkEnabled, onNavigateToSource, propPath);
    container.appendChild(propElement);
  }
}

function renderProperty(name: string, prop: any, isRequired: boolean, rootSchema: any, bundle: SchemaBundle, sourcePositions: { [key: string]: number }, activeLinkEnabled: boolean, onNavigateToSource: ((line: number) => void) | undefined, jsonPath: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'schema-object';

  const resolvedProp = resolveRef(prop, rootSchema, bundle);
  const type = getType(resolvedProp);
  const hasChildren = hasNestedContent(resolvedProp);
  const description = resolvedProp.description || '';
  const isImported = resolvedProp.__isImported || hasRemoteRef(prop);
  const isMissing = resolvedProp.__isMissing;

  // Get source line for this property
  const sourceLine = sourcePositions[jsonPath];

  // Helper function to extract name from $ref
  const getRefName = (ref: string): string | null => {
    if (!ref) return null;
    const match = ref.match(/[#/](\$defs|definitions)\/([^/]+)$/);
    if (match) return match[2];
    const fileMatch = ref.match(/\/([^/]+)$/);
    return fileMatch ? fileMatch[1] : null;
  };

  // Enhance type display with referenced type names
  let displayType = type;
  if (prop.$ref) {
    const refName = getRefName(prop.$ref);
    if (refName) {
      displayType = `object<${refName}>`;
    }
  } else if (type === 'array' && prop.items?.$ref) {
    const refName = getRefName(prop.items.$ref);
    if (refName) {
      displayType = `array<${refName}>`;
    }
  }

  const header = document.createElement('div');
  header.className = 'schema-object-header';
  if (sourceLine !== undefined) {
    header.dataset.sourceLine = String(sourceLine);
  }
  header.innerHTML = `
    ${hasChildren ? `<svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>` : '<div style="width: 24px;"></div>'}
    <span class="property-name">${escapeHtml(name)}</span>
    <span class="property-type type-${escapeHtml(type)}">${type === 'missing' ? 'file not found' : escapeHtml(displayType)}</span>
    ${isRequired ? '<span class="required-badge">required</span>' : ''}
    ${isImported ? '<span class="imported-badge">imported</span>' : ''}
    ${isMissing ? '<span class="missing-badge">file not found</span>' : ''}
    ${description ? `<span class="property-description">${escapeHtml(description)}</span>` : ''}
  `;

  header.addEventListener('click', (e) => {
    if (hasChildren) {
      const content = wrapper.querySelector('.schema-object-content');
      const icon = header.querySelector('.expand-icon');
      content?.classList.toggle('expanded');
      icon?.classList.toggle('expanded');
    }

    // Navigate to source if active link is enabled and we have a source line
    if (activeLinkEnabled && sourceLine !== undefined && onNavigateToSource) {
      onNavigateToSource(sourceLine);
      e.stopPropagation();
    }
  });

  wrapper.appendChild(header);

  if (hasChildren && !isMissing) {
    const content = document.createElement('div');
    content.className = 'schema-object-content';
    renderPropertyContentWithToggle(content, resolvedProp, rootSchema, bundle, sourcePositions, activeLinkEnabled, onNavigateToSource, jsonPath);
    wrapper.appendChild(content);
  }

  return wrapper;
}

function renderPropertyContentWithToggle(container: HTMLElement, prop: any, rootSchema: any, bundle: SchemaBundle, sourcePositions: { [key: string]: number }, activeLinkEnabled: boolean, onNavigateToSource: ((line: number) => void) | undefined, pathPrefix: string): void {
  const canShowExample = prop.properties || prop.items || prop.oneOf || prop.anyOf || prop.allOf;

  if (!canShowExample) {
    renderPropertyContent(container, prop, rootSchema, bundle, sourcePositions, activeLinkEnabled, onNavigateToSource, pathPrefix);
    return;
  }

  let currentObjView: 'schema' | 'example' = 'schema';

  const viewToggle = document.createElement('div');
  viewToggle.className = 'view-toggle';
  viewToggle.innerHTML = `
    <button class="view-toggle-btn" data-view="example">Example Value</button>
    <button class="view-toggle-btn active" data-view="schema">Schema</button>
  `;

  const contentArea = document.createElement('div');
  contentArea.className = 'property-content-area';

  const renderContent = () => {
    contentArea.innerHTML = '';
    viewToggle.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLButtonElement).dataset.view === currentObjView);
    });

    if (currentObjView === 'example') {
      const exampleDiv = document.createElement('div');
      exampleDiv.className = 'object-example-view';
      const exampleValue = generateExampleValue(prop, rootSchema, bundle, new Set());
      const formattedJson = syntaxHighlightJson(JSON.stringify(exampleValue, null, 2));
      exampleDiv.innerHTML = `<pre>${formattedJson}</pre>`;
      contentArea.appendChild(exampleDiv);
    } else {
      renderPropertyContent(contentArea, prop, rootSchema, bundle, sourcePositions, activeLinkEnabled, onNavigateToSource, pathPrefix);
    }
  };

  viewToggle.addEventListener('click', e => {
    const btn = (e.target as HTMLElement | null)?.closest('.view-toggle-btn') as HTMLButtonElement | null;
    if (btn && btn.dataset.view && btn.dataset.view !== currentObjView) {
      currentObjView = btn.dataset.view as 'schema' | 'example';
      renderContent();
    }
  });

  container.appendChild(viewToggle);
  container.appendChild(contentArea);
  renderContent();
}

function renderPropertyContent(container: HTMLElement, prop: any, rootSchema: any, bundle: SchemaBundle, sourcePositions: { [key: string]: number }, activeLinkEnabled: boolean, onNavigateToSource: ((line: number) => void) | undefined, pathPrefix: string): void {
  const details = document.createElement('div');
  details.className = 'property-details';

  let detailsHtml = '';

  if (prop.description) {
    detailsHtml += `<div class="property-detail-row"><span class="property-detail-label">Description:</span><span class="property-detail-value">${escapeHtml(prop.description)}</span></div>`;
  }
  if (prop.default !== undefined) {
    detailsHtml += `<div class="property-detail-row"><span class="property-detail-label">Default:</span><span class="property-detail-value">${escapeHtml(JSON.stringify(prop.default))}</span></div>`;
  }
  if (prop.example !== undefined) {
    detailsHtml += `<div class="property-detail-row"><span class="property-detail-label">Example:</span><span class="property-detail-value">${escapeHtml(JSON.stringify(prop.example))}</span></div>`;
  }
  if (prop.format) {
    detailsHtml += `<div class="property-detail-row"><span class="property-detail-label">Format:</span><span class="property-detail-value">${escapeHtml(prop.format)}</span></div>`;
  }
  if (prop.pattern) {
    detailsHtml += `<div class="property-detail-row"><span class="property-detail-label">Pattern:</span><span class="property-detail-value">${escapeHtml(prop.pattern)}</span></div>`;
  }
  if (prop.minimum !== undefined) {
    detailsHtml += `<div class="property-detail-row"><span class="property-detail-label">Minimum:</span><span class="property-detail-value">${String(prop.minimum)}</span></div>`;
  }
  if (prop.maximum !== undefined) {
    detailsHtml += `<div class="property-detail-row"><span class="property-detail-label">Maximum:</span><span class="property-detail-value">${String(prop.maximum)}</span></div>`;
  }
  if (prop.minLength !== undefined) {
    detailsHtml += `<div class="property-detail-row"><span class="property-detail-label">Min Length:</span><span class="property-detail-value">${String(prop.minLength)}</span></div>`;
  }
  if (prop.maxLength !== undefined) {
    detailsHtml += `<div class="property-detail-row"><span class="property-detail-label">Max Length:</span><span class="property-detail-value">${String(prop.maxLength)}</span></div>`;
  }
  if (prop.minItems !== undefined) {
    detailsHtml += `<div class="property-detail-row"><span class="property-detail-label">Min Items:</span><span class="property-detail-value">${String(prop.minItems)}</span></div>`;
  }
  if (prop.maxItems !== undefined) {
    detailsHtml += `<div class="property-detail-row"><span class="property-detail-label">Max Items:</span><span class="property-detail-value">${String(prop.maxItems)}</span></div>`;
  }
  if (prop.enum) {
    detailsHtml += `<div class="property-detail-row"><span class="property-detail-label">Enum Values:</span><span class="property-detail-value"><div class="enum-values">${prop.enum
      .map((v: any) => `<span class="enum-value">${escapeHtml(JSON.stringify(v))}</span>`)
      .join('')}</div></span></div>`;
  }

  if (detailsHtml) {
    details.innerHTML = detailsHtml;
    container.appendChild(details);
  }

  if (prop.properties) {
    const nested = document.createElement('div');
    nested.className = 'nested-properties';
    const required = prop.required || [];
    renderProperties(nested, prop.properties, required, rootSchema, bundle, sourcePositions, activeLinkEnabled, onNavigateToSource, `${pathPrefix}.properties`);
    container.appendChild(nested);
  }

  if (prop.items) {
    const itemsLabel = document.createElement('div');
    itemsLabel.className = 'array-items-label';
    itemsLabel.textContent = 'Array Items:';
    container.appendChild(itemsLabel);

    const resolvedItems = resolveRef(prop.items, rootSchema, bundle);
    if (resolvedItems.properties) {
      const nested = document.createElement('div');
      nested.className = 'nested-properties';
      const required = resolvedItems.required || [];
      renderProperties(nested, resolvedItems.properties, required, rootSchema, bundle, sourcePositions, activeLinkEnabled, onNavigateToSource, `${pathPrefix}.items.properties`);
      container.appendChild(nested);
    } else {
      const itemType = getType(resolvedItems);
      const itemInfo = document.createElement('div');
      itemInfo.innerHTML = `<span class="property-type type-${escapeHtml(itemType)}">${escapeHtml(itemType)}</span>`;
      if (resolvedItems.description) {
        itemInfo.innerHTML += ` <span class="property-description">${escapeHtml(resolvedItems.description)}</span>`;
      }
      container.appendChild(itemInfo);
    }
  }

  (['oneOf', 'anyOf', 'allOf'] as const).forEach(keyword => {
    if (prop[keyword]) {
      const label = document.createElement('div');
      label.className = 'array-items-label';
      label.textContent = keyword + ':';
      container.appendChild(label);

      prop[keyword].forEach((subSchema: any, index: number) => {
        const resolved = resolveRef(subSchema, rootSchema, bundle);
        const subPath = `${pathPrefix}.${keyword}.${index}`;
        const subElement = renderProperty(`Option ${index + 1}`, resolved, false, rootSchema, bundle, sourcePositions, activeLinkEnabled, onNavigateToSource, subPath);
        container.appendChild(subElement);
      });
    }
  });
}

function renderDefinition(name: string, def: any, rootSchema: any, bundle: SchemaBundle, sourcePositions: { [key: string]: number }, activeLinkEnabled: boolean, onNavigateToSource: ((line: number) => void) | undefined, defsPath: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'schema-object';
  wrapper.id = `def-${name}`;

  const resolvedDef = resolveRef(def, rootSchema, bundle);
  const type = getType(resolvedDef);
  const hasChildren = hasNestedContent(resolvedDef);
  const description = resolvedDef.description || '';
  const isImported = resolvedDef.__isImported || hasRemoteRef(def);
  const isMissing = resolvedDef.__isMissing;

  // Get source line for this definition
  const jsonPath = `${defsPath}.${name}`;
  const sourceLine = sourcePositions[jsonPath];

  const header = document.createElement('div');
  header.className = 'schema-object-header';
  if (sourceLine !== undefined) {
    header.dataset.sourceLine = String(sourceLine);
  }
  header.innerHTML = `
    ${hasChildren ? `<svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>` : '<div style="width: 24px;"></div>'}
    <span class="property-name">${escapeHtml(name)}</span>
    <span class="property-type type-${escapeHtml(type)}">${type === 'missing' ? 'file not found' : escapeHtml(type)}</span>
    ${isImported ? '<span class="imported-badge">imported</span>' : ''}
    ${isMissing ? '<span class="missing-badge">file not found</span>' : ''}
    ${description ? `<span class="property-description">${escapeHtml(description)}</span>` : ''}
  `;

  header.addEventListener('click', (e) => {
    if (hasChildren) {
      const content = wrapper.querySelector('.schema-object-content');
      const icon = header.querySelector('.expand-icon');
      content?.classList.toggle('expanded');
      icon?.classList.toggle('expanded');
    }

    // Navigate to source if active link is enabled and we have a source line
    if (activeLinkEnabled && sourceLine !== undefined && onNavigateToSource) {
      onNavigateToSource(sourceLine);
      e.stopPropagation();
    }
  });

  wrapper.appendChild(header);

  if (hasChildren && !isMissing) {
    const content = document.createElement('div');
    content.className = 'schema-object-content';
    renderPropertyContentWithToggle(content, resolvedDef, rootSchema, bundle, sourcePositions, activeLinkEnabled, onNavigateToSource, jsonPath);
    wrapper.appendChild(content);
  }

  return wrapper;
}
