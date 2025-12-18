# Technical info regarding the project

## Requirements

- VS Code 1.74.0 or higher
- Works with JavaScript and TypeScript files

## Development

1. Clone this repository
2. Run `npm install` to install dependencies
3. Press `F5` to open a new Extension Development Host window
4. Test the extension in the new window

## Building

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch
```

Press `F5` in VS Code to launch the Extension Development Host.

This will open a VS Code instance with some exmaple JSON schema files

## Creating a VSIX package

```bash
npm run package
```

## License

MIT
