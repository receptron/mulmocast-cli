## Actions Directory

This folder contains action implementations (e.g., `audio.ts`, `images.ts`, `movie.ts`) and their auto‑generated docs (`*.docs.md`).

### How docs are generated

- Script: `automation/generate_actions_docs/generate_action_docs.ts`
- Dynamically imports action files, detects exports ending with `*_graph_data`, converts them to Mermaid, and writes `*.docs.md` alongside each file.

#### Template

- `automation/generate_actions_docs/docs_template.md`
- Inserts diagrams into `{{MERMAID_SECTIONS}}`.

#### Run

From the repo root:

```bash
yarn generate_action_docs
```

This regenerates `*.docs.md` for files under `src/actions/`. If a file has no `*_graph_data` export, no doc is produced.

### Notes / Best practices

- Export graphs as `GraphData` with names like `xxx_graph_data` (ending in `_graph_data`).
- Because files are imported at generation time, avoid side effects that require runtime setup.

