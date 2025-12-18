/**
 * This function returns a string containing all the CSS styles for the webview.
 * It includes styles for both light and dark themes, using CSS variables
 * to adapt to the user's VS Code theme.
 *
 * @returns {string} The CSS styles for the webview.
 */
export function getStyles(): string {
  return `
        :root {
            --bg-color: #1e1e1e;
            --text-color: #d4d4d4;
            --border-color: #3c3c3c;
            --header-bg: #252526;
            --type-string: #ce9178;
            --type-number: #b5cea8;
            --type-boolean: #569cd6;
            --type-array: #dcdcaa;
            --type-object: #4ec9b0;
            --type-null: #808080;
            --required-color: #d18616; /* Orange */
            --missing-color: #f14c4c; /* Red */
            --description-color: #6a9955;
            --property-name: #9cdcfe;
            --expand-icon: #808080;
            --hover-bg: #2a2d2e;
        }

        @media (prefers-color-scheme: light) {
            :root {
                --bg-color: #ffffff;
                --text-color: #333333;
                --border-color: #e0e0e0;
                --header-bg: #f5f5f5;
                --type-string: #a31515;
                --type-number: #098658;
                --type-boolean: #0000ff;
                --type-array: #795e26;
                --type-object: #267f99;
                --type-null: #808080;
                --required-color: #b85a00; /* Darker Orange */
                --missing-color: #d32f2f; /* Darker Red */
                --description-color: #008000;
                --property-name: #001080;
                --expand-icon: #666666;
                --hover-bg: #f0f0f0;
            }
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif);
            font-size: 13px;
            line-height: 1.5;
            color: var(--text-color);
            background-color: var(--bg-color);
            padding: 16px;
        }

        .schema-container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .schema-header {
            background: var(--header-bg);
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 16px;
            border: 1px solid var(--border-color);
        }

        .schema-title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--type-object);
        }

        .schema-description {
            color: var(--description-color);
            font-style: italic;
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
            color: var(--type-string);
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
    `;
}
