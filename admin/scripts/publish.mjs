import { cp, mkdir } from "node:fs/promises";
// Keep hashed assets from older builds so open dashboard tabs remain usable.
await mkdir("../themes/monoliquid/assets/dashboard", { recursive: true });
await cp("dist", "../themes/monoliquid/assets/dashboard", { recursive: true });
