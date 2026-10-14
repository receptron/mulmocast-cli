# avatarscript の peer の範囲を、試している版に揃える

#1650

## 問題

#1648 で `avatarscript` の devDependencies は `^0.5.0` になったが、peerDependencies は `^0.4.0` のまま。0.x の `^0.4.0` は 0.5 を含まないので、`npm install mulmocast avatarscript onnxruntime-node` すると npm は avatarscript 0.4.1 を入れる（空のディレクトリで実際に確認）。cli が試していない版で動く。

## 直し方

- `peerDependencies.avatarscript` を `^0.5.0` に（1 行。lockfile は変わらない）
- テスト `test/release/test_peer_ranges.ts`: peer と dev の両方にあるパッケージは、dev の範囲（試している版）が peer の範囲（利用者に求める範囲）に入っていること
  - 依存を足さないため、使われている `^x.y.z` だけを npm の caret の規則で判定する（1.0.0 以降は major、0.y は minor、0.0.z は patch が固定）。それ以外の形は「手で比べて」と報告して落とす
  - peer がより緩い下限であるのは正しい（remotion・react など 16 組はこれ）。dev が peer の外にあるときだけ落とす

## 検証

- 修正前の main でテストが赤、報告されるのは avatarscript だけ
- 修正後に緑
- 判定の単体テスト: 0.x の minor の境界、1.x 以降の major の境界、下限、読まない範囲の形、片側だけの依存
- 壊して確認: 0.x を 1.x と同じ扱いにする・下限を見ない・下限判定を常に真にする、のいずれでも赤
