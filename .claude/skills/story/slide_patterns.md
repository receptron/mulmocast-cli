# Slide Design Patterns

## Dense slide: split + multiple sections

The go-to pattern for information-dense slides. All section sidebars share `primary` color; accent is used only for inline emphasis on key terms.

```json
{
  "layout": "split",
  "accentColor": "primary",
  "left": {
    "ratio": 55,
    "valign": "top",
    "content": [
      {
        "type": "text",
        "value": "Main headline or thesis",
        "bold": true, "fontSize": 24, "color": "primary"
      },
      {
        "type": "section",
        "label": "Topic A",
        "color": "primary",
        "sidebar": true,
        "content": [
          {
            "type": "bullets",
            "items": [
              { "text": "Key point about {danger:critical term}", "items": ["Detail 1", "Detail 2"] }
            ]
          }
        ]
      },
      {
        "type": "section",
        "label": "Topic B",
        "color": "primary",
        "sidebar": true,
        "content": [
          {
            "type": "bullets",
            "items": [
              { "text": "Another key point", "items": ["Sub-detail A", "Sub-detail B"] }
            ]
          }
        ]
      },
      {
        "type": "section",
        "label": "Topic C",
        "color": "primary",
        "sidebar": true,
        "content": [
          {
            "type": "bullets",
            "items": [
              { "text": "Third topic", "items": ["Data point", "Conclusion"] }
            ]
          }
        ]
      }
    ]
  },
  "right": {
    "dark": true,
    "ratio": 45,
    "valign": "center",
    "content": [
      { "type": "imageRef", "ref": "diagram", "alt": "Description", "fit": "contain" },
      { "type": "callout", "text": "Key takeaway quote", "style": "info" }
    ]
  }
}
```

## Dense slide: metrics + context

Metrics use color to encode meaning (green=positive, red=negative, primary=neutral):

```json
{
  "layout": "split",
  "left": {
    "labelBadge": true, "label": "Badge Title", "accentColor": "primary",
    "title": "Main Title", "subtitle": "Context line",
    "ratio": 55,
    "content": [
      { "type": "text", "value": "Supporting context paragraph.", "dim": true }
    ]
  },
  "right": {
    "dark": true, "ratio": 45, "valign": "center",
    "content": [
      { "type": "metric", "value": "42%", "label": "Growth rate", "color": "success" },
      { "type": "metric", "value": "1.2M", "label": "Users", "color": "primary" },
      { "type": "metric", "value": "-3%", "label": "Churn", "color": "danger" }
    ]
  }
}
```

## Dense slide: table + bullets

```json
{
  "layout": "split",
  "left": {
    "ratio": 45, "dark": true,
    "content": [
      { "type": "imageRef", "ref": "photo", "alt": "...", "fit": "contain" },
      { "type": "callout", "text": "Caption or context", "label": "Note", "style": "info" }
    ]
  },
  "right": {
    "ratio": 55, "labelBadge": true, "label": "Section Title", "accentColor": "primary",
    "content": [
      {
        "type": "bullets", "icon": "▸",
        "items": [
          { "text": "Point 1 with {danger:critical term}", "items": ["Detail"] },
          { "text": "Point 2 with supporting context", "items": ["Detail"] }
        ]
      }
    ]
  }
}
```

## Chart inside split layout

Use charts for quantitative data (stock prices, market size, percentages).

```json
{
  "layout": "split",
  "left": {
    "title": "Key Insight",
    "content": [
      { "type": "text", "value": "Context for the data" },
      { "type": "metric", "value": "42%", "label": "Growth rate", "color": "success" }
    ]
  },
  "right": {
    "content": [
      { "type": "chart", "chartData": { "type": "bar", "data": { "labels": ["A","B","C"], "datasets": [{"label":"X","data":[10,20,30]}] } }, "title": "Revenue" }
    ]
  }
}
```

## Mermaid inside split layout

Use mermaid for relationships and processes (org structures, cause-and-effect chains).

```json
{
  "layout": "split",
  "left": {
    "content": [
      { "type": "mermaid", "code": "graph TD\n  A-->B\n  B-->C", "title": "Process" }
    ]
  },
  "right": {
    "title": "Explanation",
    "content": [
      { "type": "bullets", "items": ["Step 1", "Step 2", "Step 3"] }
    ]
  }
}
```

## Design tips

- **Chart vs Mermaid**: Use charts for quantitative data, mermaid for relationships and processes
- **Always embed inside split**: Pair with text/metric/callout blocks in the adjacent panel for context
- **Fill empty space**: If a panel has room, add `imageRef`, `imagePrompt`, `chart`, or `mermaid` blocks — never leave panels empty
- **Inline markup for emphasis**: Use `{color:text}` to highlight 1-2 key terms per bullet, not every noun
- **Consistent sidebars**: All `section` blocks with `sidebar: true` on one slide should share the same base color
