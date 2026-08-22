# fix: element id は「許可集合の検証」で守る

issue: #1540。#1535 のエスケープ作業から派生。

## なぜエスケープでは解けないか

`chart_html.ts` の id は2つの文脈に出る:

```html
<canvas id="${chartId}"></canvas>                  ← HTML 属性
  const ctx = document.getElementById('${chartId}')  ← <script> 内の JS 文字列リテラル
```

`<script>` の中では HTML 実体参照は復号されない。属性側だけ `escapeHtml` を掛けると
JS 側と食い違い `getElementById` が一致しなくなる。文脈ごとに別のエスケープを当てる手もあるが、
その場合は文脈が増えるたびに規則が増え、同期が崩れた箇所が穴になる。

## 採った形: 許されるものを列挙する

`[A-Za-z0-9_-]+` に限れば、HTML 属性・JS 文字列リテラル・CSS セレクタ・URL 断片の
**どの文脈でも安全**になる。新しい文脈が増えても壊れない。fail closed。

- `src/utils/element_id.ts`（新規, pure）: `isSafeElementId` / `assertSafeElementId`
- 強制点は3つ: `chartHtml` / `mermaidHtml` / `beatToHtml`（境界）

## 到達性

`beat_html/index.ts` の契約は「beat の id か index を渡せ」と書いており、
`mulmoBeatSchema.id`（"Unique identifier for the beat"）はスクリプト由来かつ無制約。
host が beat.id をそのまま渡すと属性を抜け出せる。

## 正規化ではなく throw にした理由

不正文字を置換すると、異なる2つの beat id が同じ安全な id に潰れ得る。
重複 element id はまさに `idPrefix` が防ごうとしているバグなので、黙って直すより落とす。
契約に「index を渡すか、自分で sanitize しろ」と明記した。

## #1539 との関係

#1539 では mermaid の id を `escapeHtml` した。検証はそれより強い（JS 文字列文脈も覆う）ため、
そちらのエスケープは外して規則を1つにした。
