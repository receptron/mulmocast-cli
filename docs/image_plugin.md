# Image Plugin

beatのimage プロパティがセットされているとImage Pluginによって画像が生成される

例:
```json
{
  "type": "image",
  "source": {
    "kind": "url",
    "url": "https://raw.githubusercontent.com/receptron/mulmocast-cli/refs/heads/main/assets/images/mulmocast_credit.png"
  }
}
```

pluginの実装は[src/utils/image_plugins/](../src/utils/image_plugins)にある。
pluginを追加する場合は、

- このdirにPluginのソースを追加
- このdirの[index.ts](../src/utils/image_plugins/index.ts)のimagePluginsに追加
- [src/types/schema.ts](../src/types/schema.ts)のmulmoImageAssetSchemaに追加


# Image Pluginの実装

Image Pluginは、

```
{
 imageType: string;
 process: async (params: ImageProcessorParams): void;
 path: (params: ImageProcessorParams): string;
}
```
のinterfaceを持つ。

### imageType

uniqなtype. beatのimage.type. 

### path
pathは、生成されるimageのpathを返す関数.
主に3種類のpathのうちのいずれかを返す。

- paramsでmulmocast共通のimagePathが渡されるので、それをそのまま使う([utils.ts](../src/utils/image_plugins/utils.ts)のparrotingImagePath関数)
- type = sourceかつlocalのファイルを参照するときに、その参照するlocalのimageのpathをそのまま返す([source.ts](../src/utils/image_plugins/source.ts)のprocessSource関数)
- pathを返さない( undefinedを返す) そのbeatがデータを持たない特殊なケース。beatのreference, voice over。

### process

- 実際の画像を生成する関数
- paramsを受け取って画像を生成する。
- return でimagePathを返しているが、現在は使ってない。（ので、型的にはvoid)
