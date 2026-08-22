# fix: mermaid の title と図のソースをエスケープする

#1535 の第3弾（#1536 chart、#1538 style に続く）。

## サイト

| 経路                      | 差し込み口        | 文脈                                 |
| ------------------------- | ----------------- | ------------------------------------ |
| dump (`mermaidHtml`)      | `${title}`        | `<h3>` の text                       |
| dump (`mermaidHtml`)      | `${code.trim()}`  | `.mermaid` div の text               |
| render (`processMermaid`) | `${title}`        | `assets/html/mermaid.html` の `<h1>` |
| render (`processMermaid`) | `${diagram_code}` | 同 `.mermaid` div                    |

`${id}` も**エスケープする**。dump 経路の呼び出し元 (`mermaid.ts`) は `generateUniqueId` を渡すが、
markdown 経路 (`beat_html/markdown.ts`) は caller 指定の `idPrefix` から組み立てており、
`beat_html/index.ts` は「caller だけが一意な id を決められる」と書いている。
`mulmoBeatSchema.id`（"Unique identifier for the beat"）はスクリプト由来かつ無制約なので、
host が beat.id を prefix に渡すと属性を抜け出せる。mermaid の id は属性1文脈なのでエスケープで足りる。

chart 側は id が属性と JS 文字列リテラルの2文脈に出るためエスケープでは解けない → #1540。

`${style}` は #1538 で対応済み。

## エスケープしても mermaid は壊れない（実測）

mermaid は要素の **innerHTML** を読み、パース前に entity decode する
(mermaid 11.17.0: `o = u.innerHTML; o = ck(or.entityDecode(o))`)。したがって受け取る文字列は変わらない。

当初「textContent を読む」と書いていたがこれは誤りで、Codex のレビューで指摘され runtime を読んで確認した。
仕組みが違うと危険になる形が変わるため、測定対象を10形に広げた: 単純 / `&` と引用符 / 山括弧 / 日本語 /
sequence / ラベル内の `<br/>` / mermaid 自身の `#quot;` / ラベル内の `&amp;` / ラベル内の生タグ `<b>` /
`%%{init}%%` ディレクティブ。**全形でレンダリング済み SVG がバイト単位で同一**。

## browser-safety ゲートの allow-list

`mermaid_html.ts` は `beat_html` の依存グラフ内なので、`@mulmocast/deck` の追加でゲートが発火した。
deck が持ち込むのは `lib/utils.js` 1ファイルのみ（beat_html 全体で 7 入力 / 58.3 KB、大半は marked）。
barrel 経由だと 551 KB になるため deep import。理由を allow-list のコメントに記録。
