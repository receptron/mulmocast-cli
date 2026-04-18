---
name: replicate-api-check
description: Replicate モデルの API パラメータを調査する。新しいモデルの追加、パラメータ確認、モデル間の機能比較時に使用。
user-invocable: false
---

# Replicate API パラメータ調査

Replicate モデルの入力パラメータスキーマを API から直接取得する方法。

## 前提

- `.env` に `REPLICATE_API_TOKEN` が設定されていること
- コマンド実行前に `source .env` が必要
- `python3` が利用可能であること（JSON 整形に使用）

## 全パラメータの取得

```bash
source .env; : "${REPLICATE_API_TOKEN:?REPLICATE_API_TOKEN is not set}"; curl -s -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
  "https://api.replicate.com/v1/models/{owner}/{model}" | python3 -c "
import sys,json
data=json.load(sys.stdin)
v=data.get('latest_version',{})
schema=v.get('openapi_schema',{}).get('components',{}).get('schemas',{}).get('Input',{})
required = schema.get('required', [])
props = schema.get('properties',{})
print('Required:', required)
print()
for k,v2 in sorted(props.items()):
    print(f'{k}: {json.dumps(v2, indent=2)}')
"
```

## 特定パラメータの有無を複数モデルで一括チェック

```bash
source .env; : "${REPLICATE_API_TOKEN:?REPLICATE_API_TOKEN is not set}"; for model in \
  "kwaivgi/kling-v3-video" \
  "google/veo-3.1" \
  "bytedance/seedance-2.0"; do
  echo "=== $model ==="
  curl -s -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
    "https://api.replicate.com/v1/models/$model" | python3 -c "
import sys,json
data=json.load(sys.stdin)
v=data.get('latest_version',{})
schema=v.get('openapi_schema',{}).get('components',{}).get('schemas',{}).get('Input',{}).get('properties',{})
# キーワードでフィルタ（例: audio 関連）
matches = {k:v2 for k,v2 in schema.items() if 'audio' in k.lower()}
if matches:
    for k,v2 in matches.items():
        print(f'  {k}: type={v2.get(\"type\",\"?\")}, default={v2.get(\"default\",\"?\")}, desc={v2.get(\"description\",\"?\")}')
else:
    print('  (no match)')
"
done
```

## Tips

- `provider2agent.ts` のモデルリストから全モデルを取得してループすると漏れがない
- フィルタキーワードを変えれば任意のパラメータを調査可能（例: `'prompt'`, `'image'`, `'duration'`）
- API レスポンスの `latest_version.openapi_schema` にスキーマ全体が含まれる
- `nullable: true` のパラメータはオプショナル
