
# OpenAPI/JSON Schema → Draw.io Information Model Generator (Node.js)

**Date:** 2025‑12‑19  
**Owner:** Mikael Thorman  
**Status:** Draft Technical Specification v1.0

---

## 1. Overview

Build a **Node.js** tool that transforms an **OpenAPI** (3.x / Swagger 2.0) or **JSON Schema** document into a **draw.io (diagrams.net) information model** rendered as **UML‑style classes** with attributes and associations. Users will **open the `.drawio` in the draw.io editor**, manually **move/re‑route** entities and connectors to achieve a good visual layout, and the tool will **preserve that layout** across subsequent regenerations when the source spec changes.

> **Why draw.io as the canonical artifact?**  
> Draw.io’s file format is XML (mxGraph); **node geometry and edge routing** are persisted, enabling reliable **layout round‑trip** in a way text‑based formats (e.g., Mermaid) do not guarantee. Draw.io supports import/export of draw.io XML and editing in web/desktop clients.  
> **References:**  
> - Draw.io import formats and sources (diagrams.net): <https://www.drawio.com/blog/import-formats>  
> - Draw.io is based on mxGraph; `.drawio` files are XML storing geometry/styles: <https://docsopensource.github.io/docs/Popular_Projects/6.73_drawIO>  
> - Mermaid insertion behavior in draw.io (auto‑layout; editing nuances): <https://www.drawio.com/blog/mermaid-diagrams> and discussion: <https://stackoverflow.com/questions/78942145/draw-io-desktop-windows-how-to-edit-an-inserted-mermaid-diagram>

---

## 2. Goals & Non‑Goals

### Goals

- Generate a **native draw.io diagram** of data entities:
  - One **class** per schema/entity.
  - **Attributes** for properties (types, required/optional).
  - **Associations** for referenced objects and arrays of references (with multiplicity).
- **Round‑trip preservation**: read previous `.drawio` and **reuse** positions (`x,y,w,h`) and connector **waypoints/ports**.
- Incrementally **add/update/remove** elements per spec changes without disturbing existing layout.
- Provide a **CLI** and **programmatic API** for local and CI use.
- Offer configurable **style/mapping rules** (composition vs. association, enum handling, inheritance mapping).
- Optional secondary output: **Mermaid `classDiagram`** for previews (non‑canonical).

### Non‑Goals (initial)

- Full UML semantics (all stereotypes/constraints).
- Advanced auto‑layout (simple heuristics for new nodes).
- Sequence diagrams, BPMN, or non‑data models.

---

## 3. Inputs & Outputs

### Inputs

- `openapi.yaml|json` (OpenAPI 3.x / Swagger 2.0) **or** `schema.json` (standalone JSON Schema).
- Optional **previous** diagram: `model.drawio` (**uncompressed XML preferred** for diff/tooling).
- Optional configuration file: `model.config.json`.

> **References:**  
> - Uncompressed XML export helps tooling/diffing: <https://www.drawio.com/blog/import-formats> and macro/processing examples: <https://www.idera.com/blogs/macros-import-objects-from-a-diagrams-net-xml-file/>

### Outputs

- Updated `model.drawio` (native draw.io XML) that opens/edits in draw.io web/desktop.
- Optional: `model.mmd` (Mermaid `classDiagram`) for preview only.

---

## 4. Users & Key Journeys

- **Architect/Developer**
  1. Run `generate` with a spec → get `model.drawio`.
  2. Open in draw.io, rearrange nodes/connectors, save.
  3. Update spec → re‑run `generate` with previous `.drawio` → **layout preserved**, new items placed minimally.

- **CI pipeline**
  - Validate spec → (optionally) regenerate diagram → publish artifact or fail on drift.

---

## 5. Functional Requirements

### FR‑1 Parsing

- Support:
  - **OpenAPI 3.x** (`components.schemas.*`), **Swagger 2.0** (`definitions.*`).
  - **JSON Schema** (single root or modular).
- Resolve `$ref` definitions (local/external) and build a **dereferenced model**.

### FR‑2 Class & Attribute Mapping

- **Entity → Class**: schema key becomes class name.
- **Property → Attribute**: `name: type`.
- **Required**: mark distinctly (e.g., `+prop` prefix or bold).
- **Types**:
  - primitives (`string`, `integer`, `number`, `boolean`),
  - arrays (`T[]`),
  - `$ref` (object type).
- **Enums**: inline union (`A|B|C`) or separate enum classes (config).

### FR‑3 Relationships

- `$ref` property → **association** (or **composition** if embedded semantics preferred; configurable).
- Array of `$ref` → association with multiplicity `"0..*"`.
- Edge **labels**: property name; **arrowheads** per relation type (style).

### FR‑4 Inheritance / Polymorphism

- `allOf`: treat as merged attributes or true inheritance (`Base <|-- Sub`, configurable).
- `oneOf` / `anyOf`: represent as generalization or annotate as union.

### FR‑5 Layout Preservation

- Assign **stable IDs**:
  - Classes: `entity:<Name>`
  - Edges: `edge:<Owner>.<prop>` (or `edge:<source>-<target>-<label>`)
- On regeneration:
  - Parse previous `.drawio`, build **layout index** for IDs:
    - Classes: `{x,y,width,height,page,layer}`
    - Edges: `{points[], sourcePort?, targetPort?}`
  - **Reuse** geometry for matched IDs.
  - **Place new** nodes near related ones (heuristics) or in a free grid area.
  - **Remove or park** deleted items (config: remove vs. move to a “Deprecated” layer).

### FR‑6 Styling & Formatting

- Default theme (font, colors) and **UML‑like class compartments**:
  - Option A: rectangle + HTML label (`html=1`).
  - Option B: draw.io **UML stencil** style (style strings).
- Edge styles: solid/dashed, arrowheads.

### FR‑7 Pages & Layers (Optional)

- Rules to assign entities to pages/layers (e.g., by tag/namespace).
- Preserve assignments across runs.

### FR‑8 CLI & Config

- CLI commands:
  - `generate --spec <path> [--in <model.drawio>] --out <model.drawio> [--config <config.json>] [--mermaid <model.mmd>]`
  - `check --spec <path> [--in <model.drawio>] [--config <config.json>] --report <diff.json>`
- Config options:
  - mapping (composition/association),
  - enum handling,
  - inheritance strategy,
  - required marker,
  - placement strategy,
  - page/layer rules,
  - ID naming conventions.

### FR‑9 Validation & Errors

- Validate input spec (missing schemas, bad `$ref`s).
- Clear error messages; non‑zero exit codes for CI.

---

## 6. Non‑Functional Requirements

- **Determinism**: same spec + same prior layout → identical geometry.
- **Performance**: handle hundreds of entities (100–500) in seconds.
- **Idempotence**: no spurious changes when spec/layout unchanged.
- **Portability**: `.drawio` editable in draw.io web/desktop; import/export documented by draw.io.
- **Maintainability**: isolated mapping & style layers; unit/integration tests.
- **Security**: no remote execution; safe file handling.

> **References:**  
> - Draw.io editor/import/export basics: <https://www.drawio.com/blog/import-formats>  
> - `.drawio` XML/mxGraph background: <https://docsopensource.github.io/docs/Popular_Projects/6.73_drawIO>

---

## 7. Architecture
```
+---------------------------+
|          CLI/API          |
+------------+--------------+
|
v
+---------------------------+     +---------------------------+
| Spec Loader & Dereferencer| --> | Conceptual Model Builder  |
| (OpenAPI/JSON Schema)     |     | (Entities/Attrs/Relations)|
+---------------------------+     +---------------------------+
|                                      |
v                                      v
+---------------------------+     +---------------------------+
| Previous .drawio Reader   | --> | Layout Reconciler         |
| (mxGraph XML → Layout idx)|     | (reuse geometry; place new)|
+---------------------------+     +---------------------------+
__________________________________/
|
v
+---------------------------+
| .drawio XML Writer        |
| (mxGraphModel)            |
+---------------------------+
|
v
model.drawio
```

**Design choice:** Treat the **previous `.drawio`** as the **layout source of truth**; persist stable IDs to ensure reliable lookup and reuse of geometry/routing.

---

## 8. Data Model

### 8.1 Conceptual Graph

```ts
type Entity = {
  key: string;             // schema name (stable)
  title?: string;
  description?: string;
  attributes: Attribute[];
  page?: string;
  layer?: string;
};

type Attribute = {
  name: string;
  type: string;            // e.g., string, int, User, User[]
  required: boolean;
  enum?: string[];
  description?: string;
};

type Relation = {
  key: string;             // stable (e.g., "OrderItem.product")
  source: string;          // entity key
  target: string;          // entity key
  label: string;           // property name
  kind: 'association' | 'composition';
  multiplicity?: '1' | '0..1' | '0..*' | '1..*';
  page?: string;
  layer?: string;
};
```

### 8.2 Layout Index (from previous .drawio)
```
type ClassLayout = {
  id: string;              // "entity:<Name>"
  x: number; y: number; w: number; h: number;
  page?: string; layer?: string;
};

type EdgeLayout = {
  id: string;              // "edge:<Owner>.<prop>"
  points?: Array<{x:number,y:number}>;
  sourcePort?: string; targetPort?: string;
  page?: string; layer?: string;
};

type LayoutIndex = {
  classes: Record<string, ClassLayout>;
  edges:   Record<string, EdgeLayout>;
};
```

9. Mapping Rules (Defaults)

* Class name: schema key (User, OrderItem, …).
* Attributes: propName: type; required prefixed with + (configurable).
* Enums: inline union (A|B|C); optional separate enum class.
* Relationships:
  * $ref → composition (*--) if embedded (default); otherwise association (-->).
  * array of $ref → association --> "0..*" to target.
* Inheritance:
  * allOf → merge attributes (default).
  * oneOf/anyOf → annotate union.

References:

Mermaid insertion (for previews) and auto‑layout behavior: <https://www.drawio.com/blog/mermaid-diagrams>
Draw.io XML/mxGraph model (for persisting geometry): <https://docsopensource.github.io/docs/Popular_Projects/6.73_drawIO>



## 10.  Regeneration Algorithm

* Load & dereference spec.
* Build conceptual graph (entities, attributes, relations).
* Read previous .drawio (if provided):
  * Parse mxGraph XML → build LayoutIndex by stable IDs.
* Assign geometry:
  * If id exists in LayoutIndex → reuse x,y,w,h for classes; reuse edge route/ports.
  * Else → place new nodes using heuristics:
    * Try placing near related existing node (offset grid).
    * Else pick next free grid slot.
* Write .drawio:
  * Emit mxGraphModel with:
    * One mxCell per class (style + HTML label / UML stencil).
    * One mxCell per edge (source/target refs; geometry points if any).
  * Persist stable IDs and page/layer assignments.
* (Optional) Emit Mermaid (classDiagram) for quick preview.


1.  CLI Specification
Commands
```
openapi-to-drawio generate \
  --spec ./openapi.yaml \
  --out  ./model.drawio \
  [--in ./previous.drawio] \
  [--config ./model.config.json] \
  [--mermaid ./model.mmd] \
  [--page MainModel] \
  [--layer Default]

openapi-to-drawio check \
  --spec ./openapi.yaml \
  [--in ./model.drawio] \
  [--config ./model.config.json] \
  --report ./diff.json
```

Options (selected)

* --spec: path to OpenAPI/JSON Schema.
* --in: existing .drawio for layout reuse.
* --out: output .drawio.
* --mermaid: optional Mermaid output file.
* --config: JSON config file (see below).
* --page, --layer: override defaults for new items.
* --strict: fail on unresolved $ref / collisions.
* --verbose: detailed logs.


## 12. Configuration Schema (model.config.json)
```
{
  "styling": {
    "classStyle": "rectHtml",         // rectHtml | umlStencil
    "fontFamily": "Segoe UI",
    "fontSize": 12,
    "requiredAttrPrefix": "+"
  },
  "mapping": {
    "compositionForEmbedded": true,
    "enumMode": "inline"              // inline | class
  },
  "inheritance": {
    "allOfMode": "inheritance",       // inheritance | merge
    "oneOfMode": "union",             // union | inheritance
    "anyOfMode": "union"
  },
  "placement": {
    "gridSize": 50,
    "newNodeOffset": { "x": 120, "y": 0 },
    "maxPerRow": 8
  },
  "partitioning": {
    "pagesByTag": false,
    "layersByNamespace": false
  },
  "ids": {
    "classIdFormat": "entity:{name}",
    "edgeIdFormat": "edge:{owner}.{prop}"
  },
  "deletionPolicy": "remove"          // remove | deprecatedLayer
}

```

## 13.  Programmatic API (Node)
```
import { generate, check } from '@your-scope/openapi-to-drawio';

await generate({
  specPath: './openapi.yaml',
  inDrawioPath: './model.drawio',     // optional
  outDrawioPath: './model.drawio',
  configPath: './model.config.json',  // optional
  mermaidPath: './model.mmd'          // optional
});

const report = await check({
  specPath: './openapi.yaml',
  inDrawioPath: './model.drawio'
});
console.log(report);

```

## 14.  Technology Choices

* Parsing/Dereference: @apidevtools/swagger-parser (OpenAPI/Swagger)
* YAML: js-yaml
* XML: fast-xml-parser (or xml-js) to read/write draw.io XML (mxGraph)
* CLI: commander or yargs
* Distribution: npm


References:

Draw.io import/export and editor behavior: <https://www.drawio.com/blog/import-formats>
mxGraph/XML details behind draw.io: <https://docsopensource.github.io/docs/Popular_Projects/6.73_drawIO>
Mermaid insertion docs: <https://www.drawio.com/blog/mermaid-diagrams>



## 15. Error Handling & Logging

* Validation errors: unresolved $ref, missing components.schemas, name collisions → non‑zero exit with actionable messages.
* Diagnostics: --verbose prints model stats, entity counts, layout reuse ratio.
* Diff report: lists added/changed/removed entities/relations.


## 16. Performance & Scalability

Targets: 100–500 classes, thousands of attributes, hundreds of edges.
Memory: stream reading XML; avoid holding giant strings; compact layout index (maps by ID).
Time: seconds to tens of seconds on typical developer hardware.


## 17. Security Considerations

* No remote code execution.
* File I/O only; caution when parsing specs from untrusted sources.
* Path handling: normalize/resolve; avoid directory traversal.


## 18. Testing Strategy

* Unit tests: mapping rules (types, enums, inheritance).
* Integration tests: end‑to‑end generate → manual layout fixture → regenerate (preserve geometry).
* Golden tests: .drawio snapshots for small specs.
* Error tests: bad $refs; conflicting names; empty schemas.
* Performance tests: synthetic models (N=100/250/500).

## 19. Compatibility Matrix

* Node.js: ≥ 18 LTS.
* Draw.io: web editor (app.diagrams.net) and desktop; .drawio XML supported across clients.
* Mermaid: supported in draw.io via Arrange → Insert → Mermaid (preview only; non‑canonical).


References:

Draw.io formats: <https://www.drawio.com/blog/import-formats>
Mermaid in draw.io: <https://www.drawio.com/blog/mermaid-diagrams>



## 20. Roadmap (v1 → v1.x)

* v1.0: Core mapping, layout preservation, CLI, config, optional Mermaid output.
* v1.1: Pages/layers partitioning; rename map to preserve layout across schema renames.
* v1.2: Advanced styling (UML stencil presets); improved placement heuristics.
* v1.3: CI helpers (GitHub Action); diff visualizations.


## 21. Acceptance Criteria

* Generate a .drawio from a spec with ≥50 schemas; opens in draw.io with classes/associations.
* After manual layout, regeneration preserves positions and edge routes for unchanged elements, introduces new ones with minimal disturbance.
* Configurable mapping/styling applied correctly; required attributes are distinguishable.
* Clear errors on invalid specs; deterministic output across runs.

## 22. References

* Draw.io import formats & sources: <https://www.drawio.com/blog/import-formats>
* Draw.io / mxGraph, XML structure background: <https://docsopensource.github.io/docs/Popular_Projects/6.73_drawIO>
* Mermaid insertion & behavior in draw.io: <https://www.drawio.com/blog/mermaid-diagrams>
* Editing Mermaid in draw.io (Image vs Diagram behavior): <https://stackoverflow.com/questions/78942145/draw-io-desktop-windows-how-to-edit-an-inserted-mermaid-diagram>

## 23. Open Questions (for finalization)

1. UML class styling: rectangle + HTML vs. draw.io UML stencil?
2. Composition vs. association: global default or per‑property heuristics?
3. Enum modeling: inline vs. separate enum classes?
4. Page/layer rules: split by tags/namespaces/modules?
5. Rename map: support explicit renames to preserve layout?
6. Deletion policy: immediate removal vs. move to “Deprecated” layer?

---

## 24. Short Solution Summary
We’ll implement a Node.js generator that treats the previous .drawio diagram as the layout source of truth. 

Each class/edge gets a stable ID. On re‑generation, the tool reuses geometry and routing for matched IDs, adds new items with light heuristics, and removes/flags deleted ones—producing an updated .drawio that opens natively in draw.io and preserves your hand‑crafted layout while reflecting the latest OpenAPI/JSON Schema. Mermaid output remains optional, non‑canonical, mainly for quick previews. [drawio.com], [drawio.com], [docsopenso....github.io]