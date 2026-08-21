# fix: mermaid の title と図のソースをエスケープする

#1535 の第3弾（#1536 chart、#1538 style に続く）。

## サイト

| 経路                      | 差し込み口        | 文脈                                 |
| ------------------------- | ----------------- | ------------------------------------ |
| dump (`mermaidHtml`)      | `${title}`        | `<h3>` の text                       |
| dump (`mermaidHtml`)      | `${code.trim()}`  | `.mermaid` div の text               |
| render (`processMermaid`) | `${title}`        | `assets/html/mermaid.html` の `<h1>` |
| render (`processMermaid`) | `${diagram_code}` | 同 `.mermaid` div                    |

`${id}` は `generateUniqueId` の内部生成、`${style}` は #1538 で対応済み。

## エスケープしても mermaid は壊れない（実測）

mermaid は要素の textContent を読む。HTML パーサは実体参照を復号して textContent を作るので、
mermaid が受け取る文字列は変わらない。5種類の図（単純 / `&` と引用符入り / 山括弧入り / 日本語 /
sequence）で、エスケープ有無の**レンダリング済み SVG がバイト単位で同一**であることを確認した。

## browser-safety ゲートの allow-list

`mermaid_html.ts` は `beat_html` の依存グラフ内なので、`@mulmocast/deck` の追加でゲートが発火した。
deck が持ち込むのは `lib/utils.js` 1ファイルのみ（beat_html 全体で 7 入力 / 58.3 KB、大半は marked）。
barrel 経由だと 551 KB になるため deep import。理由を allow-list のコメントに記録。
