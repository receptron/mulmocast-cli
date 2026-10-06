# 使えなくなる既定のモデルの入れ替え（2026-10）— #1605, #1610

## 規則

- 止まった、または止まる日が決まっている **既定** のモデルは、提供元が名指しした後継に替える。
- **すでに止まった** モデルは `models` の一覧から外す。止まる日が先のものは、その日まで一覧に残す。
- 後継が存在して呼べることは、提供元のモデル一覧の API と実際の呼び出しで確かめる（文書だけに頼らない）。

## PR の分け方（提供元ごと）

| PR               | 範囲                                                                                                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI           | 画像の既定 `gpt-image-1` → `gpt-image-2.5-sunburst`（#1605）、`gptImages` に sunburst / flare、置き換えの案内文、LLM の既定 `gpt-5` → `gpt-5.6-sol`、値段の表、サンプルの台本、README の読まれていない `DEFAULT_OPENAI_IMAGE_MODEL` |
| Google           | 動画 `veo-2.0` → `veo-3.1-generate-preview`、画像 `gemini-2.5-flash-image` → `gemini-3.1-flash-lite-image`、TTS → `gemini-3.8-flash-tts`、LLM `gemini-2.5-flash` → `gemini-3.8-flash`                                               |
| Anthropic / Groq | `claude-sonnet-5-5`、`openai/gpt-oss-20b`、止まったモデルを外す                                                                                                                                                                     |
| 値段 / Replicate | ElevenLabs と Replicate の動画の値段、`kwaivgi/kling-v1.6-pro` を外す                                                                                                                                                               |

## 範囲外

- 2026-10-22 以降の Gemini API の動画（後継の `gemini-omni-1.1-flash` は `generateContent` で呼ぶため、エージェントの実装が要る）
- OpenAI の TTS（後継の `gpt-realtime-2.1-mini` は realtime API のモデルで、`audio.speech` の置き換えにならない）
