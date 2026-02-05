# Astro Starter Kit: Blog

```sh
pnpm create astro@latest -- --template blog
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and OpenGraph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── src/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`             | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

## Footer 방문 통계(Today/Total)

이 프로젝트는 Astro SSG를 유지하면서, 별도 Fastify 서버(`server/`) + SQLite로 방문 통계를 집계해 푸터에 표시합니다.

### 로컬 개발 실행

- 백엔드(터미널 1):
  - `pnpm --dir server install`
  - `pnpm --dir server dev` (기본 `http://127.0.0.1:3000`)
- 프론트(터미널 2):
  - `pnpm install`
  - `pnpm dev`

Astro dev 서버는 `astro.config.mjs`의 proxy 설정으로 `/api/*` 요청을 백엔드로 프록시합니다.

### 서버 환경변수(선택)

- `DB_PATH`: SQLite 파일 경로 (기본: `server/data/visits.sqlite`)
- `PORT`: 서버 포트 (기본: `3000`)
- `HOST`: 바인딩 호스트 (기본: `127.0.0.1`)

### 배포(EC2) 요약

- Nginx(또는 Caddy)에서 `/api/`는 Fastify로 프록시, 그 외는 `dist/` 정적 파일 서빙
- 서버는 systemd 또는 pm2로 상시 실행

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
