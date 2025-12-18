/**
 * Contains the JavaScript code that will be injected into the webview.
 * This code is responsible for rendering the JSON schema and handling user interactions.
 */
export function getScripts(): string {
  return `
                const vscode = acquireVsCodeApi();
                let currentSchema = null;
                let currentSchemaBundle = {};
                let currentImportedFileNames = []; // New global variable
                let currentMissingFileNames = []; // New global variable
        
                /**
                 * Initializes the schema viewer with a schema and its bundle.
                 * @param {any} schema The JSON schema to render.
                 * @param {any} bundle The bundle of all loaded schemas.
                 * @param {string[]} importedFileNames An array of names of files imported by the schema.
                 * @param {string[]} missingFileNames An array of names of files that failed to load.
                 */
                function initSchema(schema, bundle, importedFileNames, missingFileNames) {
                    currentSchema = schema;
                    currentSchemaBundle = bundle;
                    currentImportedFileNames = importedFileNames; // Store globally
                    currentMissingFileNames = missingFileNames; // Store globally
                    renderSchema(currentSchema, currentImportedFileNames, currentMissingFileNames);
                }
        
                // Listen for messages from the extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.command === 'updateSchema') {
                        currentSchema = message.schema;
                        currentSchemaBundle = message.bundle;
                        currentImportedFileNames = message.importedFiles || []; // Update global
                        currentMissingFileNames = message.missingFiles || []; // Update global
                        renderSchema(currentSchema, currentImportedFileNames, currentMissingFileNames);
                    }
                });
        
                /**
                 * Renders the main schema view.
                 * @param {any} schema The JSON schema to render.
                 * @param {string[]} importedFileNames An array of names of files imported by the schema.
                 * @param {string[]} missingFileNames An array of names of files that failed to load.
                 */
                function renderSchema(schema, importedFileNames, missingFileNames) {
                    const container = document.getElementById('schemaContainer');
                    container.innerHTML = '';
        
                    // Render header
                    const header = document.createElement('div');
                    header.className = 'schema-header';
                    
                    const title = schema.title || 'JSON Schema';
                    const description = schema.description || '';
                    const schemaVersion = schema.$schema || '';
                    const schemaId = schema.$id || '';
        
                    header.innerHTML = \`
                        <div class="schema-title">\${escapeHtml(title)}</div>
                        \${description ? \`<div class="schema-description">\${escapeHtml(description)}</div>\` : ''}
                        <div class="schema-meta">
                            \${schemaVersion ? \`<div class="schema-meta-item"><span class="schema-meta-label">Schema:</span><span class="schema-meta-value">\${escapeHtml(schemaVersion)}</span></div>\` : ''}
                            \${schemaId ? \`<div class="schema-meta-item"><span class="schema-meta-label">ID:</span><span class="schema-meta-value">\${escapeHtml(schemaId)}</span></div>\` : ''}
                        </div>
                        \${schema.type ? \`<div class="root-type-badge type-\${schema.type}">\${schema.type}</div>\` : ''}
                    \`;
                    container.appendChild(header);
        
                    // Render main properties
                    if (schema.properties) {
                        const propsSection = document.createElement('div');
                        propsSection.innerHTML = '<div class="section-title">Properties</div>';
                        const required = schema.required || [];
                        renderProperties(propsSection, schema.properties, required, schema);
                        container.appendChild(propsSection);
                    }
        
                    // Render definitions
                    const definitions = schema.definitions || schema.$defs || {};
                    if (Object.keys(definitions).length > 0) {
                        const defsSection = document.createElement('div');
                        defsSection.className = 'definitions-section';
                        defsSection.innerHTML = '<div class="section-title">Definitions</div>';
                        
                        for (const [name, def] of Object.entries(definitions)) {
                            const defElement = renderDefinition(name, def, schema);
                            defsSection.appendChild(defElement);
                        }
                        container.appendChild(defsSection);
                    }

                    // Render Imported files block
                    if (importedFileNames && importedFileNames.length > 0) {
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
                                li.appendChild(document.createTextNode(' ')); // Add space
                                li.appendChild(span);
                            }
                            ul.appendChild(li);
                        });
                        importedFilesContainer.appendChild(ul);
                        container.appendChild(importedFilesContainer);
                    }
                }
        
                function hasRemoteRef(obj) {
                    if (!obj || typeof obj !== 'object') {
                        return false;
                    }
                
                    for (const key in obj) {
                        if (Object.prototype.hasOwnProperty.call(obj, key)) {
                            const value = obj[key];
                            if (key === '$ref' && typeof value === 'string' && value.includes('.json')) {
                                return true;
                            }
                            if (hasRemoteRef(value)) {
                                return true;
                            }
                        }
                    }
                
                    return false;
                }

                /**
                 * Renders a list of properties.
                 * @param {HTMLElement} container The element to render the properties into.
                 * @param {object} properties The properties object from the schema.
                 * @param {string[]} required An array of required property names.
                 * @param {any} rootSchema The root schema object.
                 */
                function renderProperties(container, properties, required, rootSchema) {
                    for (const [name, prop] of Object.entries(properties)) {
                        const isRequired = required.includes(name);
                        const propElement = renderProperty(name, prop, isRequired, rootSchema);
                        container.appendChild(propElement);
                    }
                }
        
                /**
                 * Renders a single property.
                 * @param {string} name The name of the property.
                 * @param {any} prop The property object from the schema.
                 * @param {boolean} isRequired Whether the property is required.
                 * @param {any} rootSchema The root schema object.
                 * @returns {HTMLElement} The rendered property element.
                 */
                function renderProperty(name, prop, isRequired, rootSchema) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'schema-object';
        
                    const resolvedProp = resolveRef(prop, rootSchema);
                    const type = getType(resolvedProp);
                    const hasChildren = hasNestedContent(resolvedProp);
                    const description = resolvedProp.description || '';
                    const isImported = resolvedProp.__isImported || hasRemoteRef(prop);
                    const isMissing = resolvedProp.__isMissing;

                    const header = document.createElement('div');
                    header.className = 'schema-object-header';
                    header.innerHTML = \`
                        \${hasChildren ? \`<svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>\` : '<div style="width: 24px;"></div>'}
                        <span class="property-name">\${escapeHtml(name)}</span>
                        <span class="property-type type-\${type}">\${type === 'missing' ? 'file not found' : type}</span>
                        \${isRequired ? '<span class="required-badge">required</span>' : ''}
                        \${isImported ? '<span class="imported-badge">imported</span>' : ''}
                        \${isMissing ? '<span class="missing-badge">file not found</span>' : ''}
                        \${description ? \`<span class="property-description">\${escapeHtml(description)}</span>\` : ''}
                    \`;
        
                    if (hasChildren) {
                        header.addEventListener('click', () => {
                            const content = wrapper.querySelector('.schema-object-content');
                            const icon = header.querySelector('.expand-icon');
                            content.classList.toggle('expanded');
                            icon.classList.toggle('expanded');
                        });
                    }
        
                    wrapper.appendChild(header);
        
                    if (hasChildren && !isMissing) {
                        const content = document.createElement('div');
                        content.className = 'schema-object-content';
                        renderPropertyContentWithToggle(content, resolvedProp, rootSchema);
                        wrapper.appendChild(content);
                    }
        
                    return wrapper;
                }
        
                /**
                 * Renders the content of a property, with a toggle for schema/example views.
                 * @param {HTMLElement} container The element to render the content into.
                 * @param {any} prop The property object.
                 * @param {any} rootSchema The root schema.
                 */
                function renderPropertyContentWithToggle(container, prop, rootSchema) {
                    // Add view toggle for objects and arrays
                    const canShowExample = prop.properties || prop.items || prop.oneOf || prop.anyOf || prop.allOf;
                    
                    if (canShowExample) {
                        let currentObjView = 'schema';
                        
                        const viewToggle = document.createElement('div');
                        viewToggle.className = 'view-toggle';
                        viewToggle.innerHTML = \`
                            <button class="view-toggle-btn" data-view="example">Example Value</button>
                            <button class="view-toggle-btn active" data-view="schema">Schema</button>
                        \`;
                        
                        const contentArea = document.createElement('div');
                        contentArea.className = 'property-content-area';
                        
                        const renderContent = () => {
                            contentArea.innerHTML = '';
                            viewToggle.querySelectorAll('.view-toggle-btn').forEach(btn => {
                                btn.classList.toggle('active', btn.dataset.view === currentObjView);
                            });
                            
                            if (currentObjView === 'example') {
                                const exampleDiv = document.createElement('div');
                                exampleDiv.className = 'object-example-view';
                                const exampleValue = generateExampleValue(prop, rootSchema, new Set());
                                const formattedJson = syntaxHighlightJson(JSON.stringify(exampleValue, null, 2));
                                exampleDiv.innerHTML = \`<pre>\${formattedJson}</pre>\`;
                                contentArea.appendChild(exampleDiv);
                            } else {
                                renderPropertyContent(contentArea, prop, rootSchema);
                            }
                        };
                        
                        viewToggle.addEventListener('click', (e) => {
                            const btn = e.target.closest('.view-toggle-btn');
                            if (btn && btn.dataset.view !== currentObjView) {
                                currentObjView = btn.dataset.view;
                                renderContent();
                            }
                        });
                        
                        container.appendChild(viewToggle);
                        container.appendChild(contentArea);
                        renderContent();
                    } else {
                        renderPropertyContent(container, prop, rootSchema);
                    }
                }
        
                /**
                 * Renders the content of a property.
                 * @param {HTMLElement} container The element to render the content into.
                 * @param {any} prop The property object.
                 * @param {any} rootSchema The root schema.
                 */
                function renderPropertyContent(container, prop, rootSchema) {
                    // Property details
                    const details = document.createElement('div');
                    details.className = 'property-details';
                    
                    let detailsHtml = '';
                    
                    if (prop.description) {
                        detailsHtml += \`<div class="property-detail-row"><span class="property-detail-label">Description:</span><span class="property-detail-value">\${escapeHtml(prop.description)}</span></div>\`;
                    }
                    if (prop.default !== undefined) {
                        detailsHtml += \`<div class="property-detail-row"><span class="property-detail-label">Default:</span><span class="property-detail-value">\${escapeHtml(JSON.stringify(prop.default))}</span></div>\`;
                    }
                    if (prop.example !== undefined) {
                        detailsHtml += \`<div class="property-detail-row"><span class="property-detail-label">Example:</span><span class="property-detail-value">\${escapeHtml(JSON.stringify(prop.example))}</span></div>\`;
                    }
                    if (prop.format) {
                        detailsHtml += \`<div class="property-detail-row"><span class="property-detail-label">Format:</span><span class="property-detail-value">\${escapeHtml(prop.format)}</span></div>\`;
                    }
                    if (prop.pattern) {
                        detailsHtml += \`<div class="property-detail-row"><span class="property-detail-label">Pattern:</span><span class="property-detail-value">\${escapeHtml(prop.pattern)}</span></div>\`;
                    }
                    if (prop.minimum !== undefined) {
                        detailsHtml += \`<div class="property-detail-row"><span class="property-detail-label">Minimum:</span><span class="property-detail-value">\${prop.minimum}</span></div>\`;
                    }
                    if (prop.maximum !== undefined) {
                        detailsHtml += \`<div class="property-detail-row"><span class="property-detail-label">Maximum:</span><span class="property-detail-value">\${prop.maximum}</span></div>\`;
                    }
                    if (prop.minLength !== undefined) {
                        detailsHtml += \`<div class="property-detail-row"><span class="property-detail-label">Min Length:</span><span class="property-detail-value">\${prop.minLength}</span></div>\`;
                    }
                    if (prop.maxLength !== undefined) {
                        detailsHtml += \`<div class="property-detail-row"><span class="property-detail-label">Max Length:</span><span class="property-detail-value">\${prop.maxLength}</span></div>\`;
                    }
                    if (prop.minItems !== undefined) {
                        detailsHtml += \`<div class="property-detail-row"><span class="property-detail-label">Min Items:</span><span class="property-detail-value">\${prop.minItems}</span></div>\`;
                    }
                    if (prop.maxItems !== undefined) {
                        detailsHtml += \`<div class="property-detail-row"><span class="property-detail-label">Max Items:</span><span class="property-detail-value">\${prop.maxItems}</span></div>\`;
                    }
                    if (prop.enum) {
                        detailsHtml += \`<div class="property-detail-row"><span class="property-detail-label">Enum Values:</span><span class="property-detail-value"><div class="enum-values">\${prop.enum.map(v => \`<span class="enum-value">\${escapeHtml(JSON.stringify(v))}</span>\`).join('')}</div></span></div>\`;
                    }
        
                    if (detailsHtml) {
                        details.innerHTML = detailsHtml;
                        container.appendChild(details);
                    }
        
                    // Nested properties for objects
                    if (prop.properties) {
                        const nested = document.createElement('div');
                        nested.className = 'nested-properties';
                        const required = prop.required || [];
                        renderProperties(nested, prop.properties, required, rootSchema);
                        container.appendChild(nested);
                    }
        
                    // Array items
                    if (prop.items) {
                        const itemsLabel = document.createElement('div');
                        itemsLabel.className = 'array-items-label';
                        itemsLabel.textContent = 'Array Items:';
                        container.appendChild(itemsLabel);
        
                        const resolvedItems = resolveRef(prop.items, rootSchema);
                        if (resolvedItems.properties) {
                            const nested = document.createElement('div');
                            nested.className = 'nested-properties';
                            const required = resolvedItems.required || [];
                            renderProperties(nested, resolvedItems.properties, required, rootSchema);
                            container.appendChild(nested);
                        } else {
                            const itemType = getType(resolvedItems);
                            const itemInfo = document.createElement('div');
                            itemInfo.innerHTML = \`<span class="property-type type-\${itemType}">\${itemType}</span>\`;
                            if (resolvedItems.description) {
                                itemInfo.innerHTML += \` <span class="property-description">\${escapeHtml(resolvedItems.description)}</span>\`;
                            }
                            container.appendChild(itemInfo);
                        }
                    }
        
                    // oneOf, anyOf, allOf
                    ['oneOf', 'anyOf', 'allOf'].forEach(keyword => {
                        if (prop[keyword]) {
                            const label = document.createElement('div');
                            label.className = 'array-items-label';
                            label.textContent = keyword + ':';
                            container.appendChild(label);
        
                            prop[keyword].forEach((subSchema, index) => {
                                const resolved = resolveRef(subSchema, rootSchema);
                                const subElement = renderProperty(\`Option \${index + 1}\`, resolved, false, rootSchema);
                                container.appendChild(subElement);
                            });
                        }
                    });
                }
        
                /**
                 * Renders a definition from the schema.
                 * @param {string} name The name of the definition.
                 * @param {any} def The definition object.
                 * @param {any} rootSchema The root schema.
                 * @returns {HTMLElement} The rendered definition element.
                 */
                function renderDefinition(name, def, rootSchema) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'schema-object';
                    wrapper.id = \`def-\${name}\`;
        
                    const resolvedDef = resolveRef(def, rootSchema);
                    const type = getType(resolvedDef);
                    const hasChildren = hasNestedContent(resolvedDef);
                    const description = resolvedDef.description || '';
                    const isImported = resolvedDef.__isImported || hasRemoteRef(def);
                    const isMissing = resolvedDef.__isMissing;
        
                    const header = document.createElement('div');
                    header.className = 'schema-object-header';
                    header.innerHTML = \`
                        \${hasChildren ? \`<svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>\` : '<div style="width: 24px;"></div>'}
                        <span class="property-name">\${escapeHtml(name)}</span>
                        <span class="property-type type-\${type}">\${type === 'missing' ? 'file not found' : type}</span>
                        \${isImported ? '<span class="imported-badge">imported</span>' : ''}
                        \${isMissing ? '<span class="missing-badge">file not found</span>' : ''}
                        \${description ? \`<span class="property-description">\${escapeHtml(description)}</span>\` : ''}
                    \`;
        
                    if (hasChildren) {
                        header.addEventListener('click', () => {
                            const content = wrapper.querySelector('.schema-object-content');
                            const icon = header.querySelector('.expand-icon');
                            content.classList.toggle('expanded');
                            icon.classList.toggle('expanded');
                        });
                    }
        
                    wrapper.appendChild(header);
        
                    if (hasChildren && !isMissing) {
                        const content = document.createElement('div');
                        content.className = 'schema-object-content';
                        renderPropertyContentWithToggle(content, resolvedDef, rootSchema);
                        wrapper.appendChild(content);
                    }
        
                    return wrapper;
                }
        
                /**
                 * Resolves a $ref pointer to its definition.
                 * @param {any} schema The schema object to resolve.
                 * @param {any} rootSchema The root schema.
                 * @returns {any} The resolved schema object.
                 */
                function resolveRef(schema, rootSchema) {
                    if (!schema || !schema.$ref) {
                        return schema || {};
                    }
        
                    const ref = schema.$ref;
                    const loadedSchemas = currentSchemaBundle || {};
        
                    let resolved = null;
                    let isImport = false;
                    let isMissing = false;

                    // Handle file-based refs with local pointers (e.g., "common_defs.schema.json#/$defs/EmailFormat")
                    if (ref.includes('.json#/')) {
                        const [fileName, localRef] = ref.split('#');
                        const externalSchema = loadedSchemas[fileName];
                        if (!externalSchema) {
                            return { $ref: ref, __isMissing: true };
                        }
        
                        let current = externalSchema;
                        const parts = localRef.split('/').slice(1);
                        for (const part of parts) {
                            if (current && typeof current === 'object' && part in current) {
                                current = current[part];
                            } else {
                                // Path part not found inside a valid file
                                return { $ref: ref, __isMissing: true };
                            }
                        }
                        resolved = current;
                        isImport = true;
                    }
                    // Handle file-only refs (e.g., "address.schema.json")
                    else if (ref.includes('.json')) {
                        const fileName = ref.split('/').pop();
                        resolved = loadedSchemas[fileName];
                        if (!resolved) {
                            return { $ref: ref, __isMissing: true };
                        }
                        isImport = true;
                    }
                    // Handle local refs (e.g., "#/$defs/myDef")
                    else if (ref.startsWith('#/')) {
                        let current = rootSchema;
                        const parts = ref.split('/').slice(1);
                        for (const part of parts) {
                             if (current && typeof current === 'object' && part in current) {
                                current = current[part];
                            } else {
                                // Local ref not found
                                return { $ref: ref, __isMissing: true };
                            }
                        }
                        resolved = current;
                    }
        
                    if (resolved && isImport) {
                        // Clone the resolved object and add the import flag
                        // to avoid modifying the original object in the bundle.
                        const cloned = { ...resolved };
                        Object.defineProperty(cloned, '__isImported', { value: true, enumerable: false });
                        return cloned;
                    }
        
                    return resolved || schema;
                }

        /**
         * Determines the type of a schema property.
         * @param {any} prop The property object.
         * @returns {string} The type of the property.
         */
        function getType(prop) {
            if (!prop) return 'any';
            if (prop.__isMissing) return 'missing';
            if (prop.$ref) return 'ref';
            if (prop.type) {
                if (Array.isArray(prop.type)) {
                    return prop.type.join(' | ');
                }
                return prop.type;
            }
            if (prop.enum) return 'enum';
            if (prop.oneOf) return 'oneOf';
            if (prop.anyOf) return 'anyOf';
            if (prop.allOf) return 'allOf';
            if (prop.properties) return 'object';
            if (prop.items) return 'array';
            return 'any';
        }

        /**
         * Checks if a property has nested content that can be expanded.
         * @param {any} prop The property object.
         * @returns {boolean} True if the property has nested content.
         */
        function hasNestedContent(prop) {
            if (!prop) return false;
            return !!(
                prop.properties ||
                prop.items ||
                prop.oneOf ||
                prop.anyOf ||
                prop.allOf ||
                prop.description ||
                prop.enum ||
                prop.default !== undefined ||
                prop.example !== undefined ||
                prop.format ||
                prop.pattern ||
                prop.minimum !== undefined ||
                prop.maximum !== undefined ||
                prop.minLength !== undefined ||
                prop.maxLength !== undefined
            );
        }

        /**
         * Renders the example view for a schema.
         * @param {HTMLElement} container The element to render the view into.
         * @param {any} schema The schema object.
         */
        function renderExampleView(container, schema) {
            const exampleDiv = document.createElement('div');
            exampleDiv.className = 'example-view';
            
            const exampleValue = generateExampleValue(schema, schema, new Set());
            const formattedJson = syntaxHighlightJson(JSON.stringify(exampleValue, null, 2));
            
            exampleDiv.innerHTML = \`<pre>\${formattedJson}</pre>\`;
            container.appendChild(exampleDiv);
        }

        /**
         * Generates an example value from a schema property.
         * @param {any} prop The property object.
         * @param {any} rootSchema The root schema.
         * @param {Set<string>} visitedRefs A set of visited $refs to prevent circular recursion.
         * @returns {any} An example value.
         */
        function generateExampleValue(prop, rootSchema, visitedRefs) {
            if (!prop) return null;

            // Resolve $ref
            if (prop.$ref) {
                if (visitedRefs.has(prop.$ref)) {
                    return '...';
                }
                visitedRefs.add(prop.$ref);
                const resolved = resolveRef(prop, rootSchema);
                const result = generateExampleValue(resolved, rootSchema, visitedRefs);
                visitedRefs.delete(prop.$ref);
                return result;
            }

            // Use example if provided
            if (prop.example !== undefined) {
                return prop.example;
            }

            // Use default if provided
            if (prop.default !== undefined) {
                return prop.default;
            }

            // Use first enum value if available
            if (prop.enum && prop.enum.length > 0) {
                return prop.enum[0];
            }

            // Use const if available
            if (prop.const !== undefined) {
                return prop.const;
            }

            // Handle oneOf/anyOf - use first option
            if (prop.oneOf && prop.oneOf.length > 0) {
                return generateExampleValue(prop.oneOf[0], rootSchema, visitedRefs);
            }
            if (prop.anyOf && prop.anyOf.length > 0) {
                return generateExampleValue(prop.anyOf[0], rootSchema, visitedRefs);
            }

            // Handle allOf - merge all schemas
            if (prop.allOf && prop.allOf.length > 0) {
                let merged = {};
                for (const subSchema of prop.allOf) {
                    const resolved = resolveRef(subSchema, rootSchema);
                    if (resolved.properties) {
                        const subExample = generateExampleValue(resolved, rootSchema, visitedRefs);
                        merged = { ...merged, ...subExample };
                    }
                }
                return merged;
            }

            const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;

            switch (type) {
                case 'object':
                    if (prop.properties) {
                        const obj = {};
                        for (const [key, value] of Object.entries(prop.properties)) {
                            obj[key] = generateExampleValue(value, rootSchema, visitedRefs);
                        }
                        return obj;
                    }
                    return {};

                case 'array':
                    if (prop.items) {
                        const itemExample = generateExampleValue(prop.items, rootSchema, visitedRefs);
                        return [itemExample];
                    }
                    return [];

                case 'string':
                    if (prop.format === 'date-time') return new Date().toISOString();
                    if (prop.format === 'date') return new Date().toISOString().split('T')[0];
                    if (prop.format === 'time') return '12:00:00';
                    if (prop.format === 'email') return 'user@example.com';
                    if (prop.format === 'uri' || prop.format === 'url') return 'https://example.com';
                    if (prop.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
                    if (prop.minLength) return 'x'.repeat(prop.minLength);
                    return 'string';

                case 'number':
                case 'integer':
                    if (prop.minimum !== undefined) return prop.minimum;
                    if (prop.maximum !== undefined) return prop.maximum;
                    return type === 'integer' ? 0 : 0.0;

                case 'boolean':
                    return true;

                case 'null':
                    return null;

                default:
                    // Try to infer from properties
                    if (prop.properties) {
                        const obj = {};
                        for (const [key, value] of Object.entries(prop.properties)) {
                            obj[key] = generateExampleValue(value, rootSchema, visitedRefs);
                        }
                        return obj;
                    }
                    if (prop.items) {
                        return [generateExampleValue(prop.items, rootSchema, visitedRefs)];
                    }
                    return null;
            }
        }

        /**
         * Basic syntax highlighting for JSON.
         * @param {string} json The JSON string.
         * @returns {string} HTML string with syntax highlighting.
         */
        function syntaxHighlightJson(json) {
            return json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\\"])*")(\\s*:)?/g, function (match) {
                    let cls = 'json-string';
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    }
                    return '<span class=\\"' + cls + '\\">' + match + '</span>';
                })
                .replace(/\\b(true|false)\\b/g, '<span class=\\"json-boolean\\">$1</span>')
                .replace(/\\bnull\\b/g, '<span class=\\"json-null\\">null</span>')
                .replace(/\\b(-?\\d+(\\.\\d+)?([eE][+-]?\\d+)?)\\b/g, '<span class=\\"json-number\\">$1</span>');
        }

        /**
         * Escapes HTML characters in a string.
         * @param {string} text The string to escape.
         * @returns {string} The escaped string.
         */
        function escapeHtml(text) {
            if (typeof text !== 'string') return text;
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    `;
}
