# @mulmocast/types の公開漏れを防ぐ

#1638

## 何が起きたか

2.21.0 で `@mulmocast/deck` を 2.1.0 に上げたが、`src/types/` が無変更だったので `@mulmocast/types` を公開しなかった。types の `.d.ts` はビルド時点の deck の型を展開して持つので、公開済みの types には `figure` が無く、mulmocast 2.21.0 の `MulmoStudioContext` を types の型に代入すると TS2322 になった（#1637 で types 2.21.0 を出し直して解消）。

## 直し方

1. `CLAUDE.md` の公開手順: 「`src/types/` が変わったとき」に加えて「`types/` の実行時依存（`@mulmocast/deck`、`zod`）を上げたとき」も types を公開する。理由と、どのテストが止めるかを書く
2. テスト `test/release/test_types_package_deps.ts`（`yarn ci_test` で CI に乗る）: `types/package.json` の `dependencies` のうち root も持つものは、範囲が一致していること
   - 比べるのは types の `dependencies` だけ。peer は利用者に求める下限で緩くてよく（`graphai` / `yargs`）、dev は公開物に入らない（`@types/node`）
   - 判定は純粋関数 `sharedDependencyMismatches`（`test/release/shared_dependencies.ts`）

## 範囲外

- npm への公開そのものの忘れはテストでは防げない。そこは 1 の手順が受け持つ

## 検証

- 現在の main で緑
- `types/package.json` を 2.21.0 当時の形（deck `^2.0.0`）に戻すと赤。zod `^4.4.3` に戻しても赤
- 純粋関数の単体テスト: 片側だけ上がった範囲を両方の範囲つきで報告、片側だけの依存は比べない、root 側はどの欄でもよい、types の peer / dev は比べない、壊れた package.json は依存なし扱い
