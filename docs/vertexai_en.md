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

## Available Models

### Image Generation

| Model | Description |
|-------|-------------|
| `imagen-4.0-generate-001` | Imagen 4 Standard |
| `imagen-4.0-ultra-generate-001` | Imagen 4 High Quality |
| `imagen-4.0-fast-generate-001` | Imagen 4 Fast |
| `gemini-2.5-flash-image` | Gemini-based image generation |
| `gemini-3-pro-image-preview` | Gemini 3 Pro image generation |

### Video Generation

| Model | Description |
|-------|-------------|
| `veo-2.0-generate-001` | Veo 2.0 |
| `veo-3.0-generate-001` | Veo 3.0 |
| `veo-3.1-generate-preview` | Veo 3.1 Preview |

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

## References

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Imagen API Reference](https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview)
- [Veo API Reference](https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview)
- [Setting up ADC](https://cloud.google.com/docs/authentication/provide-credentials-adc)
