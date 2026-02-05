import Fastify from "fastify";
import { initSchema } from "./db.js";
import { visitRoutes } from "./routes/visit.js";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "127.0.0.1";

async function main() {
    initSchema();

    const app = Fastify({
        logger: true,
    });

    await app.register(visitRoutes, { prefix: "/api" });

    await app.listen({ port: PORT, host: HOST });
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});

