// @ts-check

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import react from "@astrojs/react";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgVersion =
    JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8")).version ??
    "0.0.1";

// https://astro.build/config
export default defineConfig({
    site: "https://dohyeon.kr",
    integrations: [mdx(), sitemap(), react()],
    vite: {
        envPrefix: ["VITE_", "RELEASE_"],
        define: {
            __PKG_VERSION__: JSON.stringify(pkgVersion),
        },
        // @ts-ignore
        plugins: [tailwindcss()],
        server: {
            proxy: {
                // 로컬 개발에서 Astro(4321/4322) → Fastify(3000)로 /api 요청을 프록시
                "/api": "http://127.0.0.1:3000",
            },
        },
    },
});
