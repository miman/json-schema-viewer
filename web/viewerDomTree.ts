import { escapeHtml, getType, hasNestedContent, resolveRef, type SchemaBundle } from './viewerCore';

export type TreeRenderOptions = {
  schema: any;
  bundle?: SchemaBundle;
  sourcePositions?: { [key: string]: number };
  activeLinkEnabled?: boolean;
  onNavigateToSource?: (line: number) => void;
};

type TreeNode = {
  name: string;
  prop: any;
  level: number;
  children: TreeNode[];
  isExpanded: boolean;
  parentId: string | null;
  id: string;
  isRequired?: boolean;
  jsonPath?: string;
};

export function renderTreeViewInto(container: HTMLElement, options: TreeRenderOptions): void {
  const { schema, bundle = {}, sourcePositions = {}, activeLinkEnabled = false, onNavigateToSource } = options;
  container.innerHTML = '';
  container.classList.add('tree-view-wrapper');

  const treeData = buildTreeData(schema, bundle);
  renderTree(container, treeData, schema, bundle, sourcePositions, activeLinkEnabled, onNavigateToSource);
}

function buildTreeData(schema: any, bundle: SchemaBundle): TreeNode {
  const root: TreeNode = {
    name: schema.title || 'root',
    prop: schema,
    level: 0,
    children: [],
    isExpanded: true,
    parentId: null,
    id: 'root',
    jsonPath: ''
  };

  // We'll populate children lazily or during render to handle expand/collapse
  return root;
}

function renderTree(container: HTMLElement, rootNode: TreeNode, rootSchema: any, bundle: SchemaBundle, sourcePositions: { [key: string]: number }, activeLinkEnabled: boolean, onNavigateToSource: ((line: number) => void) | undefined): void {
  const treeContainer = document.createElement('div');
  treeContainer.className = 'tree-view-container';
  container.appendChild(treeContainer);

  const svgCanvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgCanvas.setAttribute('class', 'tree-connectors');
  treeContainer.appendChild(svgCanvas);

  const nodesContainer = document.createElement('div');
  nodesContainer.className = 'tree-nodes-container';
  treeContainer.appendChild(nodesContainer);

  const state = {
    expandedNodes: new Set<string>(['root']),
    nodeElements: new Map<string, HTMLElement>()
  };

  const update = () => {
    nodesContainer.innerHTML = '';
    state.nodeElements.clear();
    renderNode(nodesContainer, rootNode, 0, state, rootSchema, bundle, update, sourcePositions, activeLinkEnabled, onNavigateToSource);

    // Smooth layout update
    setTimeout(() => drawConnectors(svgCanvas, state), 0);
  };

  update();

  // Handle window resize to redraw connectors
  window.addEventListener('resize', () => drawConnectors(svgCanvas, state));
}

function renderNode(
  container: HTMLElement,
  node: TreeNode,
  depth: number,
  state: { expandedNodes: Set<string>, nodeElements: Map<string, HTMLElement> },
  rootSchema: any,
  bundle: SchemaBundle,
  onToggle: () => void,
  sourcePositions: { [key: string]: number },
  activeLinkEnabled: boolean,
  onNavigateToSource: ((line: number) => void) | undefined
): void {
  const column = getOrCreateColumn(container, depth);

  const nodeEl = document.createElement('div');
  nodeEl.className = 'tree-node';
  nodeEl.id = `node-${node.id}`;

  const resolvedProp = resolveRef(node.prop, rootSchema, bundle);

  // If this node's prop has a $ref, we need to use the definition path for source lookup
  let effectiveJsonPath = node.jsonPath || '';
  if (node.prop.$ref && typeof node.prop.$ref === 'string') {
    // Extract the definition path from the $ref
    // e.g., "#/$defs/Department" -> "$defs.Department"
    const refMatch = node.prop.$ref.match(/#\/(.+)$/);
    if (refMatch) {
      effectiveJsonPath = refMatch[1].replace(/\//g, '.');
    }
  }

  // Get source line for this node
  const sourceLine = effectiveJsonPath ? sourcePositions[effectiveJsonPath] : undefined;
  if (sourceLine !== undefined) {
    nodeEl.dataset.sourceLine = String(sourceLine);
  }
  const type = getType(resolvedProp);
  const hasChildren = hasNestedContent(resolvedProp);
  const isExpanded = state.expandedNodes.has(node.id);

  // Helper function to extract name from $ref
  const getRefName = (ref: string): string | null => {
    if (!ref) return null;
    // Match patterns like "#/$defs/Department", "#/definitions/Email", "file.json#/$defs/Type"
    const match = ref.match(/[#/](\$defs|definitions)\/([^/]+)$/);
    if (match) return match[2];
    // Match simple file references like "Department"
    const fileMatch = ref.match(/\/([^/]+)$/);
    return fileMatch ? fileMatch[1] : null;
  };

  // Use "enum" as the display type for enum properties
  let displayType = resolvedProp.enum ? 'enum' : type;

  // Show referenced type names for objects and arrays
  if (node.prop.$ref) {
    const refName = getRefName(node.prop.$ref);
    if (refName) {
      displayType = refName;
    }
  } else if (type === 'array' && node.prop.items?.$ref) {
    const refName = getRefName(node.prop.items.$ref);
    if (refName) {
      displayType = `array<${refName}>`;
    }
  } else if (type === 'object' && resolvedProp.properties) {
    const propCount = Object.keys(resolvedProp.properties).length;
    displayType = `object (${propCount} ${propCount === 1 ? 'property' : 'properties'})`;
  } else if (type === 'array' && resolvedProp.items) {
    const itemsResolved = resolveRef(resolvedProp.items, rootSchema, bundle);
    const itemType = getType(itemsResolved);
    displayType = `array<${itemType}>`;
  }

  let metaHtml = '';
  // Show pattern and minLength only when expanded
  if (isExpanded) {
    if (resolvedProp.pattern) {
      metaHtml += `<div class="tree-node-meta-item">Pattern: <code>${escapeHtml(resolvedProp.pattern)}</code></div>`;
    }
    if (resolvedProp.minLength !== undefined) {
      metaHtml += `<div class="tree-node-meta-item">Min Length: ${resolvedProp.minLength}</div>`;
    }
  }
  // Always show enum values
  if (resolvedProp.enum) {
    metaHtml += `<div class="tree-node-meta-item">Enum: <span class="tree-enum-values">${resolvedProp.enum.map((v: any) => JSON.stringify(v)).join(', ')}</span></div>`;
  }

  nodeEl.innerHTML = `
    <div class="tree-node-header">
      <div class="tree-node-title-row">
        <span class="property-name">${escapeHtml(node.name)}</span>
        ${node.isRequired ? '<span class="required-badge">required</span>' : ''}
      </div>
      <span class="property-type type-${escapeHtml(displayType)}">${escapeHtml(displayType)}</span>
    </div>
    ${metaHtml ? `<div class="tree-node-meta">${metaHtml}</div>` : ''}
    ${isExpanded && resolvedProp.description ? `<div class="tree-node-description">${escapeHtml(resolvedProp.description)}</div>` : ''}
    ${hasChildren ? `
      <div class="tree-node-toggle">
        ${isExpanded ? '−' : '+'}
      </div>
    ` : ''}
  `;

  if (hasChildren) {
    nodeEl.querySelector('.tree-node-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isExpanded) {
        state.expandedNodes.delete(node.id);
      } else {
        state.expandedNodes.add(node.id);
      }
      onToggle();
    });
  }

  // Add click handler for source navigation
  nodeEl.addEventListener('click', (e) => {
    if (activeLinkEnabled && sourceLine !== undefined && onNavigateToSource) {
      onNavigateToSource(sourceLine);
    }
  });

  column.appendChild(nodeEl);
  state.nodeElements.set(node.id, nodeEl);

  if (isExpanded) {
    // Use effectiveJsonPath for children so they inherit the correct path
    const children = getChildren(resolvedProp, rootSchema, bundle, node.id, effectiveJsonPath);
    children.forEach(child => {
      renderNode(container, child, depth + 1, state, rootSchema, bundle, onToggle, sourcePositions, activeLinkEnabled, onNavigateToSource);
    });
  }
}

function getOrCreateColumn(container: HTMLElement, depth: number): HTMLElement {
  let column = container.querySelector(`.tree-column[data-depth="${depth}"]`) as HTMLElement;
  if (!column) {
    column = document.createElement('div');
    column.className = 'tree-column';
    column.setAttribute('data-depth', depth.toString());
    container.appendChild(column);
  }
  return column;
}

function getChildren(prop: any, rootSchema: any, bundle: SchemaBundle, parentId: string, parentPath: string): TreeNode[] {
  const children: TreeNode[] = [];
  const requiredFields = Array.isArray(prop.required) ? prop.required : [];

  if (prop.properties) {
    const basePath = parentPath ? `${parentPath}.properties` : 'properties';
    for (const [name, subProp] of Object.entries(prop.properties)) {
      children.push({
        name,
        prop: subProp,
        level: 0,
        children: [],
        isExpanded: false,
        parentId,
        id: `${parentId}.${name}`,
        isRequired: requiredFields.includes(name),
        jsonPath: `${basePath}.${name}`
      });
    }
  }

  if (prop.items) {
    const itemsPath = parentPath ? `${parentPath}.items` : 'items';
    children.push({
      name: 'items',
      prop: prop.items,  // Keep the original to preserve $ref
      level: 0,
      children: [],
      isExpanded: false,
      parentId,
      id: `${parentId}.items`,
      jsonPath: itemsPath
    });
  }

  // Handle oneOf, anyOf, allOf similarly if needed
  ['oneOf', 'anyOf', 'allOf'].forEach(keyword => {
    if (prop[keyword] && Array.isArray(prop[keyword])) {
      prop[keyword].forEach((sub: any, idx: number) => {
        const keywordPath = parentPath ? `${parentPath}.${keyword}.${idx}` : `${keyword}.${idx}`;
        children.push({
          name: `${keyword}[${idx}]`,
          prop: sub,
          level: 0,
          children: [],
          isExpanded: false,
          parentId,
          id: `${parentId}.${keyword}[${idx}]`,
          jsonPath: keywordPath
        });
      });
    }
  });

  return children;
}

function drawConnectors(svg: SVGSVGElement, state: { nodeElements: Map<string, HTMLElement> }): void {
  svg.innerHTML = '';
  const containerRect = svg.parentElement!.getBoundingClientRect();
  svg.setAttribute('width', containerRect.width.toString());
  svg.setAttribute('height', containerRect.height.toString());

  state.nodeElements.forEach((el, id) => {
    const parentId = id.substring(0, id.lastIndexOf('.'));
    if (parentId && state.nodeElements.has(parentId)) {
      const parentEl = state.nodeElements.get(parentId)!;
      drawCurve(svg, parentEl, el, containerRect);
    } else if (id !== 'root' && id.includes('.')) {
      // Fallback for root definitions or complex paths
    }
  });
}

function drawCurve(svg: SVGSVGElement, startEl: HTMLElement, endEl: HTMLElement, containerRect: DOMRect): void {
  const startRect = startEl.getBoundingClientRect();
  const endRect = endEl.getBoundingClientRect();

  const x1 = startRect.right - containerRect.left;
  const y1 = startRect.top + startRect.height / 2 - containerRect.top;
  const x2 = endRect.left - containerRect.left;
  const y2 = endRect.top + endRect.height / 2 - containerRect.top;

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const midX = (x1 + x2) / 2;
  const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

  path.setAttribute('d', d);
  path.setAttribute('class', 'tree-connector-line');
  svg.appendChild(path);
}
