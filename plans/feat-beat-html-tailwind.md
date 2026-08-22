# feat(beat_html): html_tailwind beat をブラウザ用 fragment にする

issue: #1526 の PR 13。これで対応 beat 種別は 8/8。

## 設計判断は既に存在していた

Node の `dumpHtml` は既に **script を出さず静的マークアップだけ**を返している
（`elements` があれば `swipeElementsToHtml`、無ければ著者の `html`）。
ブラウザ側も同じにするだけで、新しい判断は要らなかった。

script を出せない理由はブラウザ側でさらに強い: `innerHTML` 経由で注入された `<script>` は実行されない。
著者の `script`、swipe のアニメーション駆動、frame ベースの `animation` はいずれも
スクリプト実行を要するので、両経路とも「静止状態の beat」を見せる。

## 著者の html はエスケープしない

この beat 種別では**マークアップが中身**で、スキーマは `script` も受け付ける。
エスケープすると機能が消えるだけで、著者が持っていない能力を防ぐわけではない。
`BeatHtmlFragment.html` の「サニタイズしない」契約が最も効く箇所。

## `as` キャストを型ガードに置き換えた

`dumpHtml` は `beat.image as { elements?: SwipeElement[] }` としていた。
`swipeElementSchema` が `z.lazy` のため `z.ZodType` と注釈され、`z.array(...)` が `unknown[]` になるのが原因。

`SwipeElement` は**全フィールドが optional** なので「各要素が非 null のオブジェクト」を確かめる
`isSwipeElements` は構造的に健全な narrowing になる（キャストの言い換えではない）。
zod は parse 時に既に形を検証しているので、これは型の穴を埋めるだけのもの。

## 検証

Node 経路の挙動不変を差分ハーネスで実測する。
