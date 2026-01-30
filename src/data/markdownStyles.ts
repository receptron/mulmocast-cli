/**
 * Markdown Slide Styles
 * 100 pre-designed styles for markdown slides
 */

export interface MarkdownStyle {
  name: string;
  category: string;
  css: string;
}

// Base reset styles applied to all
const baseReset = `
  *,*::before,*::after{box-sizing:border-box}
  body,h1,h2,h3,h4,p,figure,blockquote,dl,dd{margin:0}
  html:focus-within{scroll-behavior:smooth}
  body{min-height:100vh;text-rendering:optimizeSpeed;line-height:1.6}
  img,picture{max-width:100%;display:block}
`;

// Helper function to create a style
const createStyle = (name: string, category: string, css: string): MarkdownStyle => ({
  name,
  category,
  css: baseReset + css,
});

export const markdownStyles: MarkdownStyle[] = [
  // ========================================
  // BUSINESS / CORPORATE (1-10)
  // ========================================
  createStyle(
    "corporate-blue",
    "business",
    `
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff; font-family: 'Segoe UI', sans-serif; padding: 60px;
    }
    h1 { font-size: 56px; font-weight: 700; margin-bottom: 30px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
    h2 { font-size: 42px; border-bottom: 3px solid rgba(255,255,255,0.5); padding-bottom: 10px; }
    ul { font-size: 28px; margin-left: 40px; }
    li { margin: 15px 0; }
  `,
  ),

  createStyle(
    "executive-gray",
    "business",
    `
    body {
      background: linear-gradient(180deg, #2c3e50 0%, #4a5568 100%);
      color: #f7fafc; font-family: 'Georgia', serif; padding: 60px;
    }
    h1 { font-size: 52px; font-weight: 400; letter-spacing: 2px; border-left: 5px solid #e2b714; padding-left: 20px; }
    h2 { font-size: 38px; color: #e2b714; }
    ul { font-size: 26px; }
    li { margin: 12px 0; }
  `,
  ),

  createStyle(
    "finance-green",
    "business",
    `
    body {
      background: linear-gradient(135deg, #134e5e 0%, #71b280 100%);
      color: #fff; font-family: 'Arial', sans-serif; padding: 60px;
    }
    h1 { font-size: 54px; text-align: center; margin-bottom: 40px; }
    h2 { font-size: 40px; }
    ul { font-size: 28px; background: rgba(255,255,255,0.1); padding: 30px; border-radius: 10px; }
  `,
  ),

  createStyle(
    "startup-orange",
    "business",
    `
    body {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: #fff; font-family: 'Helvetica Neue', sans-serif; padding: 60px;
    }
    h1 { font-size: 58px; font-weight: 800; }
    h2 { font-size: 42px; }
    ul { font-size: 28px; }
    li::marker { color: #fff; }
  `,
  ),

  createStyle(
    "consulting-navy",
    "business",
    `
    body {
      background: #1a365d; color: #fff;
      font-family: 'Times New Roman', serif; padding: 60px;
    }
    h1 { font-size: 50px; color: #90cdf4; border-bottom: 2px solid #90cdf4; }
    h2 { font-size: 36px; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "professional-white",
    "business",
    `
    body {
      background: #fff; color: #1a202c;
      font-family: 'Segoe UI', sans-serif; padding: 60px;
      border-left: 8px solid #3182ce;
    }
    h1 { font-size: 52px; color: #2b6cb0; }
    h2 { font-size: 38px; color: #4a5568; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "corporate-teal",
    "business",
    `
    body {
      background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
      color: #e0f2f1; font-family: 'Arial', sans-serif; padding: 60px;
    }
    h1 { font-size: 54px; color: #4fd1c5; }
    h2 { font-size: 40px; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "enterprise-purple",
    "business",
    `
    body {
      background: linear-gradient(135deg, #2e1065 0%, #581c87 100%);
      color: #f3e8ff; font-family: 'Georgia', serif; padding: 60px;
    }
    h1 { font-size: 52px; }
    h2 { font-size: 38px; color: #c4b5fd; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "banking-gold",
    "business",
    `
    body {
      background: linear-gradient(135deg, #232526 0%, #414345 100%);
      color: #fff; font-family: 'Palatino', serif; padding: 60px;
    }
    h1 { font-size: 50px; color: #d4af37; border-bottom: 2px solid #d4af37; }
    h2 { font-size: 36px; color: #d4af37; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "modern-corporate",
    "business",
    `
    body {
      background: linear-gradient(180deg, #ffffff 0%, #f0f4f8 100%);
      color: #2d3748; font-family: 'SF Pro Display', sans-serif; padding: 60px;
    }
    h1 { font-size: 56px; background: linear-gradient(90deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h2 { font-size: 40px; }
    ul { font-size: 28px; }
  `,
  ),

  // ========================================
  // TECH / CYBER (11-20)
  // ========================================
  createStyle(
    "cyber-neon",
    "tech",
    `
    body {
      background: #0a0a0a; color: #00ff88;
      font-family: 'Courier New', monospace; padding: 60px;
    }
    h1 { font-size: 54px; text-shadow: 0 0 20px #00ff88, 0 0 40px #00ff88; }
    h2 { font-size: 40px; color: #ff00ff; text-shadow: 0 0 10px #ff00ff; }
    ul { font-size: 26px; border-left: 3px solid #00ff88; padding-left: 20px; }
  `,
  ),

  createStyle(
    "terminal-dark",
    "tech",
    `
    body {
      background: #1e1e1e; color: #d4d4d4;
      font-family: 'Fira Code', 'Consolas', monospace; padding: 60px;
    }
    h1 { font-size: 48px; color: #569cd6; }
    h1::before { content: '> '; color: #608b4e; }
    h2 { font-size: 36px; color: #ce9178; }
    ul { font-size: 24px; }
    code { background: #2d2d2d; padding: 2px 6px; border-radius: 3px; }
  `,
  ),

  createStyle(
    "gradient-purple",
    "tech",
    `
    body {
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
      color: #fff; font-family: 'Inter', sans-serif; padding: 60px;
    }
    h1 { font-size: 56px; font-weight: 800; }
    h2 { font-size: 42px; }
    ul { font-size: 28px; background: rgba(0,0,0,0.2); padding: 30px; border-radius: 15px; }
  `,
  ),

  createStyle(
    "matrix-green",
    "tech",
    `
    body {
      background: #000; color: #00ff00;
      font-family: 'Courier New', monospace; padding: 60px;
    }
    h1 { font-size: 50px; text-shadow: 0 0 10px #00ff00; animation: flicker 2s infinite; }
    h2 { font-size: 38px; }
    ul { font-size: 26px; }
    @keyframes flicker { 0%,100%{opacity:1} 50%{opacity:0.8} }
  `,
  ),

  createStyle(
    "ai-blue",
    "tech",
    `
    body {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
      color: #e0f2fe; font-family: 'Roboto', sans-serif; padding: 60px;
    }
    h1 { font-size: 54px; color: #38bdf8; }
    h2 { font-size: 40px; color: #7dd3fc; }
    ul { font-size: 28px; }
    li::marker { color: #38bdf8; }
  `,
  ),

  createStyle(
    "hologram",
    "tech",
    `
    body {
      background: linear-gradient(135deg, #0c1445 0%, #1a1a40 100%);
      color: #00d4ff; font-family: 'Orbitron', sans-serif; padding: 60px;
    }
    h1 { font-size: 52px; text-shadow: 0 0 30px rgba(0,212,255,0.5); }
    h2 { font-size: 38px; border-bottom: 1px solid rgba(0,212,255,0.3); }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "circuit-board",
    "tech",
    `
    body {
      background: #1a1a2e; color: #4ade80;
      font-family: 'JetBrains Mono', monospace; padding: 60px;
      background-image:
        linear-gradient(rgba(74,222,128,0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(74,222,128,0.1) 1px, transparent 1px);
      background-size: 30px 30px;
    }
    h1 { font-size: 50px; }
    h2 { font-size: 38px; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "dark-code",
    "tech",
    `
    body {
      background: #282c34; color: #abb2bf;
      font-family: 'Source Code Pro', monospace; padding: 60px;
    }
    h1 { font-size: 48px; color: #61afef; }
    h2 { font-size: 36px; color: #c678dd; }
    ul { font-size: 24px; }
    pre { background: #21252b; padding: 20px; border-radius: 8px; }
  `,
  ),

  createStyle(
    "cyberpunk",
    "tech",
    `
    body {
      background: linear-gradient(135deg, #0d0221 0%, #150734 100%);
      color: #ff2a6d; font-family: 'Orbitron', sans-serif; padding: 60px;
    }
    h1 { font-size: 54px; color: #05d9e8; text-shadow: 3px 3px 0 #ff2a6d; }
    h2 { font-size: 40px; color: #d1f7ff; }
    ul { font-size: 26px; color: #fff; }
  `,
  ),

  createStyle(
    "blockchain",
    "tech",
    `
    body {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #f7931a; font-family: 'Inter', sans-serif; padding: 60px;
    }
    h1 { font-size: 52px; }
    h2 { font-size: 40px; color: #fff; }
    ul { font-size: 28px; color: #e0e0e0; }
  `,
  ),

  // ========================================
  // CREATIVE / ARTISTIC (21-30)
  // ========================================
  createStyle(
    "artistic-splash",
    "creative",
    `
    body {
      background: linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%);
      color: #fff; font-family: 'Playfair Display', serif; padding: 60px;
    }
    h1 { font-size: 58px; font-style: italic; text-shadow: 3px 3px 6px rgba(0,0,0,0.3); }
    h2 { font-size: 42px; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "watercolor-soft",
    "creative",
    `
    body {
      background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
      color: #5d4e37; font-family: 'Dancing Script', cursive; padding: 60px;
    }
    h1 { font-size: 60px; color: #c44569; }
    h2 { font-size: 44px; color: #f8b500; }
    ul { font-size: 30px; font-family: 'Georgia', serif; }
  `,
  ),

  createStyle(
    "bold-pop",
    "creative",
    `
    body {
      background: #fff500; color: #000;
      font-family: 'Impact', sans-serif; padding: 60px;
    }
    h1 { font-size: 64px; text-transform: uppercase; }
    h2 { font-size: 48px; color: #ff0066; }
    ul { font-size: 30px; font-family: 'Arial Black', sans-serif; }
  `,
  ),

  createStyle(
    "pastel-dream",
    "creative",
    `
    body {
      background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
      color: #4a4a4a; font-family: 'Quicksand', sans-serif; padding: 60px;
    }
    h1 { font-size: 54px; color: #6c5ce7; }
    h2 { font-size: 40px; color: #fd79a8; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "graffiti",
    "creative",
    `
    body {
      background: #1a1a1a; color: #fff;
      font-family: 'Permanent Marker', cursive; padding: 60px;
    }
    h1 { font-size: 58px; color: #ff6b6b; transform: rotate(-2deg); }
    h2 { font-size: 44px; color: #4ecdc4; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "neon-glow",
    "creative",
    `
    body {
      background: #1a1a2e; color: #fff;
      font-family: 'Montserrat', sans-serif; padding: 60px;
    }
    h1 { font-size: 56px; color: #ff00ff; text-shadow: 0 0 20px #ff00ff, 0 0 40px #ff00ff; }
    h2 { font-size: 42px; color: #00ffff; text-shadow: 0 0 15px #00ffff; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "retro-comic",
    "creative",
    `
    body {
      background: #fffbe6; color: #333;
      font-family: 'Comic Sans MS', cursive; padding: 60px;
      background-image: radial-gradient(circle, #000 1px, transparent 1px);
      background-size: 20px 20px;
    }
    h1 { font-size: 52px; color: #e74c3c; text-shadow: 3px 3px 0 #f1c40f; }
    h2 { font-size: 40px; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "abstract-shapes",
    "creative",
    `
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff; font-family: 'Poppins', sans-serif; padding: 60px;
    }
    h1 { font-size: 54px; }
    h2 { font-size: 40px; }
    ul { font-size: 28px; background: rgba(255,255,255,0.15); padding: 25px; border-radius: 20px; }
  `,
  ),

  createStyle(
    "vintage-poster",
    "creative",
    `
    body {
      background: #f4e4bc; color: #2c1810;
      font-family: 'Playfair Display', serif; padding: 60px;
    }
    h1 { font-size: 56px; color: #8b0000; text-transform: uppercase; letter-spacing: 5px; }
    h2 { font-size: 40px; border-bottom: 3px double #2c1810; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "rainbow-gradient",
    "creative",
    `
    body {
      background: linear-gradient(135deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3);
      color: #fff; font-family: 'Fredoka One', cursive; padding: 60px;
    }
    h1 { font-size: 58px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
    h2 { font-size: 44px; }
    ul { font-size: 30px; background: rgba(0,0,0,0.3); padding: 25px; border-radius: 15px; }
  `,
  ),

  // ========================================
  // MINIMALIST (31-40)
  // ========================================
  createStyle(
    "clean-white",
    "minimalist",
    `
    body {
      background: #ffffff; color: #1a1a1a;
      font-family: 'Helvetica Neue', sans-serif; padding: 80px;
    }
    h1 { font-size: 48px; font-weight: 300; letter-spacing: -1px; }
    h2 { font-size: 32px; font-weight: 300; color: #666; }
    ul { font-size: 24px; font-weight: 300; }
    li { margin: 20px 0; }
  `,
  ),

  createStyle(
    "zen-beige",
    "minimalist",
    `
    body {
      background: #f5f0e8; color: #3d3d3d;
      font-family: 'Noto Serif', serif; padding: 80px;
    }
    h1 { font-size: 46px; font-weight: 400; }
    h2 { font-size: 32px; color: #8b7355; }
    ul { font-size: 24px; }
  `,
  ),

  createStyle(
    "nordic-light",
    "minimalist",
    `
    body {
      background: #f0f4f8; color: #2d3748;
      font-family: 'Inter', sans-serif; padding: 80px;
    }
    h1 { font-size: 50px; font-weight: 600; }
    h2 { font-size: 34px; color: #4a5568; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "paper-minimal",
    "minimalist",
    `
    body {
      background: #fffef9; color: #333;
      font-family: 'Merriweather', serif; padding: 80px;
      border: 1px solid #e0e0e0;
    }
    h1 { font-size: 44px; font-weight: 400; }
    h2 { font-size: 30px; }
    ul { font-size: 24px; }
  `,
  ),

  createStyle(
    "swiss-design",
    "minimalist",
    `
    body {
      background: #fff; color: #000;
      font-family: 'Helvetica', sans-serif; padding: 60px;
    }
    h1 { font-size: 72px; font-weight: 700; line-height: 1; }
    h2 { font-size: 36px; color: #ff0000; }
    ul { font-size: 24px; }
  `,
  ),

  createStyle(
    "soft-gray",
    "minimalist",
    `
    body {
      background: #f8f9fa; color: #495057;
      font-family: 'Roboto', sans-serif; padding: 80px;
    }
    h1 { font-size: 48px; color: #212529; }
    h2 { font-size: 32px; }
    ul { font-size: 24px; }
  `,
  ),

  createStyle(
    "mono-elegant",
    "minimalist",
    `
    body {
      background: #1a1a1a; color: #f0f0f0;
      font-family: 'SF Mono', monospace; padding: 80px;
    }
    h1 { font-size: 44px; font-weight: 300; letter-spacing: 3px; }
    h2 { font-size: 28px; color: #888; }
    ul { font-size: 22px; }
  `,
  ),

  createStyle(
    "airy-blue",
    "minimalist",
    `
    body {
      background: #f0f7ff; color: #1e3a5f;
      font-family: 'Open Sans', sans-serif; padding: 80px;
    }
    h1 { font-size: 50px; font-weight: 300; }
    h2 { font-size: 34px; color: #3182ce; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "cream-simple",
    "minimalist",
    `
    body {
      background: #fdfcf8; color: #4a4a4a;
      font-family: 'Lora', serif; padding: 80px;
    }
    h1 { font-size: 48px; }
    h2 { font-size: 32px; color: #8b7355; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "ultra-minimal",
    "minimalist",
    `
    body {
      background: #fff; color: #000;
      font-family: 'Arial', sans-serif; padding: 100px;
    }
    h1 { font-size: 40px; font-weight: 400; margin-bottom: 60px; }
    h2 { font-size: 28px; }
    ul { font-size: 22px; list-style: none; }
    li { border-bottom: 1px solid #eee; padding: 15px 0; }
  `,
  ),

  // ========================================
  // NATURE (41-50)
  // ========================================
  createStyle(
    "forest-green",
    "nature",
    `
    body {
      background: linear-gradient(135deg, #134e5e 0%, #71b280 100%);
      color: #fff; font-family: 'Georgia', serif; padding: 60px;
    }
    h1 { font-size: 54px; }
    h2 { font-size: 40px; color: #a8e6cf; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "ocean-blue",
    "nature",
    `
    body {
      background: linear-gradient(180deg, #0077b6 0%, #023e8a 100%);
      color: #fff; font-family: 'Lato', sans-serif; padding: 60px;
    }
    h1 { font-size: 56px; color: #90e0ef; }
    h2 { font-size: 42px; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "sunset-orange",
    "nature",
    `
    body {
      background: linear-gradient(135deg, #f12711 0%, #f5af19 100%);
      color: #fff; font-family: 'Montserrat', sans-serif; padding: 60px;
    }
    h1 { font-size: 58px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
    h2 { font-size: 44px; }
    ul { font-size: 30px; }
  `,
  ),

  createStyle(
    "autumn-leaves",
    "nature",
    `
    body {
      background: linear-gradient(135deg, #834d18 0%, #bf6a41 50%, #d4a574 100%);
      color: #fff8e7; font-family: 'Crimson Text', serif; padding: 60px;
    }
    h1 { font-size: 52px; }
    h2 { font-size: 38px; color: #ffd93d; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "spring-bloom",
    "nature",
    `
    body {
      background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
      color: #5d4037; font-family: 'Playfair Display', serif; padding: 60px;
    }
    h1 { font-size: 54px; color: #e91e63; }
    h2 { font-size: 40px; color: #8bc34a; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "mountain-mist",
    "nature",
    `
    body {
      background: linear-gradient(180deg, #bdc3c7 0%, #2c3e50 100%);
      color: #fff; font-family: 'Raleway', sans-serif; padding: 60px;
    }
    h1 { font-size: 52px; }
    h2 { font-size: 38px; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "tropical-vibes",
    "nature",
    `
    body {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      color: #fff; font-family: 'Nunito', sans-serif; padding: 60px;
    }
    h1 { font-size: 56px; }
    h2 { font-size: 42px; }
    ul { font-size: 28px; background: rgba(0,0,0,0.15); padding: 25px; border-radius: 15px; }
  `,
  ),

  createStyle(
    "desert-sand",
    "nature",
    `
    body {
      background: linear-gradient(135deg, #c2b280 0%, #f4e4bc 100%);
      color: #5d4037; font-family: 'Libre Baskerville', serif; padding: 60px;
    }
    h1 { font-size: 50px; color: #8b4513; }
    h2 { font-size: 36px; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "night-sky",
    "nature",
    `
    body {
      background: linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      color: #fff; font-family: 'Quicksand', sans-serif; padding: 60px;
    }
    h1 { font-size: 54px; color: #f9d71c; }
    h2 { font-size: 40px; color: #87ceeb; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "lavender-field",
    "nature",
    `
    body {
      background: linear-gradient(135deg, #e6e6fa 0%, #9370db 100%);
      color: #4b0082; font-family: 'Cormorant Garamond', serif; padding: 60px;
    }
    h1 { font-size: 52px; }
    h2 { font-size: 38px; }
    ul { font-size: 28px; color: #2e0854; }
  `,
  ),

  // ========================================
  // DARK MODE (51-60)
  // ========================================
  createStyle(
    "charcoal-elegant",
    "dark",
    `
    body {
      background: #1a1a1a; color: #e0e0e0;
      font-family: 'Playfair Display', serif; padding: 60px;
    }
    h1 { font-size: 52px; color: #fff; }
    h2 { font-size: 38px; color: #b0b0b0; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "midnight-blue",
    "dark",
    `
    body {
      background: linear-gradient(180deg, #0d1b2a 0%, #1b263b 100%);
      color: #e0e1dd; font-family: 'Roboto', sans-serif; padding: 60px;
    }
    h1 { font-size: 54px; color: #778da9; }
    h2 { font-size: 40px; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "dark-gradient",
    "dark",
    `
    body {
      background: linear-gradient(135deg, #232526 0%, #414345 100%);
      color: #fff; font-family: 'Inter', sans-serif; padding: 60px;
    }
    h1 { font-size: 56px; }
    h2 { font-size: 42px; color: #a0a0a0; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "deep-purple-dark",
    "dark",
    `
    body {
      background: linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 100%);
      color: #e8d5f2; font-family: 'Nunito', sans-serif; padding: 60px;
    }
    h1 { font-size: 54px; color: #bb86fc; }
    h2 { font-size: 40px; color: #cf6679; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "obsidian",
    "dark",
    `
    body {
      background: #0b0c10; color: #c5c6c7;
      font-family: 'Source Sans Pro', sans-serif; padding: 60px;
    }
    h1 { font-size: 52px; color: #66fcf1; }
    h2 { font-size: 38px; color: #45a29e; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "dark-forest",
    "dark",
    `
    body {
      background: linear-gradient(180deg, #0d1f0d 0%, #1a3a1a 100%);
      color: #a8d5a2; font-family: 'Merriweather', serif; padding: 60px;
    }
    h1 { font-size: 50px; color: #90ee90; }
    h2 { font-size: 36px; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "dark-ocean",
    "dark",
    `
    body {
      background: linear-gradient(180deg, #0a1628 0%, #1a3a5c 100%);
      color: #b8d4e8; font-family: 'Lato', sans-serif; padding: 60px;
    }
    h1 { font-size: 54px; color: #4fc3f7; }
    h2 { font-size: 40px; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "slate-dark",
    "dark",
    `
    body {
      background: #1e293b; color: #e2e8f0;
      font-family: 'Inter', sans-serif; padding: 60px;
    }
    h1 { font-size: 52px; color: #f8fafc; }
    h2 { font-size: 38px; color: #94a3b8; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "noir",
    "dark",
    `
    body {
      background: #000; color: #fff;
      font-family: 'Bodoni Moda', serif; padding: 60px;
    }
    h1 { font-size: 56px; font-style: italic; }
    h2 { font-size: 40px; color: #888; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "carbon-fiber",
    "dark",
    `
    body {
      background: #111; color: #ddd;
      font-family: 'Exo 2', sans-serif; padding: 60px;
      background-image:
        linear-gradient(45deg, #222 25%, transparent 25%),
        linear-gradient(-45deg, #222 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #222 75%),
        linear-gradient(-45deg, transparent 75%, #222 75%);
      background-size: 10px 10px;
    }
    h1 { font-size: 50px; color: #00bcd4; }
    h2 { font-size: 36px; }
    ul { font-size: 26px; }
  `,
  ),

  // ========================================
  // COLORFUL / VIBRANT (61-70)
  // ========================================
  createStyle(
    "vibrant-pink",
    "colorful",
    `
    body {
      background: linear-gradient(135deg, #ff0844 0%, #ffb199 100%);
      color: #fff; font-family: 'Poppins', sans-serif; padding: 60px;
    }
    h1 { font-size: 58px; font-weight: 700; }
    h2 { font-size: 44px; }
    ul { font-size: 30px; }
  `,
  ),

  createStyle(
    "electric-blue",
    "colorful",
    `
    body {
      background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%);
      color: #fff; font-family: 'Montserrat', sans-serif; padding: 60px;
    }
    h1 { font-size: 56px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
    h2 { font-size: 42px; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "lime-green",
    "colorful",
    `
    body {
      background: linear-gradient(135deg, #c6ff00 0%, #00e676 100%);
      color: #1a1a1a; font-family: 'Nunito', sans-serif; padding: 60px;
    }
    h1 { font-size: 54px; }
    h2 { font-size: 40px; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "candy-colors",
    "colorful",
    `
    body {
      background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
      color: #5d4037; font-family: 'Quicksand', sans-serif; padding: 60px;
    }
    h1 { font-size: 54px; color: #e91e63; }
    h2 { font-size: 40px; color: #9c27b0; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "sunset-vibes",
    "colorful",
    `
    body {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      color: #fff; font-family: 'Josefin Sans', sans-serif; padding: 60px;
    }
    h1 { font-size: 58px; }
    h2 { font-size: 44px; }
    ul { font-size: 30px; }
  `,
  ),

  createStyle(
    "aurora",
    "colorful",
    `
    body {
      background: linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%);
      color: #1a365d; font-family: 'Raleway', sans-serif; padding: 60px;
    }
    h1 { font-size: 54px; }
    h2 { font-size: 40px; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "fiesta",
    "colorful",
    `
    body {
      background: linear-gradient(135deg, #f857a6 0%, #ff5858 100%);
      color: #fff; font-family: 'Fredoka One', cursive; padding: 60px;
    }
    h1 { font-size: 60px; }
    h2 { font-size: 46px; }
    ul { font-size: 32px; }
  `,
  ),

  createStyle(
    "cosmic",
    "colorful",
    `
    body {
      background: linear-gradient(135deg, #7f00ff 0%, #e100ff 100%);
      color: #fff; font-family: 'Orbitron', sans-serif; padding: 60px;
    }
    h1 { font-size: 52px; text-shadow: 0 0 20px rgba(255,255,255,0.5); }
    h2 { font-size: 38px; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "mango-tango",
    "colorful",
    `
    body {
      background: linear-gradient(135deg, #ffe259 0%, #ffa751 100%);
      color: #5d4037; font-family: 'Nunito', sans-serif; padding: 60px;
    }
    h1 { font-size: 56px; color: #e65100; }
    h2 { font-size: 42px; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "grape-soda",
    "colorful",
    `
    body {
      background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
      color: #fff; font-family: 'Poppins', sans-serif; padding: 60px;
    }
    h1 { font-size: 56px; }
    h2 { font-size: 42px; color: #fde68a; }
    ul { font-size: 28px; }
  `,
  ),

  // ========================================
  // VINTAGE / RETRO (71-80)
  // ========================================
  createStyle(
    "retro-70s",
    "vintage",
    `
    body {
      background: #f4a460; color: #8b4513;
      font-family: 'Abril Fatface', cursive; padding: 60px;
    }
    h1 { font-size: 58px; color: #cd853f; }
    h2 { font-size: 42px; color: #d2691e; }
    ul { font-size: 28px; font-family: 'Georgia', serif; }
  `,
  ),

  createStyle(
    "paper-texture",
    "vintage",
    `
    body {
      background: #f5f5dc; color: #3e2723;
      font-family: 'Libre Baskerville', serif; padding: 60px;
    }
    h1 { font-size: 48px; }
    h2 { font-size: 34px; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "typewriter",
    "vintage",
    `
    body {
      background: #fffef0; color: #2c2c2c;
      font-family: 'Courier Prime', monospace; padding: 60px;
    }
    h1 { font-size: 44px; }
    h2 { font-size: 32px; }
    ul { font-size: 24px; }
    li { margin: 15px 0; }
  `,
  ),

  createStyle(
    "sepia-photo",
    "vintage",
    `
    body {
      background: linear-gradient(135deg, #d4a574 0%, #c2956e 100%);
      color: #3e2723; font-family: 'Playfair Display', serif; padding: 60px;
    }
    h1 { font-size: 52px; }
    h2 { font-size: 38px; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "art-deco",
    "vintage",
    `
    body {
      background: #1a1a2e; color: #d4af37;
      font-family: 'Poiret One', cursive; padding: 60px;
    }
    h1 { font-size: 56px; letter-spacing: 5px; border-bottom: 3px solid #d4af37; }
    h2 { font-size: 40px; }
    ul { font-size: 28px; color: #f0e6d3; }
  `,
  ),

  createStyle(
    "newspaper",
    "vintage",
    `
    body {
      background: #f5f5f0; color: #1a1a1a;
      font-family: 'Times New Roman', serif; padding: 60px;
      column-count: 1;
    }
    h1 { font-size: 48px; font-weight: 700; text-transform: uppercase; border-bottom: 2px solid #000; }
    h2 { font-size: 32px; font-style: italic; }
    ul { font-size: 24px; }
  `,
  ),

  createStyle(
    "polaroid",
    "vintage",
    `
    body {
      background: #e8dcc4; color: #4a4a4a;
      font-family: 'Patrick Hand', cursive; padding: 60px;
    }
    h1 { font-size: 52px; color: #8b4513; }
    h2 { font-size: 38px; }
    ul { font-size: 28px; background: #fff; padding: 30px; box-shadow: 5px 5px 15px rgba(0,0,0,0.2); }
  `,
  ),

  createStyle(
    "old-book",
    "vintage",
    `
    body {
      background: #f4ecd8; color: #2c1810;
      font-family: 'EB Garamond', serif; padding: 60px;
    }
    h1 { font-size: 50px; font-variant: small-caps; }
    h2 { font-size: 36px; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "vinyl-record",
    "vintage",
    `
    body {
      background: #1a1a1a; color: #f0e6d3;
      font-family: 'Righteous', cursive; padding: 60px;
    }
    h1 { font-size: 54px; color: #ff6b35; }
    h2 { font-size: 40px; color: #f7c59f; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "mid-century",
    "vintage",
    `
    body {
      background: #f7c59f; color: #2d3436;
      font-family: 'Josefin Sans', sans-serif; padding: 60px;
    }
    h1 { font-size: 52px; color: #d35400; }
    h2 { font-size: 38px; color: #16a085; }
    ul { font-size: 28px; }
  `,
  ),

  // ========================================
  // JAPANESE (81-90)
  // ========================================
  createStyle(
    "washi-paper",
    "japanese",
    `
    body {
      background: #f5f0e6; color: #3d3d3d;
      font-family: 'Noto Serif JP', serif; padding: 60px;
    }
    h1 { font-size: 48px; color: #8b0000; }
    h2 { font-size: 34px; color: #556b2f; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "sumi-ink",
    "japanese",
    `
    body {
      background: #f5f5f0; color: #1a1a1a;
      font-family: 'Noto Serif JP', serif; padding: 60px;
    }
    h1 { font-size: 52px; font-weight: 600; }
    h2 { font-size: 38px; }
    ul { font-size: 26px; border-left: 3px solid #1a1a1a; padding-left: 20px; }
  `,
  ),

  createStyle(
    "sakura-pink",
    "japanese",
    `
    body {
      background: linear-gradient(180deg, #fff5f5 0%, #ffd1dc 100%);
      color: #5d4037; font-family: 'Noto Sans JP', sans-serif; padding: 60px;
    }
    h1 { font-size: 50px; color: #d81b60; }
    h2 { font-size: 36px; color: #ec407a; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "matcha-green",
    "japanese",
    `
    body {
      background: #dce8d4; color: #2d4a22;
      font-family: 'Noto Serif JP', serif; padding: 60px;
    }
    h1 { font-size: 50px; color: #558b2f; }
    h2 { font-size: 36px; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "indigo-blue",
    "japanese",
    `
    body {
      background: #1a237e; color: #e8eaf6;
      font-family: 'Noto Sans JP', sans-serif; padding: 60px;
    }
    h1 { font-size: 52px; color: #fff; }
    h2 { font-size: 38px; color: #9fa8da; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "autumn-maple",
    "japanese",
    `
    body {
      background: linear-gradient(135deg, #8b0000 0%, #d2691e 100%);
      color: #fff8e7; font-family: 'Noto Serif JP', serif; padding: 60px;
    }
    h1 { font-size: 52px; }
    h2 { font-size: 38px; color: #ffd700; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "zen-garden",
    "japanese",
    `
    body {
      background: #e8e4d9; color: #4a4a4a;
      font-family: 'Noto Serif JP', serif; padding: 80px;
    }
    h1 { font-size: 46px; font-weight: 400; letter-spacing: 3px; }
    h2 { font-size: 32px; }
    ul { font-size: 24px; }
  `,
  ),

  createStyle(
    "ukiyo-e",
    "japanese",
    `
    body {
      background: #2e4057; color: #f4d06f;
      font-family: 'Noto Serif JP', serif; padding: 60px;
    }
    h1 { font-size: 50px; }
    h2 { font-size: 36px; color: #e8b4b8; }
    ul { font-size: 26px; color: #f0e6d3; }
  `,
  ),

  createStyle(
    "fuji-mountain",
    "japanese",
    `
    body {
      background: linear-gradient(180deg, #87ceeb 0%, #f5f5f5 60%, #556b2f 100%);
      color: #2d3436; font-family: 'Noto Sans JP', sans-serif; padding: 60px;
    }
    h1 { font-size: 52px; color: #1a237e; }
    h2 { font-size: 38px; }
    ul { font-size: 28px; background: rgba(255,255,255,0.8); padding: 25px; border-radius: 10px; }
  `,
  ),

  createStyle(
    "koi-pond",
    "japanese",
    `
    body {
      background: linear-gradient(135deg, #134e5e 0%, #71b280 100%);
      color: #fff; font-family: 'Noto Serif JP', serif; padding: 60px;
    }
    h1 { font-size: 52px; color: #ff6b6b; }
    h2 { font-size: 38px; color: #ffd700; }
    ul { font-size: 28px; }
  `,
  ),

  // ========================================
  // GEOMETRIC (91-100)
  // ========================================
  createStyle(
    "hexagon-pattern",
    "geometric",
    `
    body {
      background: #1a1a2e; color: #fff;
      font-family: 'Rajdhani', sans-serif; padding: 60px;
    }
    h1 { font-size: 54px; color: #00d9ff; }
    h2 { font-size: 40px; color: #ff6b6b; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "isometric",
    "geometric",
    `
    body {
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      color: #fff; font-family: 'Exo 2', sans-serif; padding: 60px;
    }
    h1 { font-size: 52px; }
    h2 { font-size: 38px; color: #f1c40f; }
    ul { font-size: 26px; }
  `,
  ),

  createStyle(
    "grid-modern",
    "geometric",
    `
    body {
      background: #fff; color: #333;
      font-family: 'Space Grotesk', sans-serif; padding: 60px;
      background-image: linear-gradient(#eee 1px, transparent 1px), linear-gradient(90deg, #eee 1px, transparent 1px);
      background-size: 40px 40px;
    }
    h1 { font-size: 56px; color: #e74c3c; }
    h2 { font-size: 42px; color: #3498db; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "triangles",
    "geometric",
    `
    body {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: #fff; font-family: 'Rajdhani', sans-serif; padding: 60px;
    }
    h1 { font-size: 58px; }
    h2 { font-size: 44px; }
    ul { font-size: 30px; }
  `,
  ),

  createStyle(
    "circles-overlap",
    "geometric",
    `
    body {
      background: #f5f5f5; color: #333;
      font-family: 'Nunito', sans-serif; padding: 60px;
    }
    h1 { font-size: 52px; color: #9c27b0; }
    h2 { font-size: 38px; color: #e91e63; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "diagonal-stripes",
    "geometric",
    `
    body {
      background: repeating-linear-gradient(45deg, #606dbc, #606dbc 10px, #465298 10px, #465298 20px);
      color: #fff; font-family: 'Montserrat', sans-serif; padding: 60px;
    }
    h1 { font-size: 54px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
    h2 { font-size: 40px; }
    ul { font-size: 28px; background: rgba(0,0,0,0.3); padding: 25px; border-radius: 10px; }
  `,
  ),

  createStyle(
    "bauhaus",
    "geometric",
    `
    body {
      background: #f5f5dc; color: #1a1a1a;
      font-family: 'Futura', 'Trebuchet MS', sans-serif; padding: 60px;
    }
    h1 { font-size: 60px; color: #e74c3c; }
    h2 { font-size: 44px; color: #3498db; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "polka-dots",
    "geometric",
    `
    body {
      background: #fff; color: #333;
      font-family: 'Quicksand', sans-serif; padding: 60px;
      background-image: radial-gradient(#ff6b6b 10%, transparent 10%);
      background-size: 30px 30px;
    }
    h1 { font-size: 52px; color: #e74c3c; }
    h2 { font-size: 38px; }
    ul { font-size: 28px; background: rgba(255,255,255,0.9); padding: 25px; }
  `,
  ),

  createStyle(
    "waves",
    "geometric",
    `
    body {
      background: linear-gradient(180deg, #0077b6 0%, #00b4d8 50%, #90e0ef 100%);
      color: #fff; font-family: 'Poppins', sans-serif; padding: 60px;
    }
    h1 { font-size: 56px; }
    h2 { font-size: 42px; }
    ul { font-size: 28px; }
  `,
  ),

  createStyle(
    "mondrian",
    "geometric",
    `
    body {
      background: #f5f5f5; color: #1a1a1a;
      font-family: 'Futura', sans-serif; padding: 60px;
      border-left: 30px solid #e74c3c;
      border-right: 30px solid #3498db;
    }
    h1 { font-size: 54px; }
    h2 { font-size: 40px; color: #f1c40f; }
    ul { font-size: 28px; }
  `,
  ),
];

// Style lookup by name
export const getMarkdownStyle = (styleName: string): MarkdownStyle | undefined => {
  return markdownStyles.find((s) => s.name === styleName);
};

// Get all style names
export const getMarkdownStyleNames = (): string[] => {
  return markdownStyles.map((s) => s.name);
};

// Get styles by category
export const getMarkdownStylesByCategory = (category: string): MarkdownStyle[] => {
  return markdownStyles.filter((s) => s.category === category);
};

// Get all categories
export const getMarkdownCategories = (): string[] => {
  return [...new Set(markdownStyles.map((s) => s.category))];
};
