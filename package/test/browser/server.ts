import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "../../src/index";

const service = z.service({
  ping: z
    .sync("")
    .args(z.literal("ping"))
    .returns(z.literal("pong"))
    .implement(() => "pong"),
});

export type Service = typeof service;

const app = new Hono();

app.use("*", cors());

app.get("/callz", async (c) => {
  return c.text("ok");
});

app.post("/callz/*", async (c) => {
  return await callz.server(c.req.raw, service);
});

serve({ fetch: app.fetch, port: 9000 }, () => {
  console.log("Hono server ready");
});
