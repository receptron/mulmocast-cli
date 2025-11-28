# ttsを追加するとき

## 必須項目

### Agentを追加

src/agents/tts_xxx_agent.ts
src/agents/index.ts

### provider/agent情報追加

src/utils/provider2agent.ts

provider2TTSAgent に追加する

### api key情報追加
src/utils/utils.ts

settings2GraphAIConfig に追加する

### graphaiにエージェントとして追加

src/actions/audio.ts

## オプション項目

## agentのAgentFunctionInfoのgenericの変更

src/types/agent.ts

## mulmo scriptのスキーマ

なにかparamsでoptionを追加する場合。

src/types/schema.ts 

speechOptionsSchema