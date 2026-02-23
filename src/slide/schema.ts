import { z } from "zod";

// ═══════════════════════════════════════════════════════════
// Foundation: Colors & Typography
// ═══════════════════════════════════════════════════════════

/** 6-digit hex without '#' prefix, e.g. "3B82F6" */
const hexColorSchema = z.string().regex(/^[0-9A-Fa-f]{6}$/);

/** Semantic accent colors usable on cards, badges, borders, etc. */
export const accentColorKeySchema = z.enum(["primary", "accent", "success", "warning", "danger", "info", "highlight"]);

export const slideThemeColorsSchema = z.object({
  bg: hexColorSchema,
  bgCard: hexColorSchema,
  bgCardAlt: hexColorSchema,
  text: hexColorSchema,
  textMuted: hexColorSchema,
  textDim: hexColorSchema,
  primary: hexColorSchema,
  accent: hexColorSchema,
  success: hexColorSchema,
  warning: hexColorSchema,
  danger: hexColorSchema,
  info: hexColorSchema,
  highlight: hexColorSchema,
});

export const slideThemeFontsSchema = z.object({
  title: z.string(),
  body: z.string(),
  mono: z.string(),
});

export const slideThemeSchema = z.object({
  colors: slideThemeColorsSchema,
  fonts: slideThemeFontsSchema,
});

// ═══════════════════════════════════════════════════════════
// Content Blocks — the atoms of slide content
// ═══════════════════════════════════════════════════════════

export const textBlockSchema = z.object({
  type: z.literal("text"),
  value: z.string(),
  align: z.enum(["left", "center", "right"]).optional(),
  bold: z.boolean().optional(),
  dim: z.boolean().optional(),
  fontSize: z.number().optional(),
  color: accentColorKeySchema.optional(),
});

/** Sub-bullet item: plain string or object with text */
const subBulletItemSchema = z.union([z.string(), z.object({ text: z.string() })]);

/** Bullet item: plain string or object with text and optional sub-items (2 levels max) */
export const bulletItemSchema = z.union([
  z.string(),
  z.object({
    text: z.string(),
    items: z.array(subBulletItemSchema).optional(),
  }),
]);

export const bulletsBlockSchema = z.object({
  type: z.literal("bullets"),
  items: z.array(bulletItemSchema),
  ordered: z.boolean().optional(),
  icon: z.string().optional(),
});

export const codeBlockSchema = z.object({
  type: z.literal("code"),
  code: z.string(),
  language: z.string().optional(),
});

export const calloutBlockSchema = z.object({
  type: z.literal("callout"),
  text: z.string(),
  label: z.string().optional(),
  color: accentColorKeySchema.optional(),
  style: z.enum(["quote", "info", "warning"]).optional(),
});

export const metricBlockSchema = z.object({
  type: z.literal("metric"),
  value: z.string(),
  label: z.string(),
  color: accentColorKeySchema.optional(),
  change: z.string().optional(),
});

export const dividerBlockSchema = z.object({
  type: z.literal("divider"),
  color: accentColorKeySchema.optional(),
});

export const imageBlockSchema = z.object({
  type: z.literal("image"),
  src: z.string(),
  alt: z.string().optional(),
  fit: z.enum(["contain", "cover"]).optional(),
});

export const imageRefBlockSchema = z.object({
  type: z.literal("imageRef"),
  ref: z.string(),
  alt: z.string().optional(),
  fit: z.enum(["contain", "cover"]).optional(),
});

export const chartBlockSchema = z.object({
  type: z.literal("chart"),
  chartData: z.record(z.string(), z.unknown()),
  title: z.string().optional(),
});

export const mermaidBlockSchema = z.object({
  type: z.literal("mermaid"),
  code: z.string(),
  title: z.string().optional(),
});

export const tableCellValueSchema = z.union([
  z.string(),
  z.object({
    text: z.string(),
    color: accentColorKeySchema.optional(),
    bold: z.boolean().optional(),
    badge: z.boolean().optional(),
  }),
]);

export const tableBlockSchema = z.object({
  type: z.literal("table"),
  title: z.string().optional(),
  headers: z.array(z.string()).optional(),
  rows: z.array(z.array(tableCellValueSchema)),
  rowHeaders: z.boolean().optional(),
  striped: z.boolean().optional(),
});

/** Block schemas shared between contentBlockSchema and nonSectionContentBlockSchema */
const baseBlockSchemas = [
  textBlockSchema,
  bulletsBlockSchema,
  codeBlockSchema,
  calloutBlockSchema,
  metricBlockSchema,
  dividerBlockSchema,
  imageBlockSchema,
  imageRefBlockSchema,
  chartBlockSchema,
  mermaidBlockSchema,
  tableBlockSchema,
] as const;

/** All content block types except section (used inside section to prevent recursion) */
const nonSectionContentBlockSchema = z.discriminatedUnion("type", [...baseBlockSchemas]);

export const sectionBlockSchema = z.object({
  type: z.literal("section"),
  label: z.string(),
  color: accentColorKeySchema.optional(),
  content: z.array(nonSectionContentBlockSchema).optional(),
  text: z.string().optional(),
  sidebar: z.boolean().optional(),
});

export const contentBlockSchema = z.discriminatedUnion("type", [...baseBlockSchemas, sectionBlockSchema]);

// ═══════════════════════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════════════════════

/** Bottom-of-slide callout bar */
export const calloutBarSchema = z.object({
  text: z.string(),
  label: z.string().optional(),
  color: accentColorKeySchema.optional(),
  align: z.enum(["left", "center"]).optional(),
  leftBar: z.boolean().optional(),
});

/** Reusable card definition — used by columns, grid */
export const cardSchema = z.object({
  title: z.string(),
  accentColor: accentColorKeySchema.optional(),
  content: z.array(contentBlockSchema).optional(),
  footer: z.string().optional(),
  label: z.string().optional(),
  num: z.number().optional(),
  icon: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════
// Slide-level styling — orthogonal to layout
// ═══════════════════════════════════════════════════════════

export const slideStyleSchema = z.object({
  bgColor: z.string().optional(),
  decorations: z.boolean().optional(),
  bgOpacity: z.number().optional(),
  footer: z.string().optional(),
});

/** Common slide properties shared across all layouts */
const slideBaseFields = {
  accentColor: accentColorKeySchema.optional(),
  style: slideStyleSchema.optional(),
};

// ═══════════════════════════════════════════════════════════
// Layouts
// ═══════════════════════════════════════════════════════════

// ─── title ───
export const titleSlideSchema = z.object({
  layout: z.literal("title"),
  ...slideBaseFields,
  title: z.string(),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  note: z.string().optional(),
});

// ─── columns ───
export const columnsSlideSchema = z.object({
  layout: z.literal("columns"),
  ...slideBaseFields,
  title: z.string(),
  stepLabel: z.string().optional(),
  subtitle: z.string().optional(),
  columns: z.array(cardSchema),
  showArrows: z.boolean().optional(),
  callout: calloutBarSchema.optional(),
  bottomText: z.string().optional(),
});

// ─── comparison ───
export const comparisonPanelSchema = z.object({
  title: z.string(),
  accentColor: accentColorKeySchema.optional(),
  content: z.array(contentBlockSchema).optional(),
  footer: z.string().optional(),
});

export const comparisonSlideSchema = z.object({
  layout: z.literal("comparison"),
  ...slideBaseFields,
  title: z.string(),
  stepLabel: z.string().optional(),
  subtitle: z.string().optional(),
  left: comparisonPanelSchema,
  right: comparisonPanelSchema,
  callout: calloutBarSchema.optional(),
});

// ─── grid ───
export const gridItemSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  accentColor: accentColorKeySchema.optional(),
  num: z.number().optional(),
  icon: z.string().optional(),
  content: z.array(contentBlockSchema).optional(),
});

export const gridSlideSchema = z.object({
  layout: z.literal("grid"),
  ...slideBaseFields,
  title: z.string(),
  subtitle: z.string().optional(),
  gridColumns: z.number().optional(),
  items: z.array(gridItemSchema),
  footer: z.string().optional(),
});

// ─── bigQuote ───
export const bigQuoteSlideSchema = z.object({
  layout: z.literal("bigQuote"),
  ...slideBaseFields,
  quote: z.string(),
  author: z.string().optional(),
  role: z.string().optional(),
});

// ─── stats ───
export const statItemSchema = z.object({
  value: z.string(),
  label: z.string(),
  color: accentColorKeySchema.optional(),
  change: z.string().optional(),
});

export const statsSlideSchema = z.object({
  layout: z.literal("stats"),
  ...slideBaseFields,
  title: z.string(),
  stepLabel: z.string().optional(),
  subtitle: z.string().optional(),
  stats: z.array(statItemSchema),
  callout: calloutBarSchema.optional(),
});

// ─── timeline ───
export const timelineItemSchema = z.object({
  date: z.string(),
  title: z.string(),
  description: z.string().optional(),
  color: accentColorKeySchema.optional(),
  done: z.boolean().optional(),
});

export const timelineSlideSchema = z.object({
  layout: z.literal("timeline"),
  ...slideBaseFields,
  title: z.string(),
  stepLabel: z.string().optional(),
  subtitle: z.string().optional(),
  items: z.array(timelineItemSchema),
});

// ─── split ───
export const splitPanelSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  label: z.string().optional(),
  labelBadge: z.boolean().optional(),
  accentColor: accentColorKeySchema.optional(),
  content: z.array(contentBlockSchema).optional(),
  dark: z.boolean().optional(),
  ratio: z.number().optional(),
  valign: z.enum(["top", "center", "bottom"]).optional(),
});

export const splitSlideSchema = z.object({
  layout: z.literal("split"),
  ...slideBaseFields,
  left: splitPanelSchema.optional(),
  right: splitPanelSchema.optional(),
});

// ─── matrix ───
export const matrixCellSchema = z.object({
  label: z.string(),
  items: z.array(z.string()).optional(),
  content: z.array(contentBlockSchema).optional(),
  accentColor: accentColorKeySchema.optional(),
});

export const matrixSlideSchema = z.object({
  layout: z.literal("matrix"),
  ...slideBaseFields,
  title: z.string(),
  stepLabel: z.string().optional(),
  subtitle: z.string().optional(),
  rows: z.number().optional(),
  cols: z.number().optional(),
  xAxis: z
    .object({
      low: z.string().optional(),
      high: z.string().optional(),
      label: z.string().optional(),
    })
    .optional(),
  yAxis: z
    .object({
      low: z.string().optional(),
      high: z.string().optional(),
      label: z.string().optional(),
    })
    .optional(),
  cells: z.array(matrixCellSchema),
});

// ─── table ───
export const tableSlideSchema = z.object({
  layout: z.literal("table"),
  ...slideBaseFields,
  title: z.string(),
  stepLabel: z.string().optional(),
  subtitle: z.string().optional(),
  headers: z.array(z.string()),
  rows: z.array(z.array(tableCellValueSchema)),
  rowHeaders: z.boolean().optional(),
  striped: z.boolean().optional(),
  callout: calloutBarSchema.optional(),
});

// ─── funnel ───
export const funnelStageSchema = z.object({
  label: z.string(),
  value: z.string().optional(),
  description: z.string().optional(),
  color: accentColorKeySchema.optional(),
});

export const funnelSlideSchema = z.object({
  layout: z.literal("funnel"),
  ...slideBaseFields,
  title: z.string(),
  stepLabel: z.string().optional(),
  subtitle: z.string().optional(),
  stages: z.array(funnelStageSchema),
  callout: calloutBarSchema.optional(),
});

// ═══════════════════════════════════════════════════════════
// Branding — logo & background image overlay
// ═══════════════════════════════════════════════════════════

/**
 * Media source for branding assets (self-contained definition to avoid
 * circular dependency with src/types/schema.ts).
 */
const slideMediaSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("url"), url: z.url() }).strict(),
  z.object({ kind: z.literal("base64"), data: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("path"), path: z.string().min(1) }).strict(),
]);

const slideBackgroundImageSourceSchema = z.object({
  source: slideMediaSourceSchema,
  size: z.enum(["cover", "contain", "fill", "auto"]).optional(),
  opacity: z.number().min(0).max(1).optional(),
});

export const slideBrandingLogoSchema = z
  .object({
    source: slideMediaSourceSchema,
    position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]).default("top-right"),
    width: z.number().default(120),
  })
  .strict();

export const slideBrandingSchema = z
  .object({
    logo: slideBrandingLogoSchema.optional(),
    backgroundImage: slideBackgroundImageSourceSchema.optional(),
  })
  .strict();

// ═══════════════════════════════════════════════════════════
// Slide Union & Media Schema
// ═══════════════════════════════════════════════════════════

export const slideLayoutSchema = z.discriminatedUnion("layout", [
  titleSlideSchema,
  columnsSlideSchema,
  comparisonSlideSchema,
  gridSlideSchema,
  bigQuoteSlideSchema,
  statsSlideSchema,
  timelineSlideSchema,
  splitSlideSchema,
  matrixSlideSchema,
  tableSlideSchema,
  funnelSlideSchema,
]);

/** Media schema registered in mulmoImageAssetSchema */
export const mulmoSlideMediaSchema = z
  .object({
    type: z.literal("slide"),
    theme: slideThemeSchema.optional(),
    slide: slideLayoutSchema,
    reference: z.string().optional(),
    branding: slideBrandingSchema.nullable().optional(),
  })
  .strict();

// ═══════════════════════════════════════════════════════════
// Inferred Types
// ═══════════════════════════════════════════════════════════

export type AccentColorKey = z.infer<typeof accentColorKeySchema>;
export type SlideThemeColors = z.infer<typeof slideThemeColorsSchema>;
export type SlideThemeFonts = z.infer<typeof slideThemeFontsSchema>;
export type SlideTheme = z.infer<typeof slideThemeSchema>;
export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type BulletItem = z.infer<typeof bulletItemSchema>;
export type BulletsBlock = z.infer<typeof bulletsBlockSchema>;
export type CodeBlock = z.infer<typeof codeBlockSchema>;
export type CalloutBlock = z.infer<typeof calloutBlockSchema>;
export type MetricBlock = z.infer<typeof metricBlockSchema>;
export type DividerBlock = z.infer<typeof dividerBlockSchema>;
export type ImageBlock = z.infer<typeof imageBlockSchema>;
export type ImageRefBlock = z.infer<typeof imageRefBlockSchema>;
export type ChartBlock = z.infer<typeof chartBlockSchema>;
export type MermaidBlock = z.infer<typeof mermaidBlockSchema>;
export type SectionBlock = z.infer<typeof sectionBlockSchema>;
export type TableBlock = z.infer<typeof tableBlockSchema>;
export type CalloutBar = z.infer<typeof calloutBarSchema>;
export type Card = z.infer<typeof cardSchema>;
export type SlideStyle = z.infer<typeof slideStyleSchema>;
export type SlideLayout = z.infer<typeof slideLayoutSchema>;
export type TitleSlide = z.infer<typeof titleSlideSchema>;
export type ColumnsSlide = z.infer<typeof columnsSlideSchema>;
export type ComparisonPanel = z.infer<typeof comparisonPanelSchema>;
export type ComparisonSlide = z.infer<typeof comparisonSlideSchema>;
export type GridItem = z.infer<typeof gridItemSchema>;
export type GridSlide = z.infer<typeof gridSlideSchema>;
export type BigQuoteSlide = z.infer<typeof bigQuoteSlideSchema>;
export type StatItem = z.infer<typeof statItemSchema>;
export type StatsSlide = z.infer<typeof statsSlideSchema>;
export type TimelineItem = z.infer<typeof timelineItemSchema>;
export type TimelineSlide = z.infer<typeof timelineSlideSchema>;
export type SplitPanel = z.infer<typeof splitPanelSchema>;
export type SplitSlide = z.infer<typeof splitSlideSchema>;
export type MatrixCell = z.infer<typeof matrixCellSchema>;
export type MatrixSlide = z.infer<typeof matrixSlideSchema>;
export type TableCellValue = z.infer<typeof tableCellValueSchema>;
export type TableSlide = z.infer<typeof tableSlideSchema>;
export type FunnelStage = z.infer<typeof funnelStageSchema>;
export type FunnelSlide = z.infer<typeof funnelSlideSchema>;
export type SlideBrandingLogo = z.infer<typeof slideBrandingLogoSchema>;
export type SlideBranding = z.infer<typeof slideBrandingSchema>;
export type MulmoSlideMedia = z.infer<typeof mulmoSlideMediaSchema>;
