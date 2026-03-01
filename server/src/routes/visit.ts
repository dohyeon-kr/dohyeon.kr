import type { FastifyPluginAsync } from "fastify";
import {
    getPostViewStats,
    getVisitStats,
    incrementPostView,
    incrementVisit,
} from "../db.js";

export const visitRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get("/visit", async () => {
        return getVisitStats();
    });

    fastify.post("/visit", async () => {
        return incrementVisit();
    });

    fastify.get<{ Params: { slug: string } }>("/visit/post/:slug", async (req) => {
        return getPostViewStats(req.params.slug);
    });

    fastify.post<{ Params: { slug: string } }>(
        "/visit/post/:slug",
        async (req) => {
            return incrementPostView(req.params.slug);
        }
    );
};

