# feat: slide content block に chart / mermaid タイプ追加

## Summary

スライド DSL の content block に `chart`（Chart.js）と `mermaid` タイプを追加。
既にビートレベルで動いている Chart.js / Mermaid の仕組みをスライド内の content block として使えるようにする。

## Schema

- `chartBlockSchema`: `{ type: "chart", chartData: Record<string, unknown>, title?: string }`
- `mermaidBlockSchema`: `{ type: "mermaid", code: string, title?: string }`
- `contentBlockSchema` の discriminatedUnion に追加（8 → 10 types）

## CDN Injection

`generateSlideHTML` で content block を走査し、chart/mermaid が存在する場合のみ CDN script タグを `<head>` に注入。Mermaid のテーマはスライドの bg 色の明暗から自動判定。

## ID Generation

`src/slide/utils.ts` にカウンタベースの `generateSlideId(prefix)` を追加。Node.js 依存なし。

## Files Changed

| File | Change |
|------|--------|
| `src/slide/schema.ts` | `chartBlockSchema`, `mermaidBlockSchema` 追加 |
| `src/slide/blocks.ts` | `renderChart`, `renderMermaid` 追加 |
| `src/slide/render.ts` | CDN script 条件注入 |
| `src/slide/utils.ts` | `generateSlideId`, `detectBlockTypes` 追加 |
| `src/slide/index.ts` | 新 schema/type を export |
| `README.md` | Content Block Types を 10 に更新 |
| `.claude/skills/slide/SKILL.md` | chart, mermaid ドキュメント追加 |
| `test/slide/test_blocks.ts` | chart, mermaid ブロックテスト |
| `test/slide/test_render.ts` | CDN 条件注入テスト |
| `scripts/test/test_slide_chart_mermaid.json` | サンプル MulmoScript |
