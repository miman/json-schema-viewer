/**
 * This function returns a string containing all the CSS styles for the schema viewer.
 * It includes styles for both light and dark themes, using CSS variables.
 *
 * @returns {string} The CSS styles for the viewer.
 */
export function getStyles(): string {
  return `
        .schema-container {
            --bg-color: #1e1e1e;
            --text-color: #d4d4d4;
            --border-color: #3c3c3c;
            --header-bg: #252526;
            --type-string: #ce9178;
            --type-number: #b5cea8;
            --type-boolean: #569cd6;
            --type-array: #dcdcaa;
            --type-object: #4ec9b0;
            --type-enum: #8a2be2; /* purple */
            --type-null: #808080;
            --required-color: #d18616; /* Orange */
            --missing-color: #f14c4c; /* Red */
            --description-color: #6a9955;
            --property-name: #9cdcfe;
            --expand-icon: #808080;
            --hover-bg: #2a2d2e;
        }

        @media (prefers-color-scheme: light) {
            .schema-container {
                --bg-color: #ffffff;
                --text-color: #333333;
                --border-color: #e0e0e0;
                --header-bg: #f5f5f5;
                --type-string: #a31515;
                --type-number: #098658;
                --type-boolean: #0000ff;
                --type-array: #795e26;
                --type-object: #267f99;
                --type-enum: #6a00d9;
                --type-null: #808080;
                --required-color: #b85a00; /* Darker Orange */
                --missing-color: #d32f2f; /* Darker Red */
                --description-color: #008000;
                --property-name: #001080;
                --expand-icon: #666666;
                --hover-bg: #f0f0f0;
            }
        }

        .schema-container {
            width: 100%;
            margin: 0 auto;
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif);
            font-size: 13px;
            line-height: 1.5;
            color: var(--text-color);
            background-color: var(--bg-color);
            padding: 16px;
            box-sizing: border-box;
            text-align: left;
        }

        .schema-container.normal-view {
            max-width: 1200px;
        }

        .schema-container * {
            box-sizing: border-box;
        }

        .schema-header {
            background: var(--header-bg);
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 16px;
            border: 1px solid var(--border-color);
        }

        .schema-header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .schema-title {
            font-size: 24px;
            font-weight: 600;
            color: var(--type-object);
        }

        .view-selector {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
            font-size: 12px;
            color: var(--expand-icon);
        }

        .view-switch {
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .view-switch-label {
            font-size: 12px;
            color: var(--expand-icon);
            user-select: none;
        }

        .view-switch-checkbox {
            appearance: none;
            width: 33px;
            height: 18px;
            border-radius: 18px;
            background: var(--border-color);
            position: relative;
            cursor: pointer;
            outline: none;
            display: inline-block;
            vertical-align: middle;
            transition: background 0.15s ease;
        }

        .view-switch-checkbox::after {
            content: '';
            position: absolute;
            top: 3px;
            left: 3px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--bg-color);
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            transition: transform 0.15s ease;
        }

        .view-switch-checkbox:checked::after {
            transform: translateX(15px);
        }

        .view-switch-left {
            margin-right: 6px;
        }

        .view-switch-right {
            margin-left: 6px;
        }

        .active-link-label {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--expand-icon);
            cursor: pointer;
            user-select: none;
            font-style: normal;
            white-space: nowrap;
        }

        .active-link-checkbox {
            appearance: none;
            width: 16px;
            height: 16px;
            border: 1px solid var(--border-color);
            border-radius: 3px;
            cursor: pointer;
            position: relative;
            background: var(--bg-color);
        }

        .active-link-checkbox:checked {
            background: var(--type-boolean);
            border-color: var(--type-boolean);
        }

        .active-link-checkbox:checked::after {
            content: '✓';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: var(--bg-color);
            font-size: 12px;
            font-weight: bold;
        }

        .source-highlight {
            background-color: rgba(255, 255, 0, 0.2) !important;
            outline: 2px solid rgba(255, 255, 0, 0.4);
            outline-offset: -2px;
        }

        .schema-object-header[data-source-line]:hover {
            cursor: pointer;
        }

        .schema-description {
            color: var(--description-color);
            font-style: italic;
        }

        .active-link-bottom-row {
            margin-top: 8px;
        }

        .schema-meta {
            display: flex;
            gap: 16px;
            margin-top: 12px;
            font-size: 12px;
        }

        .schema-meta-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .schema-meta-label {
            color: var(--expand-icon);
        }

        .schema-meta-value {
            color: var(--type-string);
        }

        .definitions-section {
            margin-top: 24px;
        }

        .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--border-color);
        }

        .schema-object {
            border: 1px solid var(--border-color);
            border-radius: 6px;
            margin-bottom: 8px;
            overflow: hidden;
        }

        .schema-object-header {
            display: flex;
            align-items: center;
            padding: 10px 12px;
            background: var(--header-bg);
            cursor: pointer;
            user-select: none;
            transition: background-color 0.15s ease;
        }

        .schema-object-header:hover {
            background: var(--hover-bg);
        }

        .expand-icon {
            width: 16px;
            height: 16px;
            margin-right: 8px;
            color: var(--expand-icon);
            transition: transform 0.2s ease;
            flex-shrink: 0;
        }

        .expand-icon.expanded {
            transform: rotate(90deg);
        }

        .property-name {
            font-weight: 600;
            color: var(--property-name);
            margin-right: 8px;
        }

        .property-type {
            font-size: 12px;
            padding: 2px 8px;
            border-radius: 4px;
            margin-right: 8px;
        }

        .type-string { background: rgba(206, 145, 120, 0.2); color: var(--type-string); }
        .type-integer, .type-number { background: rgba(181, 206, 168, 0.2); color: var(--type-number); }
        .type-boolean { background: rgba(86, 156, 214, 0.2); color: var(--type-boolean); }
        .type-array { background: rgba(220, 220, 170, 0.2); color: var(--type-array); }
        .type-object { background: rgba(78, 201, 176, 0.2); color: var(--type-object); }
        .type-enum { background: rgba(138, 43, 226, 0.12); color: var(--type-enum); }
        .type-null { background: rgba(128, 128, 128, 0.2); color: var(--type-null); }

        .required-badge {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            background: rgba(209, 134, 22, 0.2);
            color: var(--required-color);
            margin-right: 8px;
            text-transform: uppercase;
            font-weight: 600;
        }

        .missing-badge {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            background: rgba(241, 76, 76, 0.2);
            color: var(--missing-color);
            margin-right: 8px;
            text-transform: uppercase;
            font-weight: 600;
        }

        .imported-badge {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            background: rgba(86, 156, 214, 0.2);
            color: var(--type-boolean);
            margin-right: 8px;
            text-transform: uppercase;
            font-weight: 600;
        }


        .property-description {
            color: var(--description-color);
            font-size: 12px;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .schema-object-content {
            display: none;
            padding: 12px;
            border-top: 1px solid var(--border-color);
        }

        .schema-object-content.expanded {
            display: block;
        }

        .property-details {
            font-size: 12px;
            margin-bottom: 12px;
            padding: 8px;
            background: var(--header-bg);
            border-radius: 4px;
        }

        .property-detail-row {
            display: flex;
            margin-bottom: 4px;
        }

        .property-detail-row:last-child {
            margin-bottom: 0;
        }

        .property-detail-label {
            color: var(--expand-icon);
            min-width: 120px;
        }

        .property-detail-value {
            color: var(--text-color);
        }

        .nested-properties {
            margin-left: 16px;
            padding-left: 16px;
            border-left: 2px solid var(--border-color);
        }

        .array-items-label {
            font-size: 11px;
            color: var(--expand-icon);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .enum-values {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 4px;
        }

        .enum-value {
            font-size: 11px;
            padding: 2px 6px;
            background: var(--header-bg);
            border: 1px solid var(--border-color);
            border-radius: 3px;
            color: var(--type-enum);
        }

        .ref-link {
            color: var(--type-object);
            cursor: pointer;
            text-decoration: underline;
        }

        .ref-link:hover {
            opacity: 0.8;
        }

        .no-properties {
            color: var(--expand-icon);
            font-style: italic;
            padding: 8px;
        }

        .root-type-badge {
            font-size: 12px;
            padding: 4px 12px;
            border-radius: 4px;
            display: inline-block;
            margin-top: 8px;
        }

        .view-toggle {
            display: inline-flex;
            margin-bottom: 12px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            overflow: hidden;
            font-size: 11px;
        }

        .view-toggle-btn {
            padding: 4px 12px;
            border: none;
            background: transparent;
            color: var(--text-color);
            cursor: pointer;
            font-size: 11px;
            font-family: inherit;
            transition: background-color 0.15s ease;
        }

        .view-toggle-btn:hover {
            background: var(--hover-bg);
        }

        .view-toggle-btn.active {
            background: var(--type-object);
            color: #ffffff;
        }

        .view-toggle-btn:first-child {
            border-right: 1px solid var(--border-color);
        }

        .object-example-view {
            background: var(--bg-color);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 12px;
            margin-top: 8px;
            overflow-x: auto;
        }

        .object-example-view pre {
            margin: 0;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .example-view {
            background: var(--header-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 16px;
            overflow-x: auto;
        }

        .example-view pre {
            margin: 0;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .example-view .json-key {
            color: var(--property-name);
        }

        .example-view .json-string {
            color: var(--type-string);
        }

        .example-view .json-number {
            color: var(--type-number);
        }

        .example-view .json-boolean {
            color: var(--type-boolean);
        }

        .example-view .json-null {
            color: var(--type-null);
        }

        /* Styles for the new Imported Files section */
        .imported-files-container {
            margin-top: 12px; /* Adjust margin as section-title now precedes it */
            padding: 16px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background: var(--header-bg);
        }

        .imported-files-container ul {
            list-style: none; /* Remove default list bullets */
            padding-left: 0;
        }

        .imported-files-container li {
            margin-bottom: 8px;
            color: var(--text-color);
        }

        /* Tree View Styles */
        .tree-view-wrapper {
            width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 20px 0;
            display: block;
        }

        .tree-view-container {
            position: relative;
            display: inline-flex;
            min-width: 100%;
            padding-bottom: 40px;
        }

        .tree-nodes-container {
            display: flex;
            gap: 60px;
            z-index: 1;
        }

        .tree-column {
            display: flex;
            flex-direction: column;
            gap: 20px;
            justify-content: center;
        }

        .tree-node {
            background: var(--header-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 12px;
            min-width: 180px;
            max-width: 300px;
            position: relative;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            cursor: default;
        }

        .tree-node:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            border-color: var(--type-object);
        }

        .tree-node-header {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .tree-node-title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 2px;
        }

        .tree-node-meta {
            font-size: 11px;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .tree-node-meta-item {
            color: var(--text-color);
            opacity: 0.9;
        }

        .tree-node-meta-item code {
            background: rgba(0,0,0,0.1);
            padding: 1px 4px;
            border-radius: 3px;
            font-family: 'Consolas', monospace;
        }

        .tree-enum-values {
            color: var(--type-string);
            font-size: 10px;
            word-break: break-all;
        }

        .tree-node-header .property-name {
            margin-right: 0;
            font-size: 14px;
        }

        .tree-node-description {
            font-size: 11px;
            color: var(--description-color);
            margin-top: 8px;
            border-top: 1px solid var(--border-color);
            padding-top: 8px;
            font-style: italic;
        }

        .tree-node-toggle {
            position: absolute;
            right: -12px;
            top: 50%;
            transform: translateY(-50%);
            width: 20px;
            height: 20px;
            background: var(--type-object);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            cursor: pointer;
            border: 2px solid var(--bg-color);
            z-index: 2;
        }

        .tree-connectors {
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 0;
        }

        .tree-connector-line {
            fill: none;
            stroke: var(--border-color);
            stroke-width: 1.5px;
            transition: stroke 0.2s ease;
        }

        .tree-node:hover + .tree-connector-line {
            stroke: var(--type-object);
        }
    `;
}
