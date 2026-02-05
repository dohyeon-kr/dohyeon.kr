import type { FastifyPluginAsync } from "fastify";
import { getVisitStats, incrementVisit } from "../db.js";

export const visitRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get("/visit", async () => {
        return getVisitStats();
    });

    fastify.post("/visit", async () => {
        return incrementVisit();
    });
};

