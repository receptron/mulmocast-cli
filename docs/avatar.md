# しゃべるアバター（AvatarScript）

## 概要

話者（speaker）にアバターを指定すると、スライドや画像・動画の上にアバターが重なり、ナレーションに合わせて口を動かしながらしゃべる動画になります。表情（emotion）と動き（うなずく・首をかしげるなど）は、場面（beat）ごとに台本で指定できます。

アバターの描画には [AvatarScript](https://github.com/receptron/avatarscript)（npm `avatarscript`）を使います。口の動きは、読み上げた音声と台本の文章を突き合わせて決めるので、どの TTS（OpenAI / Gemini / ElevenLabs など）でも使えます。

**サンプルファイル**: [`scripts/test/test_avatar.json`](https://github.com/receptron/mulmocast-cli/blob/main/scripts/test/test_avatar.json)

## 準備

アバターを使うときだけ、次の 2 つを追加でインストールします（使わない人は不要です）。

```bash
npm install avatarscript onnxruntime-node
```

- `onnxruntime-node` は約 290 MB あります。
- 最初にアバターを描画するとき、音声と文章を合わせるためのモデル（約 635 MB）が一度だけダウンロードされ、`~/.cache/avatarscript/models` に保存されます。2 回目以降は再利用されます。
- 2 つが入っていない状態でアバターを使うと、`npm install avatarscript onnxruntime-node` を案内するエラーで止まります。
- npm の設定によっては、パッケージのインストールスクリプトが止められます（`npm warn install-scripts … had install scripts blocked`）。そのときは、画面描画に使う Chrome を自分で入れます: `npx puppeteer browsers install chrome`

## アバターを指定する

`speechParams.speakers.<話者>.avatar.source` に、アバターの場所を書きます。

```json
{
  "speechParams": {
    "speakers": {
      "Ani": {
        "provider": "gemini",
        "voiceId": "Leda",
        "avatar": { "source": "https://raw.githubusercontent.com/receptron/mulmocast-media/main/avatars/ani" }
      }
    }
  },
  "beats": [
    { "speaker": "Ani", "text": "みなさん、こんにちは！", "image": { "type": "markdown", "markdown": ["# Hello"] } }
  ]
}
```

`source` には次のどちらかを書きます。

- **URL**: アバターパッケージのフォルダ（または `avatar.json`）の http(s) URL。取得した画像は `~/.cache/avatarscript/avatars/` にキャッシュされます
- **パス**: 台本ファイルからの相対パス。`avatar.json` のあるフォルダ、または mesh-avatar-studio のプロジェクト

### すぐ使えるアバター

[mulmocast-media](https://github.com/receptron/mulmocast-media/tree/main/avatars) に、そのまま使えるアバターがあります（© 2026 receptron, MIT License）。URL の最後の名前を入れ替えて使います。

```text
https://raw.githubusercontent.com/receptron/mulmocast-media/main/avatars/<名前>
```

| 名前 | 元のイラスト |
|---|---|
| `ani` | [ani_clean.jpeg](https://github.com/receptron/mulmocast-media/blob/main/characters/ani_clean.jpeg) |
| `marilyn` | [marilyn_white.jpeg](https://github.com/receptron/mulmocast-media/blob/main/characters/marilyn_white.jpeg) |
| `reika` | [reika_white.jpg](https://github.com/receptron/mulmocast-media/blob/main/characters/reika_white.jpg) |
| `seiya` | [seiya_white.jpg](https://github.com/receptron/mulmocast-media/blob/main/characters/seiya_white.jpg) |
| `ken` | [ken.jpg](https://github.com/receptron/mulmocast-media/blob/main/characters/ken.jpg) |

### 自分のアバターを作る

イラスト 1 枚から、[mesh-avatar-studio](https://github.com/shinshin86/mesh-avatar-studio) でアバターを作れます。できたプロジェクトのフォルダを `source` にパスで指定します。

## 表情・動き・位置（avatarParams）

`avatarParams` は、台本の一番上（全体の既定値）と、各 beat（その場面だけ）に書けます。

```json
{
  "speaker": "Ani",
  "text": "表情や、うなずく動きも、台本で指定できるんです。",
  "avatarParams": {
    "emotion": "happy",
    "motions": [{ "motion": "nod", "at": "台本" }]
  }
}
```

| 項目 | 内容 |
|---|---|
| `emotion` | その場面の表情: `neutral` / `happy` / `sad` / `angry` / `surprised` / `relaxed` |
| `motions` | 動きの一覧 `[{ "motion": …, "at": … }]`。`at` は `text` の中の言葉で、その言葉を話すときに動きが始まります（省略すると場面の最初） |
| `position` | 位置と大きさ: `x`（アバターの中心、画面幅の %、既定 `84%`）、`y`（アバターの下端、画面の高さの %、既定 `100%`）、`scale`（アバターの高さ、画面の高さの %、既定 `62%`） |
| `hidden` | `true` で、その場面だけアバターを隠す |

`motion` の名前（mesh アバターの場合）: `nod`（うなずく）、`tilt`（首をかしげる）、`think`（考える）、`giggle`（くすっと笑う）、`surprise`（驚く）、`shy`（照れる）、`no`（首を振る）、`wink`（ウインク）、`greet`（あいさつ）

`position` は、beat → 話者の `avatar.position` → 台本の一番上の `avatarParams` → 既定値、の順に決まります。

```json
{
  "avatarParams": { "position": { "x": "82%", "y": "100%", "scale": "62%" } },
  "beats": [
    { "speaker": "Ani", "text": "…", "avatarParams": { "position": { "x": "18%", "scale": "48%" } } }
  ]
}
```

## 動画を作る

ふつうの動画と同じく `mulmo movie` で作ります。アバターの描画は自動で行われます。

```bash
npx mulmo movie my_script.json
```

- 話者ごとに、動画全体で 1 本のアバター映像を作ります（場面が変わっても、まばたきや呼吸が途切れません）。アバターを持つ話者が複数いれば、全員が画面に出て、しゃべっていない人は待機の動きをします
- 作ったアバター映像はキャッシュされ、台本・音声・アバターが変わらなければ再利用されます。作り直すときは `-f` を付けます
- 字幕を出す場合、字幕はアバターの上に重なります

## うまくいかないとき

| 症状 | 対処 |
|---|---|
| `Avatars need the avatarscript and onnxruntime-node packages` で止まる | `npm install avatarscript onnxruntime-node` |
| 最初の 1 回だけ時間がかかる | 音声合わせのモデル（約 635 MB）のダウンロードです。2 回目からは速くなります |
| 画面の描画（Chrome）が起動しない | `npx puppeteer browsers install chrome` |
| アバターの見た目を変えたのに反映されない | `-f` を付けて作り直す |
