---
generated_at: 2026-02-27T18:52:22.607Z
---

# translate

This file is an auto-generated documentation of the GraphAI graph structure defined in: 
[https://github.com/receptron/mulmocast-cli/blob/main/src/actions/translate.ts](https://github.com/receptron/mulmocast-cli/blob/main/src/actions/translate.ts)

## Graph Structures

The following Mermaid diagrams show the GraphAI graph structures defined in this script. Each section corresponds to a variable named `*_graph_data`:

### translate_graph_data

```mermaid
flowchart TD
  n_context(context)
  n_outDirPath(outDirPath)
  n_outputMultilingualFilePath(outputMultilingualFilePath)
  n_targetLangs(targetLangs)
  n_mergeStudioResult(mergeStudioResult<br/>agent)
  n_context -- multiLingual --> n_mergeStudioResult
  n_beatsMap -- mergeMultiLingualData --> n_mergeStudioResult
  n_context -- studio.script.beats --> n_mergeStudioResult
  subgraph n_beatsMap[beatsMap: mapAgent]
    n_beatsMap_targetLangs(targetLangs)
    n_beatsMap_context(context)
    n_beatsMap_beat(beat)
    n_beatsMap___mapIndex(__mapIndex)
    n_beatsMap_multiLingual(multiLingual<br/>agent)
    n_beatsMap_beat -- text --> n_beatsMap_multiLingual
    n_beatsMap___mapIndex --> n_beatsMap_multiLingual
    n_beatsMap_context -- multiLingual --> n_beatsMap_multiLingual
    subgraph n_beatsMap_preprocessMultiLingual[preprocessMultiLingual: mapAgent]
      n_beatsMap_preprocessMultiLingual_localizedText(localizedText<br/>openAIAgent)
      n_beatsMap_preprocessMultiLingual_targetLang --> n_beatsMap_preprocessMultiLingual_localizedText
      n_beatsMap_preprocessMultiLingual_beat --> n_beatsMap_preprocessMultiLingual_localizedText
      n_beatsMap_preprocessMultiLingual_multiLingual --> n_beatsMap_preprocessMultiLingual_localizedText
      n_beatsMap_preprocessMultiLingual_lang --> n_beatsMap_preprocessMultiLingual_localizedText
      n_beatsMap_preprocessMultiLingual_beatIndex --> n_beatsMap_preprocessMultiLingual_localizedText
      n_beatsMap_preprocessMultiLingual_context --> n_beatsMap_preprocessMultiLingual_localizedText
      n_beatsMap_preprocessMultiLingual_lang --> n_beatsMap_preprocessMultiLingual_localizedText
      n_beatsMap_preprocessMultiLingual_beat -- text --> n_beatsMap_preprocessMultiLingual_localizedText
      n_beatsMap_preprocessMultiLingual_targetLang --> n_beatsMap_preprocessMultiLingual_localizedText
      n_beatsMap_preprocessMultiLingual_splitText(splitText<br/>splitText)
      n_beatsMap_preprocessMultiLingual_targetLang --> n_beatsMap_preprocessMultiLingual_splitText
      n_beatsMap_preprocessMultiLingual_localizedText --> n_beatsMap_preprocessMultiLingual_splitText
      n_beatsMap_preprocessMultiLingual_textTranslateResult(textTranslateResult<br/>copyAgent)
      n_beatsMap_preprocessMultiLingual_targetLang --> n_beatsMap_preprocessMultiLingual_textTranslateResult
      n_beatsMap_preprocessMultiLingual_localizedText -- text --> n_beatsMap_preprocessMultiLingual_textTranslateResult
      n_beatsMap_preprocessMultiLingual_splitText --> n_beatsMap_preprocessMultiLingual_textTranslateResult
      n_beatsMap_preprocessMultiLingual_splitText --> n_beatsMap_preprocessMultiLingual_textTranslateResult
      n_beatsMap_preprocessMultiLingual_multiLingual -- cacheKey --> n_beatsMap_preprocessMultiLingual_textTranslateResult
    end
    n_beatsMap_beat --> n_beatsMap_preprocessMultiLingual
    n_beatsMap_multiLingual --> n_beatsMap_preprocessMultiLingual
    n_beatsMap_targetLangs --> n_beatsMap_preprocessMultiLingual
    n_beatsMap_context -- studio.script.lang --> n_beatsMap_preprocessMultiLingual
    n_beatsMap_context --> n_beatsMap_preprocessMultiLingual
    n_beatsMap___mapIndex --> n_beatsMap_preprocessMultiLingual
    n_beatsMap_mergeLocalizedText(mergeLocalizedText<br/>arrayToObjectAgent)
    n_beatsMap_preprocessMultiLingual -- textTranslateResult --> n_beatsMap_mergeLocalizedText
    n_beatsMap_multiLingualTexts(multiLingualTexts<br/>mergeObjectAgent)
    n_beatsMap_multiLingual -- multiLingualTexts --> n_beatsMap_multiLingualTexts
    n_beatsMap_mergeLocalizedText --> n_beatsMap_multiLingualTexts
    n_beatsMap_mergeMultiLingualData(mergeMultiLingualData<br/>mergeObjectAgent)
    n_beatsMap_multiLingual --> n_beatsMap_mergeMultiLingualData
    n_beatsMap_multiLingualTexts --> n_beatsMap_mergeMultiLingualData
  end
  n_targetLangs --> n_beatsMap
  n_context --> n_beatsMap
  n_context -- studio.script.beats --> n_beatsMap
  n_writeOutput(writeOutput<br/>fileWriteAgent)
  n_outputMultilingualFilePath --> n_writeOutput
  n_mergeStudioResult -- toJSON() --> n_writeOutput
  class n_context,n_outDirPath,n_outputMultilingualFilePath,n_targetLangs,n_beatsMap_targetLangs,n_beatsMap_context,n_beatsMap_beat,n_beatsMap___mapIndex staticNode
  class n_mergeStudioResult,n_beatsMap_multiLingual,n_beatsMap_preprocessMultiLingual_localizedText,n_beatsMap_preprocessMultiLingual_splitText,n_beatsMap_preprocessMultiLingual_textTranslateResult,n_beatsMap_mergeLocalizedText,n_beatsMap_multiLingualTexts,n_beatsMap_mergeMultiLingualData,n_writeOutput computedNode
  class n_beatsMap_preprocessMultiLingual,n_beatsMap nestedGraph
```

---

*This document is auto-generated. Please do not edit manually.*
