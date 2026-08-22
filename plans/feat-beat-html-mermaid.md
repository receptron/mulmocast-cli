# feat(beat_html): mermaid beat をブラウザ用 fragment にする

issue: #1526 の PR 5。

## refactor は不要だった

issue の表には「refactor(mermaid) — code 解決を引数化」と書いていたが、実装を見ると不要だった:

- `mermaid_html.ts` は #1530 で既に pure に切り出し済み
- Node 依存は `MulmoMediaSourceMethods.getText`（fetch / fs）だけで、これは `mermaid.ts` 側にある
- ブラウザ側は `code.kind === "text"` を直接読めばよい

したがって PR 5 は fragment の追加だけ。

## 対応する code.kind

`text` のみ。`url` / `path` / `base64` は `getText` が fetch と fs で解決するのでブラウザから届かず、
`beatToHtml` は `undefined` を返す（placeholder を勝手に作らない、というモジュールの契約どおり）。
`mermaid.ts` の `dumpMarkdown` も既に同じ線を引いている。

## 検証

Node の dump 経路と同じ markup になることを実測で突き合わせ、
host が実際に描画できることを実ブラウザで確認する。
