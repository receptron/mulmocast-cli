# 複数のBeatで一つの音声をシェアする方法

## 概要

MulmoCastでは、一つの音声（ナレーション）を複数のBeatにまたがって再生する「音声スピルオーバー」機能をサポートしています。この機能は、ミュージックビデオの作成や、長いナレーションを複数のスライドで表示する際に便利です。

**サンプルファイル**: [`scripts/test/test_spillover.json`](https://github.com/receptron/mulmocast-cli/blob/main/scripts/test/test_spillover.json) 

## 基本的な仕組み

音声スピルオーバーは以下のルールで動作します：

1. **音声があるBeat**: `text`プロパティを持つBeatで音声が開始されます
2. **音声がないBeat**: `text`プロパティがないBeatでは、前のBeatの音声が継続して再生されます
3. **duration設定**: 各Beatの表示時間を`duration`で指定できます

## duration自動配分機能

複数のBeatで音声を共有する際、durationの指定がより柔軟になりました：

- **durationが指定されていないBeat**: 残りの音声時間を均等に配分
- **一部のBeatにdurationが指定されている場合**: 指定されたdurationを優先し、残りを均等配分
- **最小保証時間**: 均等配分時も各Beatに最低1秒は割り当て

## 使用例（test_spillover.jsonからの抜粋）

### 基本的なスピルオーバー（Beat 1-2）

```json
{
  "beats": [
    {
      "text": "This beat has a long audio, which exceeds the beat duration.",
      "duration": 2,
      "image": {
        "type": "textSlide",
        "slide": {
          "title": "1. Has Text. Duration = 2."
        }
      }
    },
    {
      "image": {
        "type": "textSlide",
        "slide": {
          "title": "2. Default duration = 1. Expected spillover."
        }
      }
    }
  ]
}
```

### 複数のスピルオーバー（Beat 3-5）

複数のBeatでそれぞれdurationを指定して、音声の継続時間を制御できます。

```json
{
  "beats": [
    {
      "text": "This beat has a really long audio, which clearly exceeds the beat duration.",
      "duration": 1,
      "image": {
        "type": "textSlide",
        "slide": {
          "title": "3. Has Text. Duration = 1."
        }
      }
    },
    {
      "duration": 2,
      "image": {
        "type": "textSlide",
        "slide": {
          "title": "4. Duration = 2. Expected spillover."
        }
      }
    },
    {
      "duration": 1,
      "image": {
        "type": "textSlide",
        "slide": {
          "title": "5. Duration = 1, Expected spillover."
        }
      }
    }
  ]
}
```

### 自動duration配分（Beat 6-8）

音声を持つBeatとそれに続くdurationが指定されていないBeatがある場合、音声の全体時間がそれらのBeatに均等に配分されます。

```json
{
  "beats": [
    {
      "text": "This beat has a really long audio, which is shared among three beats.",
      "image": {
        "type": "textSlide",
        "slide": {
          "title": "6. Has Text. No duration."
        }
      }
    },
    {
      "image": {
        "type": "textSlide",
        "slide": {
          "title": "7. No duration. Expected even-split spillover."
        }
      }
    },
    {
      "image": {
        "type": "textSlide",
        "slide": {
          "title": "8. No duration. Expected even-split spillover."
        }
      }
    }
  ]
}
```




