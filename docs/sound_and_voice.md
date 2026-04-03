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

## 言語別スピーカー設定

MulmoCastは、同じスピーカーでも言語によって異なる音声設定を使用できる「言語別スピーカー」機能をサポートしています。これにより、多言語コンテンツの作成時に、各言語に最適な音声プロバイダーや音声を選択できます。

**サンプルファイル**: [`scripts/test/test_lang.json`](https://github.com/receptron/mulmocast-cli/blob/main/scripts/test/test_lang.json)

### 基本的な使い方

スピーカー定義の中に`lang`プロパティを追加し、言語コードごとに異なる音声設定を指定します：

```json
{
  "speechParams": {
    "speakers": {
      "Presenter": {
        "provider": "openai",
        "voiceId": "shimmer",
        "lang": {
          "ja": {
            "provider": "gemini",
            "voiceId": "Kore"
          }
        }
      }
    }
  }
}
```

### 動作の仕組み

1. **デフォルト設定**: `provider`と`voiceId`で指定された設定がデフォルトとして使用されます
2. **言語別上書き**: スクリプトの`lang`プロパティと一致する言語設定があれば、それが優先されます
3. **フォールバック**: 該当する言語設定がない場合は、デフォルト設定が使用されます

## 音声ミキシング制御

Veo 3.0/3.1 など音声付き動画を使用する場合、TTS（ナレーション）とmovie音声のバランスを調整できます。

### パラメータ一覧

`audioParams` に以下のオプションを指定します：

| パラメータ | 型 | 範囲 | デフォルト | 説明 |
|---|---|---|---|---|
| `movieVolume` | number | 0〜1 | 1.0 | 全beatのmovie音声ボリューム |
| `ttsVolume` | number | 0〜2 | 1.0 | TTS音量係数（BGM/movieとの混合前に適用） |
| `ducking` | object | — | 未設定(無効) | TTS再生中にmovie音量を自動低減 |
| `ducking.ratio` | number | 0〜1 | 0.3 | ducking時のmovie音量倍率 |

すべてoptional。**未指定の場合は従来の動作と完全に同じです。**

### beat単位の上書き

`beat.audioParams.movieVolume` で個別のbeatのmovie音量を上書きできます：

| パラメータ | 型 | 範囲 | 説明 |
|---|---|---|---|
| `movieVolume` | number | 0〜1 | そのbeatのmovie音声ボリューム |

### よくある使い方

#### movie音声を控えめにする（最もシンプル）

```json
{
  "audioParams": {
    "movieVolume": 0.3
  }
}
```

movie音声が全beatで30%に。ナレーションが聞きやすくなります。

#### ナレーション中だけmovie音声を下げる（ducking）

```json
{
  "audioParams": {
    "ducking": {}
  }
}
```

- ナレーションありのbeat: movie音声が30%に自動低減（`ratio`デフォルト 0.3）
- ナレーションなしのbeat: movie音声はそのまま

ratioを変更する場合:

```json
{
  "audioParams": {
    "ducking": { "ratio": 0.5 }
  }
}
```

#### movieVolume + ducking の組み合わせ

```json
{
  "audioParams": {
    "movieVolume": 0.5,
    "ducking": { "ratio": 0.3 }
  }
}
```

- ナレーションなしのbeat: movie音声 50%
- ナレーションありのbeat: movie音声 50% × 0.3 = 15%

#### beat単位で音量を変える

```json
{
  "audioParams": {
    "movieVolume": 0.5
  },
  "beats": [
    {
      "text": "このbeatはmovie音声を消す",
      "audioParams": { "movieVolume": 0.0 }
    },
    {
      "text": "このbeatはデフォルト（0.5）",
      "moviePrompt": "..."
    },
    {
      "text": "このbeatはmovie音声を最大に",
      "audioParams": { "movieVolume": 1.0 }
    }
  ]
}
```

### 動作モード（legacy / explicit）

| 条件 | モード | 動作 |
|---|---|---|
| 新パラメータ未指定 | legacy | 従来通り（`amix normalize=1`） |
| いずれかの新パラメータを指定 | explicit | `amix normalize=0` + `alimiter` |

- **legacy**: FFmpegの `amix` が入力数に応じて自動で音量を調整。movie beatが多いほどTTSが聞こえづらくなる場合がある
- **explicit**: 指定した音量値がそのまま適用され、`alimiter` でクリッピングを防止。意図通りの音量バランスが得られる

:::message
既存のスクリプト（新パラメータ未使用）は常にlegacyモードで動作するため、挙動は変わりません。
:::

### テスト用スクリプト

- `scripts/test/test_audio_mix.json` — 基本的なmovieVolume指定
- `scripts/test/test_audio_mix_ducking.json` — ducking動作確認
- `scripts/test/test_audio_mix_beat_vol.json` — beat単位の音量上書き
- `scripts/test/test_audio_mix_legacy.json` — legacy互換確認