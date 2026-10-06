# remotion Beat

ビートで表示したい内容を文章で書くと、Claude Code（`claude -p`）がその場面を Remotion のコンポーネントとして書き、
MulmoCast がそれを描画してビートの動画にする。3D（three.js）、SVG、パスの描画、ノイズ、シェーダー効果まで使える。

## Beat Schema

```json
{
  "remotionParams": {
    "brief": "深い紺の背景、オフホワイトの文字、強調色はシアン一色。Inter と Hiragino Sans、見出しは極太。"
  },
  "beats": [
    {
      "text": "ナレーション",
      "image": {
        "type": "remotion",
        "prompt": "中央にタイトルが現れ、その下に3つの箱が左から順に現れて矢印でつながる",
        "fps": 30
      }
    }
  ]
}
```

| フィールド                     | 型       | 説明                                                                        |
| ------------------------------ | -------- | --------------------------------------------------------------------------- |
| `image.prompt`                 | `string` | 場面で表示したい内容。`code` とどちらか一方                                 |
| `image.code`                   | `object` | 出来上がったコンポーネント。`prompt` とどちらか一方（下の「コードを渡す」） |
| `image.fps`                    | `number` | 動画のフレームレート（1〜60）。省略時は 30                                  |
| `remotionParams.brief`（任意） | `string` | 動画全体のアートディレクション。全場面に渡され、色・書体・雰囲気がそろう    |

`claude -p` には、`prompt` に加えて、実際に話されるナレーション（翻訳して描画するときはその言語の文。音声・字幕と同じ `localizedText`）、`remotionParams.brief`、場面の位置（全 N 場面中の何番目か）、
キャンバスサイズと fps を渡す。ビートの長さは音声から決まる（`duration` を指定すればそちらを使う）。

サンプル:

- [scripts/samples/mulmocast_intro_remotion.json](../scripts/samples/mulmocast_intro_remotion.json) — 6 場面の紹介動画（1920×1080、3D、トランジション付き）
- [scripts/test/test_remotion.json](../scripts/test/test_remotion.json) — 最小の 2 場面

## コードを渡す（`claude -p` を使わない）

ホストのエージェント（MulmoTerminal / MulmoClaude のセルにいる Claude Code や Codex）や人が書いた `.tsx` を渡すと、
MulmoCast は `claude -p` を呼ばずに描画だけをする。形は mermaid の `code` と同じで、`kind` は `text` か `path`（台本のディレクトリからの相対パス）。

```json
"image": { "type": "remotion", "code": { "kind": "path", "path": "scenes/intro.tsx" }, "fps": 30 }
"image": { "type": "remotion", "code": { "kind": "text", "text": "import { AbsoluteFill } from \"remotion\"; export default ..." } }
```

- 生成・修正・見た目の点検はしない。長さは `prompt` のときと同じく音声（または `duration`）から決まる。
- 描画に失敗したら、コードの場所（ファイルの絶対パス、またはインラインなら何番目のビートか）とエラーを付けて止まる。直すのは書いた側。
- コンポーネントは 1 ファイルで完結させる（相対 import は使えない。作業ディレクトリに写して描画するため）。
- 書き方の約束と依存パッケージは `mulmocast/remotion` から取り出せる:

```ts
import { REMOTION_COMPONENT_GUIDE, REMOTION_PACKAGES, missingInstalledRemotionPackages, remotionInstallCommand } from "mulmocast/remotion";
```

| 名前                                 | 内容                                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `REMOTION_COMPONENT_GUIDE`           | `claude -p` に渡すシステムプロンプトから返答の形式を除いたもの（import の制限、時間の作り方、デザインの単位など） |
| `REMOTION_PACKAGES`                  | 描画とコンポーネントに要るパッケージの一覧（`REMOTION_RENDER_PACKAGES` + `REMOTION_SCENE_PACKAGES`）              |
| `missingInstalledRemotionPackages()` | mulmocast から見て入っていないパッケージ                                                                          |
| `ensureRemotionPackages()`           | 足りなければインストールのコマンド付きで例外を投げる                                                              |
| `remotionInstallCommand()`           | `npm install ...` の文字列                                                                                        |

## 必要なもの

- `prompt` を使うとき: Claude Code がインストールされ、ログイン済みであること（`claude` が PATH にあること）
- 任意依存のパッケージ:

```bash
npm install remotion @remotion/bundler @remotion/renderer react react-dom \
  @remotion/three three @react-three/fiber @remotion/effects @remotion/paths @remotion/noise \
  @remotion/shapes @remotion/transitions @remotion/motion-blur @remotion/layout-utils
```

## 処理の流れ

1. **生成**: `claude -p` に固定のシステムプロンプト（[system_prompt.ts](../src/utils/remotion/system_prompt.ts)）と場面の依頼文を渡す。
   - ツールは無効（`--tools ""`）。ユーザー／プロジェクトの設定・フック・MCP も読まない（`--setting-sources "" --strict-mcp-config`）。
   - システムプロンプトには次のものが入っている:
     - 出力の約束（`export default`、使ってよい import の一覧、ネットワーク禁止）
     - タイミングの決まり（すべて `useCurrentFrame()` から作る、CSS アニメーション・`Math.random()`・`useFrame` の禁止、長さに対する割合で組む）
     - デザインシステム（`width / 1920` を単位にした文字サイズと余白、強調色は一色、絵文字禁止）
     - モーションの決まり
     - 描画できることを確かめた道具の見本（`evolvePath`、`noise2D`、`ThreeCanvas`、`HtmlInCanvas` + `@remotion/effects`、光漏れ、図形）
2. **キャッシュ**: 返ってきたコードは `<画像ディレクトリ>/<beat>_remotion/<ハッシュ>.tsx` に保存する。
   - ハッシュは、上で `claude -p` に渡すものすべてとシステムプロンプトから作る。どれかを変えると作り直し、`-f` でも作り直す。
   - 長さはコードに含まれない。音声が変わって長さが変わっても `claude -p` は呼ばず、描画し直すだけになる。
3. **描画**: `@remotion/bundler` → `@remotion/renderer` で、ビートの `_animated.mp4` と、最終フレームの PNG（PDF・サムネイル用）を書き出す。
   - WebGL（three.js）のために、Chromium は `gl: "angle"` で起動する。
   - 音声が無く長さが分からないとき（PDF のみなど）は、PNG だけを書き出す。
4. **修正**: 描画に失敗したら、エラーと失敗したコードを `claude -p` に渡して直させる（回数に上限あり）。直ったコードがキャッシュに入る。
5. **見た目の自己点検**: 新しく生成した場面だけ、場面の 30%・60%・95% のフレームを描画して `claude -p`（`Read` ツールのみ許可）に見せる。
   - 確かめる観点: 文字のはみ出し、要素の重なり、読みにくさ、構図の弱さ、描画の欠け、依頼との食い違い。
   - 問題が無ければ `LGTM`、あれば改善したコンポーネントを返させる。
   - 改善版が描画できなければ、最初の版に戻す。点検そのものが失敗したときも、最初の版のまま進む。

## 注意

- 生成されたコードは手元のヘッドレスブラウザで実行され、ネットワークにもアクセスできる。信頼の扱いは `html_tailwind` の `script` と同じで、信頼できない台本の `remotion` ビートは、信頼できない `html_tailwind` と同様に扱うこと（描画ブラウザのネットワーク遮断は #1594）。
- `moviePrompt` とは同じビートで併用できない（アニメーション付き `html_tailwind` と同じ）。
- `soundEffectPrompt` はまだ効かない（アニメーション付き `html_tailwind` と同じ。効果音の生成がプラグインの動画を待たないため）。
- GPU の無い Linux では、`gl: "angle"` で WebGL の文脈を作れない場合がある。
