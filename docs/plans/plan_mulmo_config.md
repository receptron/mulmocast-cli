# Plan: `mulmo.config.json` — User Configuration File

Issue: #1215

## Context

コンテンツ大量生産時に、BGM・ブランディング・TTS/Image provider を毎回スクリプトに書くのは非効率。`mulmo.config.json` でユーザーデフォルトを1箇所に定義し、`mulmo tool complete` や CLI コマンド実行時に自動マージする。

## Design

### File name & format
- **File name**: `mulmo.config.json`
- **Format**: 既存の style と同じ形式 = `presentationStyle` の partial JSON

### Search priority (first found wins, no merge)
1. `-s` / `--style` で明示指定された style ファイル
2. CWD の `mulmo.config.json`
3. `~/mulmo.config.json`

上位が見つかった時点で探索終了。複数ファイルのマージは行わない。

### Ignore option
`--no-config` CLI フラグで `mulmo.config.json` の自動ロードを無効化。

### Override chain (low → high)
```
Schema defaults < mulmo.config.json < template/style < MulmoScript < presentationStyle (-p) < CLI flags
```

### Example `mulmo.config.json`
```json
{
  "speechParams": {
    "speakers": {
      "Presenter": { "provider": "gemini", "voiceId": "Kore" }
    }
  },
  "imageParams": { "provider": "google" },
  "audioParams": {
    "bgm": { "kind": "url", "url": "https://..." },
    "bgmVolume": 0.15
  },
  "slideParams": {
    "branding": {
      "logo": {
        "source": { "kind": "path", "path": "brand/logo.svg" },
        "position": "top-right",
        "width": 100
      }
    }
  }
}
```

## Integration points

### 1. `completeScript()` (`src/tools/complete_script.ts`)

config を自動探索・ロードし、マージチェーンの最下層として統合:
```
mulmo.config.json < template/style < input data (highest)
```
既存の `mergeScripts()` と `getStyleFromFile()` を再利用。`deepMergeKeys` に `"slideParams"` を追加。

### 2. CLI runtime (`src/utils/context.ts`)

`initializeContextFromFiles()` 内で config をロードし、MulmoScript とマージ（script が勝つ）。

## Changes

### New files
| File | Purpose |
|------|---------|
| `src/utils/mulmo_config.ts` | `findConfigFile()`, `loadMulmoConfig()`, `mergeConfigWithScript()` |
| `test/utils/test_mulmo_config.ts` | Unit tests |

### Modified files
| File | Change |
|------|--------|
| `src/tools/complete_script.ts` | config auto-load in `completeScript()`, `"slideParams"` in `deepMergeKeys` |
| `src/utils/context.ts` | config load & merge in `initializeContextFromFiles()` |
| `src/cli/common.ts` | `--no-config` flag |
| `src/cli/commands/tool/info/handler.ts` | `rc` category |
