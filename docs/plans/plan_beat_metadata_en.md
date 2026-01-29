# MulmoScript Metadata Extension Plan

## Overview

Enable generating multiple variations (full version, summary, teaser, etc.) from a single MulmoScript.

## Problem

Simple filtering causes narrative discontinuity:
- beat 1: "First, let me explain the background"
- beat 2: (detailed background explanation) ← filtered out
- beat 3: "Next, let's move to the main topic"

→ Says "let me explain the background" but no explanation follows - unnatural flow.

## Solution: Variant (Replacement) Approach

Define replacement text for each beat per profile.

## 1. Type Definitions

### 1.1 Beat Variant Schema

```typescript
// Add to src/types/schema.ts

// Fields that can be overridden in variants
export const beatVariantSchema = z.object({
  // Text replacement
  text: z.string().optional(),

  // Skip this beat for this profile
  skip: z.boolean().optional(),

  // Image can also be replaced
  image: mulmoImageAssetSchema.optional(),
  imagePrompt: z.string().optional(),

  // Speech options override
  speechOptions: speechOptionsSchema.optional(),
}).strict();

// Variant dictionary (profile name → override content)
export const beatVariantsSchema = z.record(z.string(), beatVariantSchema);
```

### 1.2 Beat Metadata Schema (for Q&A and Classification)

```typescript
// Reference information (multiple per beat)
export const beatReferenceSchema = z.object({
  // Reference type
  type: z.enum(["web", "pdf", "paper", "book", "video", "image", "code"]),

  // URL or path
  url: z.string().optional(),
  path: z.string().optional(),

  // Title and description
  title: z.string().optional(),
  description: z.string().optional(),

  // Reference location (page number, section name, etc.)
  location: z.string().optional(),
}).strict();

export const beatMetaSchema = z.object({
  // === Classification ===
  tags: z.array(z.string()).optional(),
  section: z.string().optional(),

  // === Q&A Context ===
  // Detailed description of this beat (for image beats where text alone doesn't convey content)
  context: z.string().optional(),

  // Keywords (for search and matching)
  keywords: z.array(z.string()).optional(),

  // Expected questions (can be used like FAQ)
  expectedQuestions: z.array(z.string()).optional(),

  // === References ===
  references: z.array(beatReferenceSchema).optional(),

  // === Related ===
  relatedBeats: z.array(z.string()).optional(),

  // === Extension ===
  custom: z.record(z.string(), z.any()).optional(),
}).strict();
```

### 1.3 Script-Level Metadata Schema (for Overall Q&A)

```typescript
// Metadata for the entire script
export const scriptMetaSchema = z.object({
  // === Basic Information ===
  // Target audience
  audience: z.string().optional(),

  // Prerequisites
  prerequisites: z.array(z.string()).optional(),

  // Learning objectives/goals
  goals: z.array(z.string()).optional(),

  // === Q&A Context ===
  // Background/context for the entire presentation
  background: z.string().optional(),

  // Frequently asked questions and answers
  faq: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    relatedBeats: z.array(z.string()).optional(),
  })).optional(),

  // Keywords (for overall search)
  keywords: z.array(z.string()).optional(),

  // === References (for entire script) ===
  references: z.array(beatReferenceSchema).optional(),

  // === Creation Information ===
  author: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.string().optional(),

  // === Extension ===
  custom: z.record(z.string(), z.any()).optional(),
}).strict();
```

### 1.4 Extended mulmoBeatSchema

```typescript
export const mulmoBeatSchema = z.object({
  // ... existing fields ...

  // Variants (per-profile replacements)
  variants: beatVariantsSchema.optional(),

  // Metadata (for classification and queries)
  meta: beatMetaSchema.optional(),
}).strict();
```

### 1.5 Output Profile Schema

```typescript
export const outputProfileSchema = z.object({
  name: z.string(),
  description: z.string().optional(),

  // Profile-specific override settings
  overrides: z.object({
    audioParams: audioParamsSchema.partial().optional(),
    movieParams: mulmoMovieParamsSchema.partial().optional(),
    canvasSize: mulmoCanvasDimensionSchema.optional(),
  }).optional(),
}).strict();
```

### 1.6 Extended mulmoScriptSchema

```typescript
export const mulmoScriptSchema = mulmoPresentationStyleSchema.extend({
  // ... existing fields ...

  // Script-level metadata (for Q&A)
  scriptMeta: scriptMetaSchema.optional(),

  // Output profile definitions
  outputProfiles: z.record(z.string(), outputProfileSchema).optional(),
});
```

## 2. Examples

### 2.1 MulmoScript with Metadata

```json
{
  "$mulmocast": { "version": "2.0" },
  "title": "Introduction to GraphAI",
  "description": "From basic concepts to practical usage of GraphAI",
  "lang": "en",

  "scriptMeta": {
    "audience": "AI application developers, engineers",
    "prerequisites": ["Basic JavaScript/TypeScript knowledge", "Basic understanding of LLM APIs"],
    "goals": [
      "Understand basic concepts of GraphAI",
      "Understand the relationship between agents and graph structure",
      "Be able to build simple workflows"
    ],
    "background": "With the increasing development of LLM-powered applications, there is growing demand for frameworks to efficiently build complex workflows. GraphAI was developed as a solution to this challenge.",
    "keywords": ["GraphAI", "agent", "workflow", "LLM", "AI development"],
    "faq": [
      {
        "question": "Is GraphAI free to use?",
        "answer": "Yes, GraphAI is open source and available for free under the MIT license.",
        "relatedBeats": ["intro"]
      },
      {
        "question": "Which LLM providers are supported?",
        "answer": "Major providers including OpenAI, Anthropic, Google Gemini, and local LLMs are supported.",
        "relatedBeats": ["what-is-agent"]
      }
    ],
    "references": [
      {
        "type": "web",
        "url": "https://github.com/receptron/graphai",
        "title": "GraphAI GitHub Repository",
        "description": "Official repository with source code and documentation"
      },
      {
        "type": "web",
        "url": "https://graphai.dev",
        "title": "GraphAI Official Documentation"
      }
    ],
    "author": "GraphAI Team",
    "version": "1.0"
  },

  "outputProfiles": {
    "summary": {
      "name": "3-minute summary",
      "description": "Condensed version with key points only"
    },
    "teaser": {
      "name": "30-second teaser",
      "description": "Short intro video for social media",
      "overrides": {
        "audioParams": { "padding": 0.2 }
      }
    }
  },

  "beats": [
    {
      "id": "intro",
      "text": "Today, I'll walk you through GraphAI, from basic concepts to practical usage.",
      "variants": {
        "summary": { "text": "Let me give you an overview of GraphAI." },
        "teaser": { "text": "Introducing GraphAI." }
      },
      "meta": {
        "tags": ["intro"],
        "section": "opening",
        "keywords": ["GraphAI", "overview", "introduction"]
      }
    },
    {
      "id": "history",
      "text": "GraphAI development started in 2023. Initially a simple workflow engine, it has gradually expanded and now supports building multi-agent systems.",
      "variants": {
        "summary": { "text": "GraphAI started in 2023 and now supports multi-agent systems." },
        "teaser": { "skip": true }
      },
      "meta": {
        "tags": ["history", "background"],
        "section": "chapter1",
        "keywords": ["2023", "development", "multi-agent"],
        "expectedQuestions": ["When was GraphAI created?", "What's the development history?"]
      }
    },
    {
      "id": "what-is-agent",
      "text": "An agent is an independent component that executes a specific task.",
      "image": { "type": "image", "source": { "kind": "path", "path": "agent-diagram.png" } },
      "variants": {
        "summary": { "text": "An agent is a component that executes specific tasks." },
        "teaser": { "skip": true }
      },
      "meta": {
        "tags": ["concept", "agent"],
        "section": "chapter1",
        "context": "This diagram shows the internal structure of an agent. The left side is input, the center is processing logic (LLM calls, data transformation, etc.), and the right side is output. Agents are stateless and return the same output for the same input.",
        "keywords": ["agent", "component", "input", "output", "processing"],
        "expectedQuestions": ["What is an agent?", "What is the role of an agent?"],
        "references": [
          {
            "type": "web",
            "url": "https://graphai.dev/docs/agents",
            "title": "Agent Detailed Documentation"
          },
          {
            "type": "code",
            "url": "https://github.com/receptron/graphai/tree/main/agents",
            "title": "Agent Implementation Examples"
          }
        ]
      }
    },
    {
      "id": "graph-structure",
      "text": "GraphAI's key feature is the ability to connect multiple agents in a graph structure.",
      "image": { "type": "image", "source": { "kind": "path", "path": "graph-diagram.png" } },
      "variants": {
        "teaser": { "text": "Connect agents in a graph structure to easily design complex processing." }
      },
      "meta": {
        "tags": ["concept", "graph"],
        "section": "chapter2",
        "context": "This diagram shows an example GraphAI workflow. It illustrates the flow from user input node through LLM agent and data processing agent to final output. Arrows between nodes represent data flow, and parallel execution is also possible.",
        "keywords": ["graph", "node", "edge", "workflow", "parallel execution"],
        "expectedQuestions": ["What is graph structure?", "How do you connect agents?"],
        "references": [
          {
            "type": "web",
            "url": "https://graphai.dev/docs/graph",
            "title": "Graph Structure Documentation"
          }
        ],
        "relatedBeats": ["what-is-agent"]
      }
    },
    {
      "id": "demo",
      "text": "Let me show you a demo using GraphAI.",
      "image": { "type": "image", "source": { "kind": "path", "path": "code-example.png" } },
      "variants": {
        "summary": { "text": "Let's look at an actual code example." },
        "teaser": { "skip": true }
      },
      "meta": {
        "tags": ["demo", "example", "code"],
        "section": "chapter3",
        "context": "This code shows basic GraphAI usage. Define nodes and edges in a graphData object and execute with GraphAI.run(). This example receives user input, processes it with an LLM, and returns the result - a simple flow.",
        "keywords": ["code", "implementation", "graphData", "run"],
        "references": [
          {
            "type": "code",
            "url": "https://github.com/receptron/graphai/blob/main/examples/basic.ts",
            "title": "Sample Code (GitHub)"
          },
          {
            "type": "web",
            "url": "https://graphai.dev/docs/quickstart",
            "title": "Quickstart Guide"
          }
        ]
      }
    },
    {
      "id": "conclusion",
      "text": "That's an overview of GraphAI. Build complex AI workflows declaratively with GraphAI - give it a try!",
      "variants": {
        "summary": { "text": "Build complex AI workflows easily with GraphAI. Give it a try!" },
        "teaser": { "text": "Try GraphAI today!" }
      },
      "meta": {
        "tags": ["conclusion"],
        "section": "closing",
        "keywords": ["summary", "declarative", "workflow"],
        "references": [
          {
            "type": "web",
            "url": "https://github.com/receptron/graphai",
            "title": "GraphAI GitHub (Stars welcome!)"
          }
        ]
      }
    }
  ]
}
```

### 2.2 Generated Output Comparison

**Full version (no profile specified): 6 beats**
```
1. Today, I'll walk you through GraphAI, from basic concepts to practical usage.
2. GraphAI development started in 2023. Initially a simple...(long explanation)
3. An agent is an independent component that...(detailed explanation)
4. GraphAI's key feature is the ability to connect...(detailed explanation)
5. Let me show you a demo using GraphAI...(demo explanation)
6. That's an overview of GraphAI. Build complex AI workflows...
```

**Summary version (--profile summary): 6 beats (text replaced)**
```
1. Let me give you an overview of GraphAI.
2. GraphAI started in 2023 and now supports multi-agent systems.
3. An agent is a component that executes specific tasks.
4. GraphAI's key feature is the ability to connect...(unchanged)
5. Let's look at an actual code example.
6. Build complex AI workflows easily with GraphAI. Give it a try!
```

**Teaser version (--profile teaser): 3 beats (skip + replace)**
```
1. Introducing GraphAI.
2. (history: skip)
3. (what-is-agent: skip)
4. Connect agents in a graph structure to easily design complex processing.
5. (demo: skip)
6. Try GraphAI today!
```

### 2.3 CLI Usage Examples

```bash
# Full version
mulmo movie graphai.json

# Summary version
mulmo movie graphai.json --profile summary

# Teaser version
mulmo movie graphai.json --profile teaser

# List profiles
mulmo tool profiles graphai.json
# → summary: 3-minute summary
# → teaser: 30-second teaser

# Query (using metadata)
mulmo tool query graphai.json "What is an agent?"
# → Answers based on what-is-agent beat text

# Specific section only (filter by metadata)
mulmo movie graphai.json --section chapter1
# → history, what-is-agent only

# Filter by tags
mulmo movie graphai.json --tags concept
# → what-is-agent, graph-structure only
```

## 3. AI Features

### 3.1 Summarize (Auto-generate Summaries)

Automatically generate summary variants from the full script.

**CLI**
```bash
# Auto-generate summary variant for all beats
mulmo tool summarize script.json --profile summary

# With character limit
mulmo tool summarize script.json --profile summary --max-chars 50

# Specific beats only
mulmo tool summarize script.json --profile summary --beat history,demo

# Dry run (display only, don't save)
mulmo tool summarize script.json --profile summary --dry-run

# Overwrite existing variants
mulmo tool summarize script.json --profile summary --overwrite
```

**Processing Flow**
```
1. Load script
2. Send each beat's text to LLM
3. LLM generates summary text
4. Write to variants.[profile].text
5. Save script (or display only with --dry-run)
```

**LLM Prompt Example**
```
Please summarize the following part of the presentation.

Context:
- Title: {title}
- Overall flow: {beat_ids}
- Current beat: {current_beat_id}
- Previous beat summary: {prev_summary}
- Next beat content preview: {next_text_preview}

Text to summarize:
{text}

Constraints:
- Maximum {max_chars} characters
- Flow naturally with surrounding context
- Keep only key points
```

**Output Example**
```bash
$ mulmo tool summarize graphai.json --profile summary --max-chars 50

Summarizing beats for profile 'summary'...

[intro]
  Original (78 chars): Today, I'll walk you through GraphAI, from basic concepts to practical usage.
  Summary  (43 chars): Let me give you an overview of GraphAI.

[history]
  Original (142 chars): GraphAI development started in 2023. Initially...
  Summary  (56 chars): GraphAI started in 2023 and now supports multi-agent systems.

[what-is-agent]
  Original (65 chars): An agent is an independent component that executes a specific task.
  Summary  (52 chars): An agent is a component that executes specific tasks.

...

Done! Updated 6 beats with 'summary' variants.
Save changes? [Y/n]:
```

---

### 3.2 Query (Q&A)

Q&A functionality utilizing script-level metadata (scriptMeta) and beat metadata (meta).

**CLI**
```bash
# Basic question
mulmo tool query script.json "What is GraphAI?"

# Specify section
mulmo tool query script.json "What types of agents are there?" --section chapter1

# Specify tags
mulmo tool query script.json "Show me examples" --tags example,demo

# Verbose mode (show source beats + reference URLs)
mulmo tool query script.json "What are the features?" --verbose

# Fetch reference content for more detailed answers
mulmo tool query script.json "Tell me more" --fetch-references

# JSON output
mulmo tool query script.json "What's the conclusion?" --json
```

**Processing Flow**
```
1. Load script
2. Extract keywords from question
3. Identify beats via keyword matching + expectedQuestions matching
4. Prioritize scriptMeta.faq if there's a match
5. Send identified beat's text + context + references to LLM
6. LLM generates answer
7. Display answer (show sources with --verbose)
```

**LLM Prompt Example**
```
Please answer the question based on the following presentation materials.

=== Presentation Information ===
Title: {title}
Description: {description}
Target Audience: {scriptMeta.audience}
Background: {scriptMeta.background}

=== Related FAQ ===
{matched_faq}

=== Related Content ===
{beats_with_full_metadata}

=== Question ===
{question}

=== Answer Constraints ===
- Answer based on information in the materials
- For image beats, utilize the context description
- If no relevant information exists, respond "Not found in the materials"
- If reference URLs exist, mention "See ○○ for details"
```

**beats_with_full_metadata Format**
```
## Beat: what-is-agent
- Section: chapter1
- Tags: concept, agent
- Keywords: agent, component, input, output
- Text: An agent is an independent component that executes a specific task.
- Context: This diagram shows the internal structure of an agent. The left side is input, the center is processing logic...
- Expected Questions: What is an agent?, What is the role of an agent?
- References:
  - [web] Agent Detailed Documentation: https://graphai.dev/docs/agents
  - [code] Agent Implementation Examples: https://github.com/receptron/graphai/tree/main/agents
```

**Output Examples**
```bash
$ mulmo tool query graphai.json "What is an agent?"

An agent is an independent component that executes a specific task.
It receives input, performs processing (LLM calls, data transformation, etc.), and returns output.
Agents are stateless and return the same output for the same input.

$ mulmo tool query graphai.json "What is an agent?" --verbose

An agent is an independent component that executes a specific task.
It receives input, performs processing (LLM calls, data transformation, etc.), and returns output.

---
Source:
- [what-is-agent] section:chapter1, tags:concept,agent
  Image: agent-diagram.png

References:
- Agent Detailed Documentation: https://graphai.dev/docs/agents
- Agent Implementation Examples: https://github.com/receptron/graphai/tree/main/agents

$ mulmo tool query graphai.json "Is GraphAI free?"

Yes, GraphAI is open source and available for free under the MIT license.

---
(Answered from FAQ)

$ mulmo tool query graphai.json "Which LLMs are supported?" --json
{
  "answer": "Major providers including OpenAI, Anthropic, Google Gemini, and local LLMs are supported.",
  "source": "faq",
  "relatedBeats": ["what-is-agent"],
  "references": [
    {
      "type": "web",
      "url": "https://graphai.dev/docs/agents",
      "title": "Agent Detailed Documentation"
    }
  ],
  "confidence": "high"
}
```

---

### 3.3 AI Feature Type Definitions

```typescript
// src/types/ai_tools.ts

export const summarizeOptionsSchema = z.object({
  profile: z.string(),
  maxChars: z.number().optional(),
  beats: z.array(z.string()).optional(),  // Target beat IDs
  dryRun: z.boolean().optional(),
  overwrite: z.boolean().optional(),
});

export const queryOptionsSchema = z.object({
  question: z.string(),
  section: z.string().optional(),
  tags: z.array(z.string()).optional(),
  verbose: z.boolean().optional(),
  fetchReferences: z.boolean().optional(),  // Also fetch reference URL content
  json: z.boolean().optional(),
});

export const querySourceSchema = z.object({
  type: z.enum(["beat", "faq", "scriptMeta"]),
  beatId: z.string().optional(),
  faqIndex: z.number().optional(),
});

export const queryResultSchema = z.object({
  answer: z.string(),
  source: querySourceSchema,
  relatedBeats: z.array(z.string()).optional(),
  references: z.array(beatReferenceSchema).optional(),
  confidence: z.enum(["high", "medium", "low"]),
});
```

## 4. Implementation Plan

### Phase 1: Type Definitions and Variant Processing

| File | Changes |
|------|---------|
| `src/types/schema.ts` | Add `beatVariantSchema`, `beatMetaSchema`, `beatReferenceSchema`, `scriptMetaSchema`, `outputProfileSchema` |
| `src/utils/beat_variant.ts` | New: `applyVariant(beat, profile)`, `resolveBeat(beat, profile)` |
| `src/methods/mulmo_script.ts` | Profile application logic |

### Phase 2: CLI Support

| File | Changes |
|------|---------|
| `src/cli/common.ts` | Add `--profile` option |
| `src/cli/commands/*/builder.ts` | Add options to each command |
| `src/cli/commands/tool/profiles/` | New: profiles list command |

### Phase 3: Action Layer Support

| File | Changes |
|------|---------|
| `src/actions/audio.ts` | Apply profile |
| `src/actions/images.ts` | Apply profile |
| `src/actions/movie.ts` | Apply profile |

### Phase 4: Summarize (Auto-summary)

| File | Changes |
|------|---------|
| `src/types/ai_tools.ts` | New: `summarizeOptionsSchema` |
| `src/tools/summarize_script.ts` | New: Summary generation logic |
| `src/cli/commands/tool/summarize/` | New: summarize command |

### Phase 5: Query (Q&A)

| File | Changes |
|------|---------|
| `src/types/ai_tools.ts` | Add `queryOptionsSchema`, `queryResultSchema`, `querySourceSchema` |
| `src/tools/query_script.ts` | New: Query processing logic (FAQ search, beat matching, context utilization) |
| `src/utils/beat_matcher.ts` | New: Beat matching by keywords and expectedQuestions |
| `src/cli/commands/tool/query/` | New: query command |
| `src/utils/beat_filter.ts` | New: `--section`, `--tags` filter |

## 5. Backward Compatibility

- `variants` field is optional
- `meta` field is optional
- `outputProfiles` field is optional
- Existing MulmoScripts work as-is
- Without `--profile`, uses original text (same as current behavior)

## 6. Priority

1. **Phase 1**: Type definitions + variant resolution logic
2. **Phase 2**: `--profile` CLI option
3. **Phase 3**: Apply to audio/images/movie
4. **Phase 4**: summarize command (AI summary generation)
5. **Phase 5**: query command (Q&A)
