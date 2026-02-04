# Google Vertex AI Setup Guide

A setup guide for using Google Vertex AI for image and video generation in MulmoCast.

## Overview

MulmoCast supports two methods for accessing Google's generative AI capabilities:

| Method | Authentication | Use Case |
|--------|---------------|----------|
| Gemini API | API Key (`GEMINI_API_KEY`) | Personal development, prototyping |
| Vertex AI | ADC (Application Default Credentials) | Enterprise, production environments |

Some models (e.g., Imagen 4) may only be available through Vertex AI.

## Prerequisites

- Google Cloud project
- Google Cloud CLI (`gcloud`) installed
- Appropriate IAM permissions

```bash
# Install gcloud CLI (macOS)
brew install google-cloud-sdk

# Login
gcloud auth login
```

## Setup

### 1. Project Configuration

```bash
# List your projects
gcloud projects list

# Set default project
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable APIs

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Enable Generative AI API
gcloud services enable generativelanguage.googleapis.com
```

### 3. Configure Application Default Credentials (ADC)

```bash
# Set up ADC (opens browser)
gcloud auth application-default login

# Verify configuration
gcloud auth application-default print-access-token
```

## Usage in MulmoCast

### MulmoScript Configuration

Add `vertexai_project` to `imageParams` or `movieParams`:

```json
{
  "title": "My Presentation",
  "imageParams": {
    "provider": "google",
    "model": "imagen-4.0-generate-001",
    "vertexai_project": "your-project-id",
    "vertexai_location": "us-central1"
  },
  "beats": [
    {
      "text": "Hello, world!",
      "imagePrompt": "A beautiful sunset over the ocean"
    }
  ]
}
```

### Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `vertexai_project` | Google Cloud Project ID | None (enables Vertex AI mode when set) |
| `vertexai_location` | Region | `us-central1` |

### Video Generation Configuration

```json
{
  "movieParams": {
    "provider": "google",
    "model": "veo-2.0-generate-001",
    "vertexai_project": "your-project-id",
    "vertexai_location": "us-central1"
  }
}
```

### TTS (Text-to-Speech) Configuration

You can use Google Cloud TTS or Gemini TTS via Vertex AI. TTS is authenticated via ADC and does not require `vertexai_project`. See the [test script](../scripts/test/test_vertexai.json) for configuration examples.


### Beat-Level Overrides

When changing the model for individual beats, you also need to specify `vertexai_project` and `vertexai_location`:

```json
{
  "beats": [
    {
      "text": "Generating a high-quality image",
      "imagePrompt": "A woman walking through Tokyo at night",
      "imageParams": {
        "model": "imagen-4.0-ultra-generate-001",
        "vertexai_project": "your-project-id",
        "vertexai_location": "us-central1"
      }
    },
    {
      "text": "Generating a video",
      "moviePrompt": "Ocean waves crashing on a beach",
      "movieParams": {
        "model": "veo-3.0-generate-001",
        "vertexai_project": "your-project-id",
        "vertexai_location": "us-central1"
      }
    }
  ]
}
```

## Available Models

### Image Generation

| Model | Description |
|-------|-------------|
| `imagen-4.0-generate-001` | Imagen 4 Standard |
| `imagen-4.0-ultra-generate-001` | Imagen 4 High Quality |
| `imagen-4.0-fast-generate-001` | Imagen 4 Fast |
| `gemini-2.5-flash-image` | Gemini-based image generation |
| `gemini-3-pro-image-preview` | Gemini 3 Pro image generation |

**Note**:
- Gemini image models may not be available in all regions
- `gemini-3-pro-image-preview` is available in `global` (see [reference](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image) as of 2026-02-04)

### Video Generation

| Model | Description |
|-------|-------------|
| `veo-2.0-generate-001` | Veo 2.0 |
| `veo-3.0-generate-001` | Veo 3.0 |
| `veo-3.1-generate-preview` | Veo 3.1 Preview |

### TTS (Text-to-Speech)

| Provider | Model/voiceId | Description |
|----------|---------------|-------------|
| Google Cloud TTS | `en-US-Studio-O` | English (US) Studio voice |
| Google Cloud TTS | `ja-JP-Standard-A` | Japanese Standard voice |
| Gemini TTS | `gemini-2.5-pro-tts` | Gemini-based TTS |

**Note**: Refer to each service's documentation for available voiceIds.

## Regions

Vertex AI is available in the following regions:

- `us-central1` (recommended)
- `us-east1`
- `us-west1`
- `europe-west1`
- `asia-northeast1` (Tokyo)

## Differences from Gemini API

| Aspect | Gemini API | Vertex AI |
|--------|-----------|-----------|
| Authentication | API Key | ADC / Service Account |
| Billing | Pay-as-you-go | Google Cloud billing |
| Quotas | API level | Project level |
| SLA | None | Available |
| Models | Some restrictions | All models available |

## Troubleshooting

### Authentication Error

```
Error: Could not load the default credentials
```

ADC is not configured. Run the following:

```bash
gcloud auth application-default login
```

### Permission Error

```
Error: Permission denied
```

Check your IAM permissions:

```bash
# Grant Vertex AI user permission
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:YOUR_EMAIL" \
  --role="roles/aiplatform.user"
```

### Region Error

Some models may not be available in the specified region. Try `us-central1`.

### vertexai_project Not Set Error

```
Error: Google GenAI API key is required (GEMINI_API_KEY)
```

**Cause**: Without `vertexai_project` set, the system attempts to generate via the Gemini API. This error occurs when the Gemini API is also not configured.

**Solution**: Verify that `vertexai_project` is correctly set.

### Model Not Found Error

```
Error: Publisher Model was not found
```

**Cause**: The specified model is not available on Vertex AI, or the region is not supported.

**Solution**: Verify the model name, or change `vertexai_location` to a region where the model is available.

## References

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Imagen API Reference](https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview)
- [Veo API Reference](https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview)
- [Setting up ADC](https://cloud.google.com/docs/authentication/provide-credentials-adc)
- [Test Script](../scripts/test/test_vertexai.json) - Replace `YOUR_PROJECT_ID` to use
