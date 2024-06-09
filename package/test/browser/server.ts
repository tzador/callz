import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import callz from "../../src/callz";

const service = {
  ping: callz
    .describe("It pings")
    .request(z.literal("ping"))
    .reply(z.literal("pong"))
    .function(async () => "pong"),

  account: {
    new: callz
      .describe("It pings")
      .request(z.literal("ping"))
      .reply(z.literal("pong"))
      .function(async () => "pong"),
  },

  time: callz
    .request(z.string())
    .stream(z.number())
    .generator(async () =>
      (async function* () {
        for (let i = 0; i < 10000000000; i++) {
          yield Date.now();
          await new Promise((r) => setTimeout(r, 1000));
        }
      })(),
    ),
};

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
