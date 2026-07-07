import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const SRC = "./upload/Gemini_Generated_Image_c2e984c2e984c2e9.png";
const OUTDIR = "./public/chess-logos";

const buf = fs.readFileSync(SRC);
const b64 = buf.toString("base64");
const dataUrl = `data:image/png;base64,${b64}`;

// Safer prompts focusing on chess pieces and abstract tournament imagery
// (avoiding people silhouettes which trigger content filters).
const edits = [
  {
    name: "light-1.png",
    prompt:
      "Elegant chess-themed circular emblem: a single ornate chess knight piece in dark mahogany brown, centered on a warm cream and parchment colored circular background with a subtle chess-board pattern. A small gold crown floats above. Refined tournament aesthetic, warm amber and honey tones. No watermarks, no text. Clean, minimal, high contrast, suitable for a light-mode UI hero logo.",
  },
  {
    name: "light-2.png",
    prompt:
      "Elegant chess-themed circular emblem: a chess queen piece in dark walnut brown with a golden crown, on a soft maple and ivory circular background with faint chess squares. Warm honey and bronze tones. Refined tournament aesthetic. No watermarks, no text. Clean, minimal, high contrast, suitable for a light-mode UI hero logo.",
  },
  {
    name: "dark-1.png",
    prompt:
      "Moody chess-themed circular emblem: a single ornate chess knight piece in luminous gold and amber, on a deep charcoal-brown and black circular background with subtle dark chess-board pattern. Dramatic, atmospheric tournament study aesthetic. Luminous gold on near-black. No watermarks, no text. Clean, minimal, high contrast, suitable for a dark-mode UI hero logo.",
  },
  {
    name: "dark-2.png",
    prompt:
      "Moody chess-themed circular emblem: a chess queen piece in warm ivory and cream with a glowing crown, on a deep mahogany and near-black circular background with subtle dark chess squares. Luminous ivory on dark. Atmospheric tournament study aesthetic. No watermarks, no text. Clean, minimal, high contrast, suitable for a dark-mode UI hero logo.",
  },
];

async function main() {
  const zai = await ZAI.create();
  fs.mkdirSync(OUTDIR, { recursive: true });

  for (const e of edits) {
    try {
      console.log(`Generating ${e.name}...`);
      const res = await zai.images.generations.edit({
        prompt: e.prompt,
        images: [{ url: dataUrl }],
        size: "1024x1024",
      });
      const out = Buffer.from(res.data[0].base64, "base64");
      const p = path.join(OUTDIR, e.name);
      fs.writeFileSync(p, out);
      console.log(`  ✓ saved ${p} (${out.length} bytes)`);
    } catch (err) {
      console.error(`  ✗ ${e.name} failed:`, err.message);
    }
  }
}

main();
