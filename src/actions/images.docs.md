---
generated_at: 2026-02-27T22:22:43.420Z
---

# images

This file is an auto-generated documentation of the GraphAI graph structure defined in: 
[https://github.com/receptron/mulmocast-cli/blob/main/src/actions/images.ts](https://github.com/receptron/mulmocast-cli/blob/main/src/actions/images.ts)

## Graph Structures

The following Mermaid diagrams show the GraphAI graph structures defined in this script. Each section corresponds to a variable named `*_graph_data`:

### beat_graph_data

```mermaid
flowchart TD
  n_context(context)
  n_htmlImageAgentInfo(htmlImageAgentInfo)
  n_imageRefs(imageRefs)
  n_beat(beat)
  n___mapIndex(__mapIndex)
  n_forceMovie(forceMovie)
  n_forceImage(forceImage)
  n_forceLipSync(forceLipSync)
  n_forceSoundEffect(forceSoundEffect)
  n_withBackup(withBackup)
  n_preprocessor(preprocessor<br/>imagePreprocessAgent)
  n_context --> n_preprocessor
  n_beat --> n_preprocessor
  n___mapIndex --> n_preprocessor
  n_imageRefs --> n_preprocessor
  n_imagePlugin(imagePlugin<br/>imagePluginAgent)
  n_context --> n_imagePlugin
  n_beat --> n_imagePlugin
  n___mapIndex --> n_imagePlugin
  n_imageRefs --> n_imagePlugin
  n_preprocessor --> n_imagePlugin
  n_htmlImageAgent(htmlImageAgent<br/>:htmlImageAgentInfo.agent)
  n_preprocessor -- htmlPrompt --> n_htmlImageAgent
  n_preprocessor -- htmlImageSystemPrompt --> n_htmlImageAgent
  n_htmlImageAgentInfo -- model --> n_htmlImageAgent
  n_htmlImageAgentInfo -- max_tokens --> n_htmlImageAgent
  n_context -- force --> n_htmlImageAgent
  n_forceImage --> n_htmlImageAgent
  n_context -- backup --> n_htmlImageAgent
  n_withBackup --> n_htmlImageAgent
  n_preprocessor -- htmlPath --> n_htmlImageAgent
  n___mapIndex --> n_htmlImageAgent
  n_beat -- id --> n_htmlImageAgent
  n_context --> n_htmlImageAgent
  n_htmlReader(htmlReader<br/>agent)
  n_htmlImageAgent --> n_htmlReader
  n_preprocessor -- htmlPath --> n_htmlReader
  n_htmlImageGenerator(htmlImageGenerator<br/>htmlImageGeneratorAgent)
  n_htmlReader -- htmlText --> n_htmlImageGenerator
  n_context -- presentationStyle.canvasSize --> n_htmlImageGenerator
  n_preprocessor -- htmlImageFile --> n_htmlImageGenerator
  n_imageGenerator(imageGenerator<br/>:preprocessor.imageAgentInfo.agent)
  n_preprocessor -- prompt --> n_imageGenerator
  n_preprocessor -- referenceImages --> n_imageGenerator
  n_context -- force --> n_imageGenerator
  n_forceImage --> n_imageGenerator
  n_context -- backup --> n_imageGenerator
  n_withBackup --> n_imageGenerator
  n_preprocessor -- imagePath --> n_imageGenerator
  n___mapIndex --> n_imageGenerator
  n_beat -- id --> n_imageGenerator
  n_context --> n_imageGenerator
  n_preprocessor -- imageParams.model --> n_imageGenerator
  n_preprocessor -- imageParams.moderation --> n_imageGenerator
  n_context -- presentationStyle.canvasSize --> n_imageGenerator
  n_preprocessor -- imageParams.quality --> n_imageGenerator
  n_preprocessor -- imageParams.vertexai_project --> n_imageGenerator
  n_preprocessor -- imageParams.vertexai_location --> n_imageGenerator
  n_movieGenerator(movieGenerator<br/>:preprocessor.movieAgentInfo.agent)
  n_imageGenerator --> n_movieGenerator
  n_imagePlugin --> n_movieGenerator
  n_beat -- moviePrompt --> n_movieGenerator
  n_preprocessor -- referenceImageForMovie --> n_movieGenerator
  n_preprocessor -- movieFile --> n_movieGenerator
  n_context -- force --> n_movieGenerator
  n_forceMovie --> n_movieGenerator
  n_context -- backup --> n_movieGenerator
  n_withBackup --> n_movieGenerator
  n_preprocessor -- movieFile --> n_movieGenerator
  n___mapIndex --> n_movieGenerator
  n_beat -- id --> n_movieGenerator
  n_context --> n_movieGenerator
  n_preprocessor -- movieAgentInfo.movieParams.model --> n_movieGenerator
  n_preprocessor -- beatDuration --> n_movieGenerator
  n_context -- presentationStyle.canvasSize --> n_movieGenerator
  n_preprocessor -- movieAgentInfo.movieParams.vertexai_project --> n_movieGenerator
  n_preprocessor -- movieAgentInfo.movieParams.vertexai_location --> n_movieGenerator
  n_imageFromMovie(imageFromMovie<br/>agent)
  n_movieGenerator --> n_imageFromMovie
  n_imagePlugin --> n_imageFromMovie
  n_preprocessor -- imagePath --> n_imageFromMovie
  n_preprocessor -- movieFile --> n_imageFromMovie
  n_preprocessor -- useLastFrame --> n_imageFromMovie
  n_audioChecker(audioChecker<br/>agent)
  n_movieGenerator --> n_audioChecker
  n_htmlImageGenerator --> n_audioChecker
  n_soundEffectGenerator --> n_audioChecker
  n_imagePlugin --> n_audioChecker
  n_preprocessor -- movieFile --> n_audioChecker
  n_preprocessor -- imagePath --> n_audioChecker
  n_preprocessor -- soundEffectFile --> n_audioChecker
  n___mapIndex --> n_audioChecker
  n_soundEffectGenerator(soundEffectGenerator<br/>:preprocessor.soundEffectAgentInfo.agentName)
  n_movieGenerator --> n_soundEffectGenerator
  n_preprocessor -- soundEffectPrompt --> n_soundEffectGenerator
  n_preprocessor -- movieFile --> n_soundEffectGenerator
  n_preprocessor -- soundEffectFile --> n_soundEffectGenerator
  n_preprocessor -- soundEffectModel --> n_soundEffectGenerator
  n_preprocessor -- beatDuration --> n_soundEffectGenerator
  n_context -- force --> n_soundEffectGenerator
  n_forceSoundEffect --> n_soundEffectGenerator
  n_context -- backup --> n_soundEffectGenerator
  n_withBackup --> n_soundEffectGenerator
  n_preprocessor -- soundEffectFile --> n_soundEffectGenerator
  n___mapIndex --> n_soundEffectGenerator
  n_beat -- id --> n_soundEffectGenerator
  n_context --> n_soundEffectGenerator
  n_AudioTrimmer(AudioTrimmer<br/>agent)
  n_imageGenerator --> n_AudioTrimmer
  n_imagePlugin --> n_AudioTrimmer
  n_preprocessor -- audioFile --> n_AudioTrimmer
  n_preprocessor -- bgmFile --> n_AudioTrimmer
  n_preprocessor -- startAt --> n_AudioTrimmer
  n_preprocessor -- duration --> n_AudioTrimmer
  n_context -- force --> n_AudioTrimmer
  n_preprocessor -- audioFile --> n_AudioTrimmer
  n___mapIndex --> n_AudioTrimmer
  n_beat -- id --> n_AudioTrimmer
  n_context --> n_AudioTrimmer
  n_lipSyncGenerator(lipSyncGenerator<br/>:preprocessor.lipSyncAgentName)
  n_soundEffectGenerator --> n_lipSyncGenerator
  n_AudioTrimmer --> n_lipSyncGenerator
  n_preprocessor -- movieFile --> n_lipSyncGenerator
  n_preprocessor -- referenceImageForMovie --> n_lipSyncGenerator
  n_preprocessor -- audioFile --> n_lipSyncGenerator
  n_preprocessor -- lipSyncFile --> n_lipSyncGenerator
  n_preprocessor -- lipSyncModel --> n_lipSyncGenerator
  n_preprocessor -- beatDuration --> n_lipSyncGenerator
  n_context -- force --> n_lipSyncGenerator
  n_forceLipSync --> n_lipSyncGenerator
  n_context -- backup --> n_lipSyncGenerator
  n_withBackup --> n_lipSyncGenerator
  n_preprocessor -- lipSyncFile --> n_lipSyncGenerator
  n___mapIndex --> n_lipSyncGenerator
  n_beat -- id --> n_lipSyncGenerator
  n_context --> n_lipSyncGenerator
  n_output(output<br/>copyAgent)
  n_imageFromMovie --> n_output
  n_htmlImageGenerator --> n_output
  n_audioChecker --> n_output
  n_soundEffectGenerator --> n_output
  n_lipSyncGenerator --> n_output
  n_preprocessor -- imagePath --> n_output
  n_preprocessor -- movieFile --> n_output
  n_preprocessor -- soundEffectFile --> n_output
  n_preprocessor -- lipSyncFile --> n_output
  n_audioChecker -- hasMovieAudio --> n_output
  n_preprocessor -- htmlImageFile --> n_output
  n_preprocessor -- markdown --> n_output
  n_preprocessor -- html --> n_output
  class n_context,n_htmlImageAgentInfo,n_imageRefs,n_beat,n___mapIndex,n_forceMovie,n_forceImage,n_forceLipSync,n_forceSoundEffect,n_withBackup staticNode
  class n_preprocessor,n_imagePlugin,n_htmlImageAgent,n_htmlReader,n_htmlImageGenerator,n_imageGenerator,n_movieGenerator,n_imageFromMovie,n_audioChecker,n_soundEffectGenerator,n_AudioTrimmer,n_lipSyncGenerator,n_output computedNode
```

### images_graph_data

```mermaid
flowchart TD
  n_context(context)
  n_htmlImageAgentInfo(htmlImageAgentInfo)
  n_outputStudioFilePath(outputStudioFilePath)
  n_imageRefs(imageRefs)
  subgraph n_map[map: mapAgent]
    n_map_context(context)
    n_map_htmlImageAgentInfo(htmlImageAgentInfo)
    n_map_imageRefs(imageRefs)
    n_map_beat(beat)
    n_map___mapIndex(__mapIndex)
    n_map_forceMovie(forceMovie)
    n_map_forceImage(forceImage)
    n_map_forceLipSync(forceLipSync)
    n_map_forceSoundEffect(forceSoundEffect)
    n_map_withBackup(withBackup)
    n_map_preprocessor(preprocessor<br/>imagePreprocessAgent)
    n_map_context --> n_map_preprocessor
    n_map_beat --> n_map_preprocessor
    n_map___mapIndex --> n_map_preprocessor
    n_map_imageRefs --> n_map_preprocessor
    n_map_imagePlugin(imagePlugin<br/>imagePluginAgent)
    n_map_context --> n_map_imagePlugin
    n_map_beat --> n_map_imagePlugin
    n_map___mapIndex --> n_map_imagePlugin
    n_map_imageRefs --> n_map_imagePlugin
    n_map_preprocessor --> n_map_imagePlugin
    n_map_htmlImageAgent(htmlImageAgent<br/>:htmlImageAgentInfo.agent)
    n_map_preprocessor -- htmlPrompt --> n_map_htmlImageAgent
    n_map_preprocessor -- htmlImageSystemPrompt --> n_map_htmlImageAgent
    n_map_htmlImageAgentInfo -- model --> n_map_htmlImageAgent
    n_map_htmlImageAgentInfo -- max_tokens --> n_map_htmlImageAgent
    n_map_context -- force --> n_map_htmlImageAgent
    n_map_forceImage --> n_map_htmlImageAgent
    n_map_context -- backup --> n_map_htmlImageAgent
    n_map_withBackup --> n_map_htmlImageAgent
    n_map_preprocessor -- htmlPath --> n_map_htmlImageAgent
    n_map___mapIndex --> n_map_htmlImageAgent
    n_map_beat -- id --> n_map_htmlImageAgent
    n_map_context --> n_map_htmlImageAgent
    n_map_htmlReader(htmlReader<br/>agent)
    n_map_htmlImageAgent --> n_map_htmlReader
    n_map_preprocessor -- htmlPath --> n_map_htmlReader
    n_map_htmlImageGenerator(htmlImageGenerator<br/>htmlImageGeneratorAgent)
    n_map_htmlReader -- htmlText --> n_map_htmlImageGenerator
    n_map_context -- presentationStyle.canvasSize --> n_map_htmlImageGenerator
    n_map_preprocessor -- htmlImageFile --> n_map_htmlImageGenerator
    n_map_imageGenerator(imageGenerator<br/>:preprocessor.imageAgentInfo.agent)
    n_map_preprocessor -- prompt --> n_map_imageGenerator
    n_map_preprocessor -- referenceImages --> n_map_imageGenerator
    n_map_context -- force --> n_map_imageGenerator
    n_map_forceImage --> n_map_imageGenerator
    n_map_context -- backup --> n_map_imageGenerator
    n_map_withBackup --> n_map_imageGenerator
    n_map_preprocessor -- imagePath --> n_map_imageGenerator
    n_map___mapIndex --> n_map_imageGenerator
    n_map_beat -- id --> n_map_imageGenerator
    n_map_context --> n_map_imageGenerator
    n_map_preprocessor -- imageParams.model --> n_map_imageGenerator
    n_map_preprocessor -- imageParams.moderation --> n_map_imageGenerator
    n_map_context -- presentationStyle.canvasSize --> n_map_imageGenerator
    n_map_preprocessor -- imageParams.quality --> n_map_imageGenerator
    n_map_preprocessor -- imageParams.vertexai_project --> n_map_imageGenerator
    n_map_preprocessor -- imageParams.vertexai_location --> n_map_imageGenerator
    n_map_movieGenerator(movieGenerator<br/>:preprocessor.movieAgentInfo.agent)
    n_map_imageGenerator --> n_map_movieGenerator
    n_map_imagePlugin --> n_map_movieGenerator
    n_map_beat -- moviePrompt --> n_map_movieGenerator
    n_map_preprocessor -- referenceImageForMovie --> n_map_movieGenerator
    n_map_preprocessor -- movieFile --> n_map_movieGenerator
    n_map_context -- force --> n_map_movieGenerator
    n_map_forceMovie --> n_map_movieGenerator
    n_map_context -- backup --> n_map_movieGenerator
    n_map_withBackup --> n_map_movieGenerator
    n_map_preprocessor -- movieFile --> n_map_movieGenerator
    n_map___mapIndex --> n_map_movieGenerator
    n_map_beat -- id --> n_map_movieGenerator
    n_map_context --> n_map_movieGenerator
    n_map_preprocessor -- movieAgentInfo.movieParams.model --> n_map_movieGenerator
    n_map_preprocessor -- beatDuration --> n_map_movieGenerator
    n_map_context -- presentationStyle.canvasSize --> n_map_movieGenerator
    n_map_preprocessor -- movieAgentInfo.movieParams.vertexai_project --> n_map_movieGenerator
    n_map_preprocessor -- movieAgentInfo.movieParams.vertexai_location --> n_map_movieGenerator
    n_map_imageFromMovie(imageFromMovie<br/>agent)
    n_map_movieGenerator --> n_map_imageFromMovie
    n_map_imagePlugin --> n_map_imageFromMovie
    n_map_preprocessor -- imagePath --> n_map_imageFromMovie
    n_map_preprocessor -- movieFile --> n_map_imageFromMovie
    n_map_preprocessor -- useLastFrame --> n_map_imageFromMovie
    n_map_audioChecker(audioChecker<br/>agent)
    n_map_movieGenerator --> n_map_audioChecker
    n_map_htmlImageGenerator --> n_map_audioChecker
    n_map_soundEffectGenerator --> n_map_audioChecker
    n_map_imagePlugin --> n_map_audioChecker
    n_map_preprocessor -- movieFile --> n_map_audioChecker
    n_map_preprocessor -- imagePath --> n_map_audioChecker
    n_map_preprocessor -- soundEffectFile --> n_map_audioChecker
    n_map___mapIndex --> n_map_audioChecker
    n_map_soundEffectGenerator(soundEffectGenerator<br/>:preprocessor.soundEffectAgentInfo.agentName)
    n_map_movieGenerator --> n_map_soundEffectGenerator
    n_map_preprocessor -- soundEffectPrompt --> n_map_soundEffectGenerator
    n_map_preprocessor -- movieFile --> n_map_soundEffectGenerator
    n_map_preprocessor -- soundEffectFile --> n_map_soundEffectGenerator
    n_map_preprocessor -- soundEffectModel --> n_map_soundEffectGenerator
    n_map_preprocessor -- beatDuration --> n_map_soundEffectGenerator
    n_map_context -- force --> n_map_soundEffectGenerator
    n_map_forceSoundEffect --> n_map_soundEffectGenerator
    n_map_context -- backup --> n_map_soundEffectGenerator
    n_map_withBackup --> n_map_soundEffectGenerator
    n_map_preprocessor -- soundEffectFile --> n_map_soundEffectGenerator
    n_map___mapIndex --> n_map_soundEffectGenerator
    n_map_beat -- id --> n_map_soundEffectGenerator
    n_map_context --> n_map_soundEffectGenerator
    n_map_AudioTrimmer(AudioTrimmer<br/>agent)
    n_map_imageGenerator --> n_map_AudioTrimmer
    n_map_imagePlugin --> n_map_AudioTrimmer
    n_map_preprocessor -- audioFile --> n_map_AudioTrimmer
    n_map_preprocessor -- bgmFile --> n_map_AudioTrimmer
    n_map_preprocessor -- startAt --> n_map_AudioTrimmer
    n_map_preprocessor -- duration --> n_map_AudioTrimmer
    n_map_context -- force --> n_map_AudioTrimmer
    n_map_preprocessor -- audioFile --> n_map_AudioTrimmer
    n_map___mapIndex --> n_map_AudioTrimmer
    n_map_beat -- id --> n_map_AudioTrimmer
    n_map_context --> n_map_AudioTrimmer
    n_map_lipSyncGenerator(lipSyncGenerator<br/>:preprocessor.lipSyncAgentName)
    n_map_soundEffectGenerator --> n_map_lipSyncGenerator
    n_map_AudioTrimmer --> n_map_lipSyncGenerator
    n_map_preprocessor -- movieFile --> n_map_lipSyncGenerator
    n_map_preprocessor -- referenceImageForMovie --> n_map_lipSyncGenerator
    n_map_preprocessor -- audioFile --> n_map_lipSyncGenerator
    n_map_preprocessor -- lipSyncFile --> n_map_lipSyncGenerator
    n_map_preprocessor -- lipSyncModel --> n_map_lipSyncGenerator
    n_map_preprocessor -- beatDuration --> n_map_lipSyncGenerator
    n_map_context -- force --> n_map_lipSyncGenerator
    n_map_forceLipSync --> n_map_lipSyncGenerator
    n_map_context -- backup --> n_map_lipSyncGenerator
    n_map_withBackup --> n_map_lipSyncGenerator
    n_map_preprocessor -- lipSyncFile --> n_map_lipSyncGenerator
    n_map___mapIndex --> n_map_lipSyncGenerator
    n_map_beat -- id --> n_map_lipSyncGenerator
    n_map_context --> n_map_lipSyncGenerator
    n_map_output(output<br/>copyAgent)
    n_map_imageFromMovie --> n_map_output
    n_map_htmlImageGenerator --> n_map_output
    n_map_audioChecker --> n_map_output
    n_map_soundEffectGenerator --> n_map_output
    n_map_lipSyncGenerator --> n_map_output
    n_map_preprocessor -- imagePath --> n_map_output
    n_map_preprocessor -- movieFile --> n_map_output
    n_map_preprocessor -- soundEffectFile --> n_map_output
    n_map_preprocessor -- lipSyncFile --> n_map_output
    n_map_audioChecker -- hasMovieAudio --> n_map_output
    n_map_preprocessor -- htmlImageFile --> n_map_output
    n_map_preprocessor -- markdown --> n_map_output
    n_map_preprocessor -- html --> n_map_output
  end
  n_context -- studio.script.beats --> n_map
  n_context --> n_map
  n_htmlImageAgentInfo --> n_map
  n_imageRefs --> n_map
  n_mergeResult(mergeResult<br/>agent)
  n_map -- output --> n_mergeResult
  n_context --> n_mergeResult
  n_writeOutput(writeOutput<br/>fileWriteAgent)
  n_outputStudioFilePath --> n_writeOutput
  n_mergeResult -- studio.toJSON() --> n_writeOutput
  class n_context,n_htmlImageAgentInfo,n_outputStudioFilePath,n_imageRefs,n_map_context,n_map_htmlImageAgentInfo,n_map_imageRefs,n_map_beat,n_map___mapIndex,n_map_forceMovie,n_map_forceImage,n_map_forceLipSync,n_map_forceSoundEffect,n_map_withBackup staticNode
  class n_map_preprocessor,n_map_imagePlugin,n_map_htmlImageAgent,n_map_htmlReader,n_map_htmlImageGenerator,n_map_imageGenerator,n_map_movieGenerator,n_map_imageFromMovie,n_map_audioChecker,n_map_soundEffectGenerator,n_map_AudioTrimmer,n_map_lipSyncGenerator,n_map_output,n_mergeResult,n_writeOutput computedNode
  class n_map nestedGraph
```

---

*This document is auto-generated. Please do not edit manually.*
