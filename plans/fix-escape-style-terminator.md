# fix: script 由来の CSS が `<style>` ブロックを抜け出せる問題

issue: #1537（#1535 の第2弾）。

## 調べたこと — 当初 issue に書いた入力経路は間違っていた

issue には `beat.image.style` と書いたが、これは誤り。`resolveStyle` はこれを **CSS ではなく
スタイル名**として `getMarkdownStyle` で引いており、未知の名前は fallback に置き換わる
(`utils.ts:10`)。最初の再現はテンプレートに直接文字列を差し込んだもので、ユーザー入力が
そこに届くことを示していなかった。

実際に届くのは `textSlideParams.cssStyles`:

```text
beat.textSlideParams.cssStyles / presentationStyle.textSlideParams.cssStyles
  → getTextSlideStyle()        (mulmo_presentation_style.ts:85-90)
  → params.textSlideStyle      (image_agents.ts:25)
  → resolveCombinedStyle()     (bg_image_util.ts:64)
  → ${style} in assets/html/{chart,mermaid}.html
```

スキーマは `cssStyles: stringOrStringArray`（`schema.ts:493`）で内容に制約なし。

## 変更

- `neutralizeStyleTerminator(css)` を `html_escape.ts` に追加（pure）
- `resolveCombinedStyle` の返り値に適用。**生産者は1つ、消費者は4プラグイン**
  （chart / mermaid / markdown / text_slide）なので、ここ1箇所で全部塞がる

CSS 全体をエスケープすると「script が CSS を書ける」仕様が壊れる。`<style>` は raw text 要素で
終端は `</style` だけなので、そこだけ CSS の16進エスケープ（`\3c` に**続く空白1個**まで含めてエスケープを終端する）
に置き換える。マッチした文字列はそのまま繋ぐので `</STYLE>` の大文字も保たれる。

## 検証

実ブラウザで、`getTextSlideStyle` から組み立てた実経路で before/after を比較する。
このエスケープが値を保つこと（`content: "</style>"` が同じ値として読まれること）も確認する。
