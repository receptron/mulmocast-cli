---
generated_at: 2026-02-27T18:52:22.515Z
---

# captions

This file is an auto-generated documentation of the GraphAI graph structure defined in: 
[https://github.com/receptron/mulmocast-cli/blob/main/src/actions/captions.ts](https://github.com/receptron/mulmocast-cli/blob/main/src/actions/captions.ts)

## Graph Structures

The following Mermaid diagrams show the GraphAI graph structures defined in this script. Each section corresponds to a variable named `*_graph_data`:

### caption_graph_data

```mermaid
flowchart TD
  n_context(context)
  n_outputStudioFilePath(outputStudioFilePath)
  subgraph n_map[map: mapAgent]
    n_map_generateCaption(generateCaption<br/>captionGenerationAgent)
    n_map_beat --> n_map_generateCaption
    n_map_context --> n_map_generateCaption
    n_map___mapIndex --> n_map_generateCaption
  end
  n_context -- studio.script.beats --> n_map
  n_context --> n_map
  n_fileWrite(fileWrite<br/>fileWriteAgent)
  n_map -- generateCaption --> n_fileWrite
  n_outputStudioFilePath --> n_fileWrite
  n_context -- studio.toJSON() --> n_fileWrite
  class n_context,n_outputStudioFilePath staticNode
  class n_map_generateCaption,n_fileWrite computedNode
  class n_map nestedGraph
```

---

*This document is auto-generated. Please do not edit manually.*
