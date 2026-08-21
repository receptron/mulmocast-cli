# fix: chart の HTML / inline JS 埋め込みをエスケープする

親 issue: #1535 の第1弾（chart のみ）。

## 調べたこと

`#1535` は当初「6ファイルを一括で直す」と書いていたが、実際に各サイトを見ると3種類に割れる。

| 種別                                        | 該当                                                     | 対応                               |
| ------------------------------------------- | -------------------------------------------------------- | ---------------------------------- |
| データ（HTML text / 属性 / script 内 JSON） | chart の title・chartData、mermaid の title・code        | エスケープする                     |
| CSS 文字列内の URL                          | `bg_image_util` の `url('${imageUrl}')`                  | CSS エスケープ（別種）             |
| 意図的なマークアップ                        | `html_tailwind` のユーザー HTML/JS、markdown→marked 経路 | エスケープ不可。契約として明記する |

3番目をエスケープすると機能が壊れる。`size` は enum、`opacity` は範囲付き数値なのでユーザー制御ではない。

chart の中でも、実際にユーザーが握るのは **title と chartData の2つだけ**。
canvas id は内部生成 (`generateUniqueId`)、CDN URL は内部テーブル（プロトタイプ経由の件は #1534）なので、
到達しない値まで包まない。

## 変更

- `src/utils/html_escape.ts`（新規, pure）
  - `escapeHtml(value)` — HTML text と引用符付き属性の両方に使える
  - `escapeJsonForScript(json)` — `JSON.stringify` の出力を inline `<script>` 用に無害化
  - lookup は Map。オブジェクトリテラルだと #1534 と同じプロトタイプ経由の穴が空く
- `chart_html.ts` — title に `escapeHtml`、chartData に `escapeJsonForScript`

## 検証

実ブラウザ（puppeteer）で main と突き合わせる。build が通ることは動くことの証明にならない。

## 残り（別PR）

mermaid / bg_image_util / html_tailwind・markdown の契約。
`src/actions/html.ts:51` の `<title>${title}</title>` も無エスケープ。
