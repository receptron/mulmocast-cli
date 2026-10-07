# Gemini 3.8 TTS に対応し、既定にする — #1582

## 何が違うか（実際の呼び出しで確かめた）

- 3.8 TTS は `generateContent` でも呼べるが、`audio/wav`（RIFF ヘッダー付き）を返す。今の変換は生の PCM を前提にしているので、そのままでは使えない。
- 公式の呼び方は Interactions API（`ai.interactions.create`）。本文はそのまま読まれ、演出指示は `speech_metadata` の `style` で渡す。
- `response_format` に `mime_type: "audio/l16"` を指定すると、ヘッダーの無い PCM が返る（`sample_rate` も付く）。今の `pcmToMp3` がそのまま使える。

## 変更

- `src/utils/gemini_tts.ts`（純粋な関数）: 3.8 の 2 モデルの判定、リクエストの組み立て、返事から PCM と sample rate を取り出す処理（`audio/l16` 以外はエラー）
- `ttsGeminiAgent`: 3.8 は Interactions API、2.5 はこれまでどおり `generateContent`
- 既定を `gemini-3.8-flash-tts` に変更（2.5 は 2026-11-17 に止まる）。一覧と値段の行に 3.8 の 2 モデルを追加
- `@google/genai` の下限を `^2.24.0` に上げる（公式の説明が求める版）

## 決めたこと

- 既定は `gemini-3.8-flash-tts`。値段は 2.5 と同じかそれ以下。
- model を指定していない台本は、キャッシュを消すか作り直す（`-f`）まで、2.5 で作った音声を使い続ける（音声キャッシュの鍵は `model ?? ""` のため。#1525）。
