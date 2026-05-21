# feat: zero-dependency `file://` HTML viewer command (#1385)

## User Prompt

> #1385 で要望されている、`mulmocast viewer <script>` で **依存ゼロ・サーバー不要・`file://` で開ける単一 HTML** を吐くコマンドを追加してほしい。
>
> 動画は一旦考えない。beats を image として書き出して、それを HTML に埋め込む（base64）。左右キーでスライドを移動できる、シンプルなビューワーで OK。
>
> フルスクリーンのスライドモードでも **スクロールせず左右キーだけで移動できる** UX にしてほしい。
>
> 既存パターン（`src/actions/html.ts`, `src/cli/commands/bundle/`）に倣ってキレイに作ってほしい。

## Goal

新しい CLI コマンド `mulmocast viewer <script>` を追加し、`output/` に **`<filename>_viewer.html`** を書き出す。

- **完全自己完結**: 外部 `<script src>` / `<link href>` 一切なし。画像も base64 data URI として埋め込み
- **サーバー不要**: `file:///path/to/<filename>_viewer.html` を直接ブラウザで開いて動く
- **オフライン動作**: ネット切断・エアギャップ環境でも問題なし
- **キーボードナビ**: ← → / Space / Home / End / `f` (fullscreen) / `Esc` (exit fullscreen)
- **「スライドモード」固定レイアウト**: `body { overflow: hidden; }` + 各スライド絶対配置で、フルスクリーン時も通常時も **スクロールしない**。 left/right キーだけで明示的に進める
- **スライドカウンター**: 画面右下に `current / total`

## 非ゴール（今回スコープ外）

- 動画 (`movieFile` / `lipSyncFile`) の埋め込み — 画像のみ
- 音声再生 — テキスト/画像だけ
- アニメーション / トランジション — 静的なスライド送りのみ
- 多言語切り替え UI — `--lang` で書き出し時に言語固定
- BGM
- スライドサムネイル一覧、スピーカーノート

将来的に「フル版 viewer」を別途出す余地として残す。今回は **オフライン安全な静的スライド配布** に特化。

## レイアウト方針（最重要）

スクロールしない・キーだけで送れるための CSS 設計:

```css
html, body { margin: 0; padding: 0; height: 100vh; overflow: hidden; background: #000; }

#deck { position: relative; width: 100vw; height: 100vh; }

section.slide {
  position: absolute;
  inset: 0;                              /* 全スライドが同じ位置に重なる */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  visibility: hidden;                    /* 非アクティブは非表示 */
  padding: 24px;
  box-sizing: border-box;
}

section.slide.active { visibility: visible; }

section.slide img {
  max-width: 100%;
  max-height: 80vh;                      /* キャプション分だけ残す */
  object-fit: contain;
  user-select: none;
}

section.slide p.caption {
  color: #eee;
  margin-top: 16px;
  text-align: center;
  font-family: system-ui, sans-serif;
  max-width: 80ch;
  max-height: 15vh;
  overflow: hidden;
}

#counter {
  position: fixed;
  right: 16px;
  bottom: 12px;
  color: #aaa;
  font-family: system-ui, sans-serif;
  font-size: 14px;
  user-select: none;
}
```

要点:
- `overflow: hidden` を `html, body` 両方に効かせて、画像が viewport より大きくてもスクロールバーは出ない
- 各スライドは `position: absolute; inset: 0;` で全画面・全重なり、`visibility` で切替（`display: none` だと画像の再レンダリングが入るので `visibility` の方が滑らか）
- 画像は `object-fit: contain` で常に viewport 内に収まる
- フルスクリーン (`requestFullscreen`) でも非フルスクリーンでも同じ動作

## 実装

### ファイル構成

```
src/actions/viewer.ts                          (新規, ~120 行)
src/cli/commands/viewer/
  ├─ index.ts                                  (新規, ~5 行)
  ├─ builder.ts                                (新規, ~15 行)
  └─ handler.ts                                (新規, ~15 行)
src/actions/index.ts                           (export 1 行追加)
src/cli/bin.ts                                 (command 1 行追加)
test/actions/test_viewer.ts                    (新規, ~40 行)
plans/feat-file-viewer.md                      (本ドキュメント)
```

### `src/actions/viewer.ts`

`html.ts` の `generateHtml` パターンを踏襲:

```typescript
export const viewer = async (context: MulmoStudioContext): Promise<void> => {
  MulmoStudioContextMethods.setSessionState(context, "viewer", true);
  try {
    const outputPath = viewerFilePath(context);
    const htmlContent = generateViewerHtml(context);
    fs.writeFileSync(outputPath, htmlContent, "utf8");
    writingMessage(outputPath);
    MulmoStudioContextMethods.setSessionState(context, "viewer", false, true);
  } catch (error) {
    MulmoStudioContextMethods.setSessionState(context, "viewer", false, false);
    throw error;
  }
};
```

主要ロジック:

1. `context.studio.beats[i]` を順に走査
2. `imageFile` または `htmlImageFile` を読み、`fs.readFileSync` → base64 → `data:image/<ext>;base64,...`
3. キャプションは `localizedText(beat, multiLingual?.[i], lang)`（既存パターン）
4. 画像が存在しない beat はスキップ
5. HTML テンプレートは `<section class="slide">` リスト + 上記 `<style>` + 下記ナビ `<script>`

### ナビ JS（インライン, ~30 行）

```javascript
(function () {
  const slides = document.querySelectorAll("section.slide");
  const counter = document.getElementById("counter");
  if (slides.length === 0) return;
  let current = 0;
  const show = (i) => {
    slides[current].classList.remove("active");
    current = Math.max(0, Math.min(slides.length - 1, i));
    slides[current].classList.add("active");
    counter.textContent = `${current + 1} / ${slides.length}`;
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
      e.preventDefault();
      show(current + 1);
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      show(current - 1);
    } else if (e.key === "Home") show(0);
    else if (e.key === "End") show(slides.length - 1);
    else if (e.key === "f" || e.key === "F") document.documentElement.requestFullscreen?.();
    else if (e.key === "Escape") document.exitFullscreen?.();
  });
  // Optional: click anywhere to advance (presentation-friendly fallback).
  document.addEventListener("click", () => show(current + 1));
  show(0);
})();
```

`e.preventDefault()` で Space / PageDown のデフォルトスクロールも抑止（`overflow: hidden` で見た目には出ないが、フォーカスやアクセシビリティのため）。

### `src/cli/commands/viewer/handler.ts`

`bundle/handler.ts` をなぞる:

```typescript
export const handler = async (argv) => {
  const context = await initializeContext(argv);
  if (!context) process.exit(1);
  await runTranslateIfNeeded(context);
  await images(context);
  await viewer(context);
};
```

### `builder.ts`

`image/builder.ts` 等を参考に、共通フラグだけ継承:
- `-o, --outdir`
- `-i, --imagedir`
- `-l, --lang`

独自フラグは今回追加しない（KISS）。

### エスケープ

タイトル・キャプションは `escapeHtml()` で `& < > " '` をエスケープして XSS を回避。

## 後方互換

- 新規コマンドのみ追加。既存 `html`, `pdf`, `bundle` の挙動は不変
- 既存テストへの影響なし

## バリデーション

- `yarn format`
- `yarn lint`
- `yarn build`
- `yarn ci_test`

## エッジケース

- 画像が大量 / 大きい場合: 出力ファイルサイズが base64 で ~33% 膨張。生成後に `writingMessage` でサイズを併記
- `imageFile` が存在しない beat はスキップ（既存 `html.ts` と同じ振る舞い）
- `htmlImageFile` も走査対象に含める（既存 `html.ts` がそうしているため整合）

## Out of scope（followup 候補）

- 動画 (`movieFile`) の埋め込み
- 音声トラックの埋め込み・再生
- BGM ループ再生
- 多言語切り替え UI
- スライドサムネイル一覧
- スピーカーノート表示
