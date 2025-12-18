# Install plugin

This is how you manually install the VS Code extension from the generated VSIX file:

## Method 1: Download and Install from GitHub Release (Recommended)

Since this is a private repository, you need to download the VSIX file first, then install it:

1. **Download the VSIX file:**
   - Go to the [Releases page](https://github.com/miman/json-schema-viewer/releases)
   - Find the version you want to install
   - Click on the `.vsix` file to download it (e.g., `json-schema-viewer-1.0.1.vsix`)

2. **Install the downloaded file:**
   ```bash
   code --install-extension json-schema-viewer-1.0.1.vsix
   ```
   Replace `1.0.1` with the actual version number of the downloaded VSIX file.

## Method 2: Install via VS Code UI

Alternative installation method using VS Code's interface:

1. Download the `.vsix` file from the [Releases page](https://github.com/miman/json-schema-viewer/releases)
2. Open VS Code
3. Go to Extensions view (`Ctrl+Shift+X`)
4. Click the "..." menu (three dots) in the Extensions view
5. Select "Install from VSIX..."
6. Browse and select the downloaded `.vsix` file
7. VS Code will install the extension and prompt you to reload
