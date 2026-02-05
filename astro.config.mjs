// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
    site: 'https://dohyeon.kr',
    integrations: [mdx(), sitemap(), react()],
    vite: {
        // @ts-ignore
        plugins: [tailwindcss()],
        server: {
            proxy: {
                // 로컬 개발에서 Astro(4321/4322) → Fastify(3000)로 /api 요청을 프록시
                '/api': 'http://127.0.0.1:3000',
            },
        },
    },
});