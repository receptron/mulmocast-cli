---
generated_at: 2026-02-27T22:22:43.204Z
---

# audio

This file is an auto-generated documentation of the GraphAI graph structure defined in: 
[https://github.com/receptron/mulmocast-cli/blob/main/src/actions/audio.ts](https://github.com/receptron/mulmocast-cli/blob/main/src/actions/audio.ts)

## Graph Structures

The following Mermaid diagrams show the GraphAI graph structures defined in this script. Each section corresponds to a variable named `*_graph_data`:

### audio_graph_data

```mermaid
flowchart TD
  n_context(context)
  n_audioArtifactFilePath(audioArtifactFilePath)
  n_audioCombinedFilePath(audioCombinedFilePath)
  n_outputStudioFilePath(outputStudioFilePath)
  n_musicFile(musicFile)
  subgraph n_map[map: mapAgent]
    n_map_beat(beat)
    n_map_studioBeat(studioBeat)
    n_map_multiLingual(multiLingual)
    n_map_context(context)
    n_map___mapIndex(__mapIndex)
    n_map_lang(lang)
    n_map_preprocessor(preprocessor<br/>preprocessorAgent)
    n_map_beat --> n_map_preprocessor
    n_map_studioBeat --> n_map_preprocessor
    n_map_multiLingual --> n_map_preprocessor
    n_map_context --> n_map_preprocessor
    n_map_lang --> n_map_preprocessor
    n_map_tts(tts<br/>:preprocessor.ttsAgent)
    n_map_preprocessor -- text --> n_map_tts
    n_map_preprocessor -- provider --> n_map_tts
    n_map_preprocessor -- lang --> n_map_tts
    n_map_context -- force --> n_map_tts
    n_map_preprocessor -- audioPath --> n_map_tts
    n_map___mapIndex --> n_map_tts
    n_map_beat -- id --> n_map_tts
    n_map_context --> n_map_tts
    n_map_preprocessor -- voiceId --> n_map_tts
    n_map_preprocessor -- speechOptions.speed --> n_map_tts
    n_map_preprocessor -- speechOptions.instruction --> n_map_tts
    n_map_preprocessor -- speechOptions.decoration --> n_map_tts
    n_map_preprocessor -- speechOptions.stability --> n_map_tts
    n_map_preprocessor -- speechOptions.similarity_boost --> n_map_tts
    n_map_preprocessor -- model --> n_map_tts
  end
  n_context -- studio.script.beats --> n_map
  n_context -- studio.beats --> n_map
  n_context -- multiLingual --> n_map
  n_context --> n_map
  n_context -- lang --> n_map
  n_combineFiles(combineFiles<br/>combineAudioFilesAgent)
  n_map --> n_combineFiles
  n_context --> n_combineFiles
  n_audioCombinedFilePath --> n_combineFiles
  n_fileWrite(fileWrite<br/>fileWriteAgent)
  n_outputStudioFilePath --> n_fileWrite
  n_combineFiles -- studio.toJSON() --> n_fileWrite
  n_addBGM(addBGM<br/>addBGMAgent)
  n_combineFiles --> n_addBGM
  n_audioCombinedFilePath --> n_addBGM
  n_audioArtifactFilePath --> n_addBGM
  n_context --> n_addBGM
  n_musicFile --> n_addBGM
  class n_context,n_audioArtifactFilePath,n_audioCombinedFilePath,n_outputStudioFilePath,n_musicFile,n_map_beat,n_map_studioBeat,n_map_multiLingual,n_map_context,n_map___mapIndex,n_map_lang staticNode
  class n_map_preprocessor,n_map_tts,n_combineFiles,n_fileWrite,n_addBGM computedNode
  class n_map nestedGraph
```

---

*This document is auto-generated. Please do not edit manually.*
