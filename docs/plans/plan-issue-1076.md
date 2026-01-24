# Issue #1076: クレジット＋トランジション使用時の動画延長バグ修正

## 問題の概要

クレジット機能（`credit: "closing"`）とトランジション効果（fade等）を同時に使用すると、エンドクレジットが異常に長く表示される（例：1-2秒のはずが13秒になる）。

## 根本原因

[movie.ts:464](../src/actions/movie.ts#L464) で `addSplitAndExtractFrames()` に渡される `duration` が**ビート全体の長さ**になっている。

```typescript
// Line 446
const duration = Math.max(studioBeat.duration! + getExtraPadding(context, index), studioBeat.movieDuration ?? 0);

// Line 464
addSplitAndExtractFrames(ffmpegContext, videoId, duration, isMovie, needFirst, needLast, canvasInfo);
```

しかし、静止フレーム（`_first`, `_last`）はトランジション効果の期間だけ必要（通常0.3秒）。

[movie.ts:379,386,393](../src/actions/movie.ts#L379) で `nullsrc=...duration=${duration}` により、ビート全体の長さの静止フレームが生成され、FFmpegのオーバーレイ処理が長い方の入力に合わせてしまう。

## 修正方針

静止フレーム生成時に「ビート全体の長さ」ではなく「実際に使うトランジション時間（クランプ後）」を使用する。
また、静止フレームはトランジション中にしか使わないため、**長さはトランジション時間と一致させる**（過剰に長いとoverlay出力が延長される）。
最小長は1フレーム（例: 30fpsなら約0.033秒）を下限にする。

### 修正箇所

**ファイル**: [src/actions/movie.ts](../src/actions/movie.ts)

#### 1. `addSplitAndExtractFrames` の呼び出し変更

Line 464付近を以下のように変更：

```typescript
if (needFirst || needLast) {
  // 静止フレームはトランジション時間だけ必要（クランプ後の実時間）
  const { firstDuration, lastDuration } = getTransitionFrameDurations(context, index, beatTimestamps);
  if (needFirst) {
    addSplitAndExtractFrames(ffmpegContext, videoId, firstDuration, isMovie, true, false, canvasInfo);
  }
  if (needLast) {
    addSplitAndExtractFrames(ffmpegContext, videoId, lastDuration, isMovie, false, true, canvasInfo);
  }
}
```

#### 2. 新規関数 `getTransitionFrameDurations` の追加

```typescript
const getTransitionFrameDurations = (
  context: MulmoStudioContext,
  index: number,
  beatTimestamps: number[]
): { firstDuration: number; lastDuration: number } => {
  const minFrame = 1 / 30; // 30fpsを想定。最小1フレーム

  // このビートに対するトランジション（slidein/wipe）
  const currentTransition = MulmoPresentationStyleMethods.getMovieTransition(
    context,
    context.studio.script.beats[index]
  );
  let firstDuration = 0;
  if (currentTransition && index > 0) {
    const prevBeatDuration = context.studio.beats[index - 1].duration ?? 1;
    const currentBeatDuration = context.studio.beats[index].duration ?? 1;
    const maxDuration = Math.min(prevBeatDuration, currentBeatDuration) * 0.9;
    firstDuration = Math.min(currentTransition.duration, maxDuration);
  }

  // 次のビートに対するトランジション（fade/slideout/wipe）
  const nextTransition =
    index < context.studio.script.beats.length - 1
      ? MulmoPresentationStyleMethods.getMovieTransition(context, context.studio.script.beats[index + 1])
      : null;
  let lastDuration = 0;
  if (nextTransition) {
    const prevBeatDuration = context.studio.beats[index].duration ?? 1;
    const currentBeatDuration = context.studio.beats[index + 1].duration ?? 1;
    const maxDuration = Math.min(prevBeatDuration, currentBeatDuration) * 0.9;
    lastDuration = Math.min(nextTransition.duration, maxDuration);
  }

  return {
    firstDuration: Math.max(firstDuration, minFrame),
    lastDuration: Math.max(lastDuration, minFrame),
  };
};
```

## 検証方法

1. イシューに記載のテストケースを作成：
   - `credit: "closing"` を有効化
   - グローバルトランジション設定（fade 0.3秒）
   - 最後から2番目のビートが最後のビートより長い構成

2. 修正前後で動画の長さを比較：
   ```bash
   ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 output.mp4
   ```

3. テスト実行：
   ```bash
   yarn ci_test
   ```

4. 手動で動画を再生し、クレジットが適切な長さで表示されることを確認

## 影響範囲

- トランジション効果を使用するすべての動画生成に影響
- 修正により静止フレームのサイズが大幅に削減され、メモリ使用量も改善される可能性あり
