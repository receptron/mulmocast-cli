# REMOTION_COMPONENT_GUIDE をブラウザで読める入口から出す

#1606。

## 問題

`REMOTION_COMPONENT_GUIDE` は `mulmocast/remotion` からしか読めない。この入口は `render.ts`（`node:fs` / `node:module`）と
`renderRemotionFrames`（`@remotion/renderer` / `@remotion/bundler`）も出しているので、ガイドの文字列だけを読みたいブラウザ側のコードが
Node 専用のコードまで抱え込む。mulmoclaude#3396 の mulmoscript-plugin のツール定義がまさにそれで、MulmoClaude の `vite build` で確認した。

## 方針

- 新しい入口 `mulmocast/remotion/guide`（`src/index.remotion_guide.ts`）。`system_prompt.ts` → `packages.ts` だけを読む。
- `mulmocast/remotion` からの公開は残す（既存の利用者を壊さない）。
- テスト `test/utils/test_remotion_guide_entry.ts`:
  - esbuild で platform `browser` にバンドルでき、パッケージを一つも読まない。
  - `mulmocast/remotion` はブラウザ向けにバンドルできない（この入口が要る理由を固定する）。
  - 二つの入口のガイドが同じ。
  - `package.json` の `exports` が tsc の出力先を指している。
