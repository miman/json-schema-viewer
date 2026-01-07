# Standalone JSON Schema Viewer

Runs the same viewer UI as the VS Code extension, but as a standalone React web app.

## Run

From the repo root:

- `npm install`
- `npm run standalone:dev`

## Load a schema

- Default: renders `examples/example.schema.json`
- From URL: open `http://localhost:5173/?url=https://.../your.schema.json`

Note: the URL must allow CORS for the browser to fetch it.
