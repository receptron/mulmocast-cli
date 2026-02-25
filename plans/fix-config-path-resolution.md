# Plan: Remove resolveConfigPaths — resolve config paths relative to script

Issue: #1225

## Context

`mulmo.config.json` の `kind: "path"` エントリが config ファイルのディレクトリ基準で絶対パスに変換されている（`resolveConfigPaths`）。
しかし MulmoScript のパスは全てスクリプトファイルのディレクトリ基準（`context.fileDirs.mulmoFileDirPath`）で解決される仕様。
config だけ異なる基準でパス変換するのは不整合であり、さらに `MEDIA_SOURCE_PATHS` のハードコードに漏れがある。

## Design Decision

config は **JSON をマージするだけ**。パス解決は行わない。
`kind: "path"` の解決は全て実行時にスクリプトファイル基準で行われる（既存の `resolveAssetPath`, `getFullPath(mulmoFileDirPath, ...)` 等）。

## Changes

### 1. `src/utils/mulmo_config.ts`

- `resolveMediaSourcePath()` を削除
- `resolveNestedPath()` を削除
- `resolveConfigPaths()` を削除
- `MEDIA_SOURCE_PATHS` を削除
- `loadMulmoConfig()` から `resolveConfigPaths` 呼び出しを除去（JSON parse → defaults/override 分離のみ）
- `import { getFullPath }` を削除（不要になる）

### 2. `test/utils/test_mulmo_config.ts`

- `resolveConfigPaths` の describe ブロック 2 つを全て削除
- `resolveConfigPaths` の import を削除
- `loadMulmoConfig` テストで path 解決を期待しているケースを修正
  - `"override path resolution works"` テスト: 絶対パス変換ではなく、相対パスがそのまま保持されることを検証するように変更

### 3. `docs/plans/plan_mulmo_config.md`

- `resolveConfigPaths()` の記述を削除
- パスはスクリプト基準で解決される旨を追記

### 4. `README.md`

- `mulmo.config.json` セクション: `kind: "path"` はスクリプトファイルのディレクトリ基準で解決される旨を追記

### 5. `mulmo.config.json.sample`

- `branding` セクションの `kind: "path"` パスを `scripts/test/branding/` に変更
  - または、コメント（description）でスクリプトからの相対パスである旨を明記

## Verification

```bash
yarn build
yarn ci_test

# mulmo.config.json.sample をコピーして動作確認
cp mulmo.config.json.sample mulmo.config.json
yarn run movie scripts/test/test_media.json
```
