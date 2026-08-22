# feat(beat_html): image / movie beat をブラウザ用 fragment にする

issue: #1526 の PR 8-9（image と movie をまとめた）。

## remote 判定は入れない

ユーザー指示: 「remote の判定はとくにいれなくてもよい。ユーザが remote を指定する前提でよい」。

したがって source が名指す src をそのまま出す:

| kind     | src                                                               |
| -------- | ----------------------------------------------------------------- |
| `url`    | その URL                                                          |
| `path`   | そのまま出し、host が自分のページ基準で解決する                   |
| `base64` | スキーマに media type が無く `data:` URI を組めないので描画しない |

## src はエスケープする（実測に基づく）

`URLStringSchema` は `z.url()` だが、**引用符を通す**:

```
https://e.com/a.mp4" onerror="pwn()   → 🔴 スキーマを通る
javascript:alert(1)                    → 🔴 スキーマを通る
```

既存 `movie.ts` の `src="${url}"` は無エスケープなので属性を抜け出せる。共有 markup 側でエスケープする。

通常 URL への影響はゼロ: `?x=1&y=2` は属性上 `&amp;` になるが、**ブラウザは `?x=1&y=2` を取りに行く**
（実測: リクエスト URL がバイト一致）。

## alt

`MulmoImageMedia` は `{ type, source }` だけで代替テキストを持たない。dispatcher が
`beat.description ?? beat.text` を渡す — このモジュールが届く範囲で唯一の「絵の説明」。

## image と movie を1つの PR にした理由

`mediaSrc` と「メディア beat が要素になる」という同じ不変条件を共有しており、
別々に revert する意味が薄いため。
