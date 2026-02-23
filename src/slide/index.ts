// Public API for the slide module
// This module is self-contained and can be extracted into a standalone package

export { generateSlideHTML } from "./render.js";
export type { ResolvedBranding } from "./render.js";
export { renderSlideContent } from "./layouts/index.js";
export { renderContentBlock, renderContentBlocks } from "./blocks.js";

// Schemas
export {
  mulmoSlideMediaSchema,
  slideLayoutSchema,
  slideThemeSchema,
  contentBlockSchema,
  imageRefBlockSchema,
  chartBlockSchema,
  mermaidBlockSchema,
  accentColorKeySchema,
  slideBrandingLogoSchema,
  slideBrandingSchema,
} from "./schema.js";

// Types
export type {
  MulmoSlideMedia,
  SlideLayout,
  SlideTheme,
  SlideThemeColors,
  SlideThemeFonts,
  ContentBlock,
  ImageRefBlock,
  ChartBlock,
  MermaidBlock,
  AccentColorKey,
  TitleSlide,
  ColumnsSlide,
  ComparisonSlide,
  GridSlide,
  BigQuoteSlide,
  StatsSlide,
  TimelineSlide,
  SplitSlide,
  MatrixSlide,
  TableSlide,
  FunnelSlide,
  Card,
  CalloutBar,
  SlideStyle,
  SlideBrandingLogo,
  SlideBranding,
} from "./schema.js";
