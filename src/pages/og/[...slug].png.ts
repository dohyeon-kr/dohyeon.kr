import { getCollection } from "astro:content";
import fs from "node:fs/promises";
import path from "node:path";
import React from "react";
import satori from "satori";
import sharp from "sharp";
import type { APIRoute } from "astro";

const WIDTH = 1200;
const HEIGHT = 630;

async function loadFonts() {
    const fontPath = path.join(
        process.cwd(),
        "public",
        "fonts",
        "Pretendard-Regular.woff"
    );

    const fontBoldPath = path.join(
        process.cwd(),
        "public",
        "fonts",
        "Pretendard-Bold.woff"
    );

    const fontData = await fs.readFile(fontPath);
    const fontBoldData = await fs.readFile(fontBoldPath);
    return [
        {
            name: "Pretendard",
            data: fontData,
            weight: 400 as const,
            style: "normal" as const,
        },
        {
            name: "Pretendard",
            data: fontBoldData,
            weight: 700 as const,
            style: "normal" as const,
        },
    ];
}

function truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 1) + "…";
}

export const GET: APIRoute = async function get({ params }) {
    const slug = params?.slug;
    if (!slug) return new Response("Not found", { status: 404 });

    const posts = await getCollection("blog");
    const post = posts.find((p) => p.id === slug && !p.data.WIP);
    if (!post) return new Response("Not found", { status: 404 });

    const { title, category } = post.data;
    const fonts = await loadFonts();

    const svg = await satori(
        React.createElement(
            "div",
            {
                style: {
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    padding: "60px 80px",
                    background:
                        "linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 50%, #cbd5e1 100%)",
                    fontFamily: "Atkinson",
                },
            },
            ...(category
                ? [
                      React.createElement(
                          "div",
                          {
                              key: "category",
                              style: {
                                  fontSize: 48,
                                  color: "#64748b",
                                  marginBottom: 16,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.1em",
                              },
                          },
                          truncate(category, 30)
                      ),
                  ]
                : []),
            React.createElement(
                "div",
                {
                    key: "title",
                    style: {
                        fontSize: 80,
                        fontWeight: 700,
                        color: "#1e293b",
                        lineHeight: 1.3,
                        maxWidth: "100%",
                        overflow: "hidden",
                        display: "flex",
                        flexWrap: "wrap",
                    },
                },
                truncate(title, 60)
            )
        ),
        {
            width: WIDTH,
            height: HEIGHT,
            fonts,
        }
    );

    const png = await sharp(Buffer.from(svg)).png().toBuffer();

    return new Response(Buffer.from(png), {
        headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
        },
    });
};

export async function getStaticPaths() {
    const posts = await getCollection("blog");
    const slugs = posts
        .filter((p) => !p.data.WIP)
        .map((p) => ({ params: { slug: p.id } }));
    return slugs;
}
