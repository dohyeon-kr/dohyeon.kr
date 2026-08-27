import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import satori from "satori";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 630;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "scripts", "thumbnail-manifest.json");
const outputDirectory = path.join(root, "themes", "monoliquid", "assets", "images", "generated-thumbnails");
const checkOnly = process.argv.includes("--check");

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

async function loadFonts() {
  const regular = await fs.readFile(path.join(root, "scripts", "thumbnail-fonts", "Pretendard-Regular.woff"));
  const bold = await fs.readFile(path.join(root, "scripts", "thumbnail-fonts", "Pretendard-Bold.woff"));
  return [
    { name: "Pretendard", data: regular, weight: 400, style: "normal" },
    { name: "Pretendard", data: bold, weight: 700, style: "normal" },
  ];
}

function thumbnailTree({ title, category }) {
  const children = [];
  if (category) {
    children.push({
      type: "div",
      key: "category",
      props: {
        style: { fontSize: 48, color: "#64748b", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.1em" },
        children: truncate(category, 30),
      },
    });
  }
  children.push({
    type: "div",
    key: "title",
    props: {
      style: { fontSize: 80, fontWeight: 700, color: "#1e293b", lineHeight: 1.3, maxWidth: "100%", overflow: "hidden", display: "flex", flexWrap: "wrap" },
      children: truncate(title, 60),
    },
  });
  return {
    type: "div",
    props: {
      style: {
        width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "60px 80px",
        background: "linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 50%, #cbd5e1 100%)", fontFamily: "Atkinson",
      },
      children,
    },
  };
}

const posts = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const fonts = await loadFonts();
const seenSlugs = new Set();
if (!checkOnly) await fs.mkdir(outputDirectory, { recursive: true });

for (const post of posts) {
  if (typeof post.slug !== "string" || !/^[a-z0-9-]+$/.test(post.slug) || seenSlugs.has(post.slug) || typeof post.title !== "string" || typeof post.category !== "string") {
    throw new Error(`Invalid thumbnail manifest entry: ${JSON.stringify(post)}`);
  }
  seenSlugs.add(post.slug);
  const svg = await satori(thumbnailTree(post), { width: WIDTH, height: HEIGHT, fonts });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const outputPath = path.join(outputDirectory, `${post.slug}.png`);
  if (checkOnly) {
    const existing = await fs.readFile(outputPath);
    if (!existing.equals(png)) throw new Error(`Generated thumbnail is stale: ${post.slug}`);
  } else {
    await fs.writeFile(outputPath, png, { mode: 0o644 });
  }
}

console.log(`${checkOnly ? "Verified" : "Generated"} ${posts.length} thumbnails.`);
