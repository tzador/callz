import { expect, test } from "vitest";
import { callzClient, callzHandler } from "../src/callz.ts";

import { Hono, type Context } from "hono";
import { serve } from "@hono/node-server";

import * as service from "./test-service.ts";

test("hono web server", async () => {
  const app = new Hono();

  app.post("/callz/:method", async (c: Context) => {
    return await callzHandler(service)(c.req.raw);
  });

  const s = serve({ fetch: app.fetch, port: 5566 });
  await new Promise((resolve) => setTimeout(resolve, 100));

  const client = callzClient("http://localhost:5566/callz");

  const res = await client.add({ a: 2, b: 2 });
  expect(res).toBe(4);

  await new Promise<Error | undefined>((resolve) => {
    s.close(resolve);
  });
});
