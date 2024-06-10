import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import callz from "../src/callz";
import { z } from "zod";

const service = callz.service({
  ping: callz.method
    .request(z.literal("ping"))
    .result(z.literal("pong"))
    .implementation(async () => "pong"),

  time: callz.stream
    .request(z.literal("what is the time?"))
    .message(z.number())
    .implementation(async (request, emit) => {
      await emit(Date.now());
      await new Promise((r) => setTimeout(r, 1000));
      await emit(Date.now());
    }),
});

export type Service = typeof service;

const app = new Hono();

app.use("*", cors());

app.get("/callz", async (c) => {
  return c.text("ok");
});

app.post("/callz/*", async (c) => {
  return await callz.server(service, c.req.raw);
});

serve({ fetch: app.fetch, port: 9000 }, () => {
  console.log("Hono server ready");
});
