# remotion ビートに出来上がったコンポーネント（`code`）を渡す — #1599

## 目的

`remotion` ビートが `prompt` の代わりに `.tsx` を受け取り、`claude -p` を呼ばずに描画だけをする。
ホストのエージェント（MulmoTerminal / MulmoClaude のセルにいる Claude Code や Codex）が、会話の中で場面を書けるようにする。

## スキーマ

```json
"image": { "type": "remotion", "code": { "kind": "path", "path": "scenes/intro.tsx" }, "fps": 30 }
"image": { "type": "remotion", "code": { "kind": "text", "text": "import ...; export default ..." } }
```

- `code` は `kind: "text" | "path"`（mermaid の `code` の部分集合）。`path` は台本のディレクトリから解決する。
- `prompt` と `code` はちょうど一方だけ。両方・どちらも無しはエラー。

## 描画

- `code` があるとき: パッケージの確認 → コードを読む → `Generated.tsx` に書いて描画。生成・修正・見た目の点検はしない。
- 長さは今と同じく音声（または `duration`）から。音声が無ければ最終フレームの PNG のみ。
- 失敗したら、コードの場所（ファイルのパス、または何番目のビートのインライン）を含むエラーで止まる。

## 公開する入口 `mulmocast/remotion`

- `REMOTION_COMPONENT_GUIDE`: ホストのエージェント向けの書き方の約束。システムプロンプトから「返答の形式」を除いたもの。
- `REMOTION_SYSTEM_PROMPT` はバイト単位で変えない（キャッシュのハッシュに入っているため、変えると全利用者の生成済み場面が作り直しになる）。
- `REMOTION_PACKAGES` / `REMOTION_RENDER_PACKAGES` / `REMOTION_SCENE_PACKAGES`、`remotionInstallCommand`、
  `missingInstalledRemotionPackages()`（mulmocast から見て入っていないパッケージ）、`ensureRemotionPackages()`。

## 範囲外

- 決まった割合のコマだけを描いて返す機能（issue の「あるとよいもの」）は別に分ける。
