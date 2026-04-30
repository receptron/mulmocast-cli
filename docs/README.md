# MulmoCast Documentation Index

このディレクトリには、MulmoCastの開発者向けドキュメントが含まれています。

This directory contains developer documentation for MulmoCast.

## 📚 主要ドキュメント / Main Documentation

### Getting Started

- [**Workflow**](./Workflow.md) - MulmoCastの処理フロー（Mermaid図） / MulmoCast processing flow (Mermaid diagram)
- [**Beta Release Notes (EN)**](./beta1_en.md) - Beta版リリースノート（英語） / Beta release notes (English)
- [**Beta Release Notes (JA)**](./beta1_ja.md) - Beta版リリースノート（日本語） / Beta release notes (Japanese)

### FAQ

- [**FAQ (EN)**](./faq_en.md) - よくある質問（英語） / Frequently Asked Questions (English)
- [**FAQ (JA)**](./faq_ja.md) - よくある質問（日本語） / Frequently Asked Questions (Japanese)

## 🔧 開発ガイド / Development Guide

### 機能拡張 / Feature Extensions

- [**TTS Provider 追加手順**](./tts.md) - 新しいTTSプロバイダーを追加する方法 / How to add a new TTS provider

### セットアップ / Setup

- [**Google Prerequisites**](./pre-requisites-google.md) - Google画像生成モデルの事前設定 / Prerequisites for Google image generation models
- [**NPM Development**](./npm_dev.md) - NPMバージョンアップのテスト手順 / NPM version upgrade testing procedure

### Google AI: Gemini API vs Vertex AI

MulmoCast は Google の生成AI機能（画像・動画・TTS）を **Gemini API** と **Vertex AI** の2つの方式で利用できます。用途に応じて使い分けてください。

MulmoCast supports Google's generative AI (image, video, TTS) via two backends — **Gemini API** and **Vertex AI**. Choose based on your use case.

| 観点 / Aspect | Gemini API | Vertex AI |
|---|---|---|
| 認証 / Auth | API キー (`GEMINI_API_KEY`) | ADC (`gcloud auth application-default login`) |
| 用途 / Use case | 個人開発・プロトタイピング / Personal & prototyping | エンタープライズ・本番 / Enterprise & production |
| 料金 / Billing | 従量課金 / Pay-as-you-go | Google Cloud 請求 / GCP billing |
| SLA | なし / None | あり / Yes |
| モデル / Models | 一部制限あり / Some restrictions | 全モデル利用可能 / All models available |

`imageParams` / `movieParams` に `vertexai_project` を指定すると Vertex AI モードで動作します。詳細は以下を参照:

Set `vertexai_project` in `imageParams` / `movieParams` to switch to Vertex AI mode. See:

- [**Vertex AI Setup (EN)**](./vertexai_en.md) - Vertex AI セットアップガイド（英語） / Vertex AI setup guide (English)
- [**Vertex AI Setup (JA)**](./vertexai_ja.md) - Vertex AI セットアップガイド（日本語） / Vertex AI setup guide (Japanese)

## 📖 機能仕様 / Feature Specifications

### コア機能 / Core Features

- [**Features**](./feature.md) - MulmoCastの全機能一覧（特殊機能を中心に） / Complete feature list (focusing on advanced features)

### 画像・動画・音声 / Image, Video, and Audio

- [**Image Generation Rules**](./image.md) - 画像・動画・音声の生成ルール / Rules for generating images, videos, and audio
- [**Image Plugin**](./image_plugin.md) - Image Pluginの仕様 / Image Plugin specifications
- [**Sound and Voice**](./sound_and_voice.md) - 複数のBeatで一つの音声をシェアする方法（音声スピルオーバー） / Sharing audio across multiple beats (audio spillover)

### 日本語ドキュメント / Japanese Documentation

- [**Image Preprocess Agent (JA)**](./ja/imagePreprocessAgent.md) - imagePreprocessAgentの仕様書（日本語） / imagePreprocessAgent specifications (Japanese)

---

## 📌 ナビゲーション / Navigation

- [メインREADME](../README.md) に戻る / Back to main README
- [サンプルスクリプト](../scripts/) を見る / View sample scripts
- [ソースコード](../src/) を見る / View source code
