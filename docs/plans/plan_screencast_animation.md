# Plan: CDP Screencast for Animation Recording

## Problem

現在の animated html_tailwind は frame-by-frame screenshot で動画生成:
- 300 frames × ~500ms/frame = 2.5分/beat
- 13 beats で 30分以上

`page.screenshot()` は毎回ページのコンポジット→PNG エンコード→ディスク書き込みを行うため非常に遅い。

## Solution

Puppeteer 24.x の `page.screencast()` API を使い、アニメーションをリアルタイム再生しながら録画する。

## Design

### 現在の仕組み

```
for frame in 0..totalFrames:
  page.evaluate(render(frame))   // JS で DOM 更新
  page.screenshot()              // PNG 保存（遅い）
ffmpeg: frames → video
```

### 新しい仕組み

```
page.screencast({ path: video.mp4, fps: 30 })  // 録画開始
page.evaluate(playAnimation())                   // リアルタイム再生
wait(duration)                                   // 再生時間分待つ
recorder.stop()                                  // 録画停止
```

### `tailwind_animated.html` の変更

既存の `render(frame, totalFrames, fps)` に加えて、`playAnimation()` 関数を追加:
- `requestAnimationFrame` ループで自動的に frame を進める
- `MulmoAnimation.update()` を毎フレーム呼ぶ
- `totalFrames` に達したら resolve する Promise を返す

### `renderHTMLToFrames` → `renderHTMLToVideo`

新関数 `renderHTMLToVideo` を追加:
1. ブラウザ起動 & ページ作成
2. HTML ロード
3. `page.screencast()` で録画開始
4. `page.evaluate(() => playAnimation())` でアニメーション再生
5. `recorder.stop()` で録画停止
6. mp4 ファイルが直接生成される（frames dir + ffmpeg 変換が不要に）

### `html_tailwind.ts` の変更

`processHtmlTailwindAnimated` で:
- `renderHTMLToFrames` → `renderHTMLToVideo` に切り替え
- frames dir 作成・削除が不要に
- `framesToVideo()` 呼び出しが不要に

## Affected Files

| File | Change |
|------|--------|
| `assets/html/tailwind_animated.html` | `playAnimation()` 関数追加 |
| `src/utils/html_render.ts` | `renderHTMLToVideo()` 新規追加 |
| `src/utils/image_plugins/html_tailwind.ts` | screencast 版に切り替え |

## Expected Performance

- 10秒のアニメーション → 10秒 + オーバーヘッド数秒 ≈ 12-15秒
- 現在: 10秒 × 30fps × 500ms = 150秒（2.5分）
- **約10倍の高速化**

## Risks

- `page.screencast()` は experimental API
- ffmpeg が必要（既にプロジェクトで使用しているので問題なし）
- リアルタイム再生なので CPU 負荷でフレーム落ちの可能性
- 既存の frame-by-frame はフォールバックとして残す
