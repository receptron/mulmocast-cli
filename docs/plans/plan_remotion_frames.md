# remotion のコンポーネントを決まった割合のコマだけ描く — #1602

## 目的

ホストのエージェントが、`code` として渡す前（または渡した後）の `.tsx` を、台本なしで決まった割合のコマだけ PNG にして見られるようにする。

## 入口（案 A）

```ts
import { renderRemotionFrames } from "mulmocast/remotion";

const frames = await renderRemotionFrames({ code, durationSec: 6, fps: 30, width: 1920, height: 1080, outDir: "/tmp/scene" });
// → [{ fraction: 0.3, frame: 54, path: "/tmp/scene/frame_0_030.png" }, ...]
```

| 引数                       | 既定               | 説明                                                   |
| -------------------------- | ------------------ | ------------------------------------------------------ |
| `code`                     | 必須               | TSX のソース（`export default` の場面）                |
| `durationSec`              | 必須               | 場面の長さ。ビートでは音声から決まる値                 |
| `fps` / `width` / `height` | 30 / 1920 / 1080   |                                                        |
| `fractions`                | `[0.3, 0.6, 0.95]` | `prompt` のときの見た目の点検と同じ割合。0 以上 1 以下 |
| `outDir`                   | 必須               | PNG を書くディレクトリ。無ければ作る                   |

## 決めたこと

- 長さは呼び出し側が秒で渡す。台本や音声には触れない。
- 返すのは PNG のパス（と割合・コマ番号）。最終コマは返さない（要るなら `fractions` に `1` を入れる）。
- 描画に失敗したら、エラーを付けて例外にする。パッケージが足りなければ描画の前に止める。
- バンドルなどの作業ファイルは一時ディレクトリに置き、終わったら消す。`outDir` には PNG だけが残る。

## 共有するもの

- 割合からコマ番号への変換（`min(長さ - 1, floor(長さ × 割合))`）と、秒からコマ数への変換は、ビートの描画と同じ関数を使う（`src/utils/remotion/frames.ts`）。
- `renderRemotionScene` の最終コマを任意にする（ビートの描画は今までどおり必ず渡す）。
