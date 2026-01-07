# JSON Schema Viewer

This is a VS Code extension that allows you to preview JSON Schema files.

## Installation

More info on how you install this VS Code extension can be found in the [installation guide](installation.md).

## Technical info

More info on the technical details of this VS Code extension can be found [here](TechnicalInfo.md).

## Other ways to use the project

### Standalone (React)

This repo also includes a standalone React web app that renders the same viewer UI (useful for running the viewer outside VS Code and for reusing it in Backstage).

- Dev server: `npm run standalone:dev`
- Build: `npm run standalone:build`

See [standalone/README.md](../standalone/README.md) for details.

### Reuse in Backstage

The viewer UI is available as a small React wrapper component in `web/react/SchemaViewer.tsx`, backed by a DOM renderer in `web/viewerDom.ts`.
Backstage can consume the same component (or copy it into a Backstage plugin) so the standalone and Backstage views stay as close as possible.
