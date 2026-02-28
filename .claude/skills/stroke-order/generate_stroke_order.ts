#!/usr/bin/env npx tsx

/**
 * KanjiVG Stroke Order MulmoScript Generator
 *
 * Fetches stroke data from KanjiVG (https://github.com/KanjiVG/kanjivg)
 * and generates a MulmoScript JSON file with animated stroke order beats.
 *
 * Usage:
 *   npx tsx generate_stroke_order.ts <characters> [output_path] [--readings on1/kun1,on2/kun2]
 *
 * Examples:
 *   npx tsx generate_stroke_order.ts あいうえお my-scripts/test_stroke_order_hiragana.json
 *   npx tsx generate_stroke_order.ts abcdefg my-scripts/test_stroke_order_alphabet.json
 *   npx tsx generate_stroke_order.ts 漢字 output.json --readings "カン/-,ジ/あざ"
 *   npx tsx generate_stroke_order.ts 山 output.json --readings "サン・セン/やま"
 *
 * License: KanjiVG data is CC BY-SA 3.0 (https://github.com/KanjiVG/kanjivg)
 */

import * as fs from "fs";
import * as path from "path";

const KANJIVG_BASE_URL = "https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji";

const STROKE_COLOR = "#dc2626"; // red-600 — all strokes use the same color
const GHOST_COLOR = "#9ca3af";  // gray-400

// Hiragana to romaji mapping
const HIRAGANA_ROMAJI: Record<string, string> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", ゐ: "wi", ゑ: "we", を: "wo", ん: "n",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  だ: "da", ぢ: "di", づ: "du", で: "de", ど: "do",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
};

// Katakana to romaji mapping
const KATAKANA_ROMAJI: Record<string, string> = {
  ア: "a", イ: "i", ウ: "u", エ: "e", オ: "o",
  カ: "ka", キ: "ki", ク: "ku", ケ: "ke", コ: "ko",
  サ: "sa", シ: "shi", ス: "su", セ: "se", ソ: "so",
  タ: "ta", チ: "chi", ツ: "tsu", テ: "te", ト: "to",
  ナ: "na", ニ: "ni", ヌ: "nu", ネ: "ne", ノ: "no",
  ハ: "ha", ヒ: "hi", フ: "fu", ヘ: "he", ホ: "ho",
  マ: "ma", ミ: "mi", ム: "mu", メ: "me", モ: "mo",
  ヤ: "ya", ユ: "yu", ヨ: "yo",
  ラ: "ra", リ: "ri", ル: "ru", レ: "re", ロ: "ro",
  ワ: "wa", ヲ: "wo", ン: "n",
  ガ: "ga", ギ: "gi", グ: "gu", ゲ: "ge", ゴ: "go",
  ザ: "za", ジ: "ji", ズ: "zu", ゼ: "ze", ゾ: "zo",
  ダ: "da", ヂ: "di", ヅ: "du", デ: "de", ド: "do",
  バ: "ba", ビ: "bi", ブ: "bu", ベ: "be", ボ: "bo",
  パ: "pa", ピ: "pi", プ: "pu", ペ: "pe", ポ: "po",
};

type CharType = "hiragana" | "katakana" | "kanji" | "latin";

interface KanjiReading {
  onyomi?: string;   // e.g., "カン" or "カン・ガン"
  kunyomi?: string;  // e.g., "みず" or "やま"
}

function getCharType(char: string): CharType {
  const code = char.codePointAt(0)!;
  if (code >= 0x3041 && code <= 0x3096) return "hiragana";
  if (code >= 0x30a1 && code <= 0x30f6) return "katakana";
  if (code >= 0x0041 && code <= 0x007a) return "latin";
  return "kanji";
}

function getCodepoint(char: string): string {
  return char.codePointAt(0)!.toString(16).padStart(5, "0");
}

function getRomaji(char: string): string | undefined {
  return HIRAGANA_ROMAJI[char] ?? KATAKANA_ROMAJI[char];
}

function katakanaToRomaji(text: string): string {
  return [...text].map((c) => KATAKANA_ROMAJI[c] ?? c).join("");
}

function getCharId(char: string): string {
  const type = getCharType(char);
  if (type === "latin") return `char_${char}`;
  const romaji = getRomaji(char);
  if (romaji) return `char_${romaji}`;
  return `char_${getCodepoint(char)}`;
}

async function fetchStrokes(char: string): Promise<string[]> {
  const codepoint = getCodepoint(char);
  const url = `${KANJIVG_BASE_URL}/${codepoint}.svg`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch KanjiVG for '${char}' (U+${codepoint.toUpperCase()}): HTTP ${response.status}\nURL: ${url}`);
  }
  const svg = await response.text();

  // Extract path elements with stroke IDs
  // KanjiVG path format: <path id="kvg:XXXXX-sN" ... d="..." .../>
  const strokes: [number, string][] = [];
  const pathRegex = /<path\b[^>]*>/g;
  let match;
  while ((match = pathRegex.exec(svg)) !== null) {
    const pathTag = match[0];
    // Check if this is a stroke path (has kvg:XXXXX-sN id, NOT kvg:XXXXX-sN-... variants)
    const idMatch = pathTag.match(/id="kvg:[^"]*-s(\d+)"/);
    if (!idMatch) continue;
    // Skip sub-paths like kvg:XXXXX-s1-g1
    const fullIdMatch = pathTag.match(/id="(kvg:[^"]*)"/);
    if (fullIdMatch && /kvg:[^-]+-s\d+-/.test(fullIdMatch[1])) continue;

    const strokeNum = parseInt(idMatch[1]);
    const dMatch = pathTag.match(/\bd="([^"]+)"/);
    if (!dMatch) continue;
    strokes.push([strokeNum, dMatch[1]]);
  }

  strokes.sort((a, b) => a[0] - b[0]);

  if (strokes.length === 0) {
    throw new Error(`No strokes found in KanjiVG for '${char}' (U+${codepoint.toUpperCase()})`);
  }

  return strokes.map((s) => s[1]);
}

const EXTRA_DURATION = 1;          // extra seconds added to base duration
const FIRST_STROKE_DELAY = 0.5;    // seconds — pause before first stroke starts
const FPS = 30;

function calcTiming(strokeCount: number): {
  duration: number;
  starts: number[];
  durs: number[];
} {
  // Duration lookup: 1→4s, 2-3→5s, 4-5→6s, 6+→formula
  const baseDuration =
    strokeCount <= 1 ? 4 :
    strokeCount <= 3 ? 5 :
    strokeCount <= 5 ? 6 :
    Math.min(10, 3 + Math.ceil(strokeCount * 0.6));
  const duration = baseDuration + EXTRA_DURATION;
  const totalFrames = duration * FPS;
  const startDelay = (strokeCount === 1 ? 15 : 12) + Math.round(FIRST_STROKE_DELAY * FPS);
  const endPadding = 15;
  const animRange = totalFrames - startDelay - endPadding;
  const strokeInterval = animRange / strokeCount;

  const starts: number[] = [];
  const durs: number[] = [];
  for (let i = 0; i < strokeCount; i++) {
    starts.push(Math.round(startDelay + i * strokeInterval));
    durs.push(Math.round(strokeInterval * 0.8));
  }

  return { duration, starts, durs };
}

function buildCharBeat(
  char: string,
  strokes: string[],
  charType: CharType,
  reading?: KanjiReading,
): Record<string, unknown> {
  const strokeCount = strokes.length;
  const { duration, starts, durs } = calcTiming(strokeCount);

  // Build SVG ghost paths and animated paths
  const svgLines: string[] = [
    "  <svg viewBox='0 0 109 109' width='420' height='420'>",
    "    <rect x='3' y='3' width='103' height='103' rx='4' fill='none' stroke='#d6d3d1' stroke-width='0.5'/>",
    "    <line x1='54.5' y1='5' x2='54.5' y2='104' stroke='#d6d3d1' stroke-width='0.3' stroke-dasharray='2'/>",
    "    <line x1='5' y1='54.5' x2='104' y2='54.5' stroke='#d6d3d1' stroke-width='0.3' stroke-dasharray='2'/>",
  ];

  // Ghost paths
  for (const d of strokes) {
    svgLines.push(
      `    <path d='${d}' stroke='${GHOST_COLOR}' fill='none' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/>`,
    );
  }

  // Animated paths
  for (let i = 0; i < strokeCount; i++) {
    svgLines.push(
      `    <path id='s${i + 1}' d='${strokes[i]}' stroke='${STROKE_COLOR}' fill='none' stroke-width='4' stroke-linecap='round' stroke-linejoin='round' stroke-dasharray='400' stroke-dashoffset='400'/>`,
    );
  }

  svgLines.push("  </svg>");

  // Label
  const romaji = getRomaji(char);
  let labelLines: string[];
  if (charType === "latin") {
    labelLines = [`  <p class='text-5xl text-stone-800 font-bold mt-2'>${char}</p>`];
  } else if (romaji) {
    labelLines = [
      "  <div class='flex items-baseline gap-3 mt-2'>",
      `    <p class='text-5xl text-stone-800 font-bold'>${char}</p>`,
      `    <p class='text-2xl text-stone-500'>${romaji}</p>`,
      "  </div>",
    ];
  } else if (reading && (reading.onyomi || reading.kunyomi)) {
    // Kanji with on/kun reading
    const readingParts: string[] = [];
    if (reading.onyomi) {
      readingParts.push(`    <p class='text-xl text-stone-600'>音 ${reading.onyomi}</p>`);
    }
    if (reading.kunyomi) {
      readingParts.push(`    <p class='text-xl text-stone-500'>訓 ${reading.kunyomi}</p>`);
    }
    labelLines = [
      "  <div class='flex flex-col items-center mt-2'>",
      `    <p class='text-5xl text-stone-800 font-bold'>${char}</p>`,
      `    <div class='flex gap-4 mt-1'>`,
      ...readingParts,
      "    </div>",
      "  </div>",
    ];
  } else {
    labelLines = [`  <p class='text-5xl text-stone-800 font-bold mt-2'>${char}</p>`];
  }

  const html = [
    "<div class='h-full flex flex-col items-center justify-center bg-amber-50'>",
    ...svgLines,
    ...labelLines,
    "</div>",
  ];

  // Animation script
  let script: string[];
  if (strokeCount === 1) {
    script = [
      "function render(frame, totalFrames, fps) {",
      `  document.getElementById('s1').style.strokeDashoffset = interpolate(frame, {input:{inMin:${starts[0]},inMax:${starts[0] + durs[0]}},output:{outMin:400,outMax:0},easing:'easeInOut'});`,
      "}",
    ];
  } else {
    script = [
      "function render(frame, totalFrames, fps) {",
      `  var starts = [${starts.join(", ")}]; var durs = [${durs.join(", ")}];`,
      `  for (var i = 0; i < ${strokeCount}; i++) {`,
      "    document.getElementById('s'+(i+1)).style.strokeDashoffset = interpolate(frame, {input:{inMin:starts[i],inMax:starts[i]+durs[i]},output:{outMin:400,outMax:0},easing:'easeInOut'});",
      "  }",
      "}",
    ];
  }

  // Speech text: use readings if provided for kanji
  let text: string;
  if (charType === "latin") {
    text = `${char}.`;
  } else if (reading && (reading.onyomi || reading.kunyomi)) {
    // Build speech: "音読み、カン。訓読み、みず。"
    const parts: string[] = [];
    if (reading.onyomi) parts.push(`音読み、${reading.onyomi}`);
    if (reading.kunyomi) parts.push(`訓読み、${reading.kunyomi}`);
    text = parts.join("。") + "。";
  } else {
    text = `${char}。`;
  }

  return {
    id: getCharId(char),
    speaker: "Presenter",
    text,
    duration,
    image: {
      type: "html_tailwind",
      html,
      script,
      animation: true,
    },
  };
}

function detectPrimaryType(chars: string[]): CharType {
  const types = chars.map(getCharType);
  if (types.every((t) => t === "latin")) return "latin";
  if (types.every((t) => t === "hiragana")) return "hiragana";
  if (types.every((t) => t === "katakana")) return "katakana";
  if (types.some((t) => t === "kanji")) return "kanji";
  return "hiragana";
}

function buildIntro(chars: string[], primaryType: CharType): Record<string, unknown> {
  let titleText: string;
  let subtitleText: string;
  let speechText: string;

  switch (primaryType) {
    case "latin":
      titleText = "Stroke Order";
      subtitleText = chars.join(" ");
      speechText = "Let's learn how to write the alphabet!";
      break;
    case "hiragana":
      titleText = "書き順";
      subtitleText = chars.join(" ");
      speechText = "ひらがなの書き順を学びましょう！";
      break;
    case "katakana":
      titleText = "書き順";
      subtitleText = chars.join(" ");
      speechText = "カタカナの書き順を学びましょう！";
      break;
    case "kanji":
      titleText = "書き順";
      subtitleText = chars.join(" ");
      speechText = "漢字の書き順を学びましょう！";
      break;
  }

  return {
    id: "intro",
    speaker: "Presenter",
    text: speechText,
    duration: primaryType === "latin" ? 3 : 4,
    image: {
      type: "html_tailwind",
      html: [
        "<div class='h-full flex flex-col items-center justify-center bg-amber-50'>",
        `  <p class='text-5xl font-bold text-stone-800 mb-4'>${titleText}</p>`,
        `  <p class='text-4xl text-stone-600'>${subtitleText}</p>`,
        "  <p class='text-sm text-stone-400 mt-8'>Stroke data: KanjiVG (CC BY-SA 3.0)</p>",
        "</div>",
      ],
    },
  };
}

function buildTitle(chars: string[], primaryType: CharType): string {
  switch (primaryType) {
    case "latin": {
      const first = chars[0];
      const last = chars[chars.length - 1];
      return chars.length > 1 ? `Stroke Order: Alphabet ${first}-${last}` : `Stroke Order: ${first}`;
    }
    case "hiragana":
      return `書き順：ひらがな ${chars[0]}〜${chars[chars.length - 1]}`;
    case "katakana":
      return `書き順：カタカナ ${chars[0]}〜${chars[chars.length - 1]}`;
    case "kanji":
      return `書き順：${chars.join("")}`;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: npx tsx generate_stroke_order.ts <characters> [output_path] [--readings on1/kun1,on2/kun2]");
    console.error("");
    console.error("Examples:");
    console.error("  npx tsx generate_stroke_order.ts あいうえお");
    console.error('  npx tsx generate_stroke_order.ts abcdefg my-scripts/test_stroke_order_alphabet.json');
    console.error('  npx tsx generate_stroke_order.ts 漢字 output.json --readings "カン/-,ジ/あざ"');
    console.error("");
    console.error("Readings format: onyomi/kunyomi per char, comma-separated. Use - for none.");
    process.exit(1);
  }

  // Parse --readings option
  const readingsIdx = args.indexOf("--readings");
  let readingsArg: string | undefined;
  if (readingsIdx >= 0) {
    readingsArg = args[readingsIdx + 1];
    args.splice(readingsIdx, 2);
  }

  const inputChars = args[0];
  const chars = [...inputChars]; // Properly split into characters (handles Unicode)

  // Parse readings: "カン/-,ジ/あざ" → KanjiReading[]
  const readings: (KanjiReading | undefined)[] = [];
  if (readingsArg) {
    const entries = readingsArg.split(",");
    for (const entry of entries) {
      const [on, kun] = entry.trim().split("/");
      readings.push({
        onyomi: on && on !== "-" ? on : undefined,
        kunyomi: kun && kun !== "-" ? kun : undefined,
      });
    }
  }

  const primaryType = detectPrimaryType(chars);
  const isJapanese = primaryType !== "latin";
  const lang = isJapanese ? "ja" : "en";

  // Default output path
  let outputPath = args[1];
  if (!outputPath || outputPath.startsWith("--")) {
    outputPath = undefined as unknown as string;
  }
  if (!outputPath) {
    const scriptsDir = process.env.MULMO_SCRIPTS_DIR ?? "my-scripts";
    let slug: string;
    switch (primaryType) {
      case "latin":
        slug = `alphabet_${chars[0]}_${chars[chars.length - 1]}`;
        break;
      case "hiragana":
        slug = `hiragana_${chars.map((c) => HIRAGANA_ROMAJI[c] ?? getCodepoint(c)).join("_")}`;
        break;
      case "katakana":
        slug = `katakana_${chars.map((c) => KATAKANA_ROMAJI[c] ?? getCodepoint(c)).join("_")}`;
        break;
      default:
        // Use onyomi romaji if readings provided, otherwise use characters directly
        slug = chars
          .map((c, i) => {
            const reading = readings[i];
            if (reading?.onyomi) {
              const firstOnyomi = reading.onyomi.split("・")[0];
              return katakanaToRomaji(firstOnyomi);
            }
            return c;
          })
          .join("_");
    }
    // Truncate slug if too long
    if (slug.length > 60) {
      slug = slug.substring(0, 60);
    }
    outputPath = `${scriptsDir}/test_stroke_order_${slug}.json`;
  }

  console.log(`Characters: ${chars.join(" ")} (${primaryType})`);
  console.log(`Output: ${outputPath}`);
  console.log("");

  // Fetch stroke data for all characters
  const strokeData: Map<string, string[]> = new Map();
  for (const char of chars) {
    process.stdout.write(`Fetching KanjiVG for '${char}' (U+${getCodepoint(char).toUpperCase()})... `);
    try {
      const strokes = await fetchStrokes(char);
      strokeData.set(char, strokes);
      console.log(`${strokes.length} strokes`);
    } catch (e) {
      console.error(`FAILED: ${(e as Error).message}`);
      process.exit(1);
    }
  }

  console.log("");

  // Build MulmoScript
  const intro = buildIntro(chars, primaryType);
  const charBeats = chars.map((char, i) => {
    const strokes = strokeData.get(char)!;
    const charType = getCharType(char);
    const reading = readings[i];
    return buildCharBeat(char, strokes, charType, reading);
  });

  const displayName = isJapanese ? { ja: "先生" } : { en: "Presenter" };

  const mulmoScript = {
    $mulmocast: { version: "1.1" },
    lang,
    title: buildTitle(chars, primaryType),
    canvasSize: { width: 720, height: 720 },
    speechParams: {
      speakers: {
        Presenter: { voiceId: "shimmer", displayName },
      },
    },
    beats: [intro, ...charBeats],
  };

  // Write output
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(mulmoScript, null, 2) + "\n");

  console.log(`Generated: ${outputPath}`);
  console.log(`Characters: ${chars.length}, Total beats: ${mulmoScript.beats.length}`);
  console.log("");
  console.log("Next steps:");
  console.log(`  yarn audio ${outputPath}`);
  console.log(`  yarn movie ${outputPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
