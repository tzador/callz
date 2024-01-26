import { expect, test } from "vitest";
import { z } from "zod";
import {
  CallzError,
  callzClient,
  callzServer,
  callzFetcher,
  callzService
} from "../src/callz.ts";

const service = callzService({
  add: {
    req: z.object({ a: z.number(), b: z.number() }),
    res: z.number()
  },
  swap: {
    req: z.object({
      a: z.string(),
      b: z.string()
    }),
    res: z.object({
      b: z.string(),
      a: z.string()
    })
  },
  fail: {
    req: z.undefined(),
    res: z.undefined()
  }
});

const server = callzServer(service, {
  add: (req) => {
    return req.a + req.b;
  },
  swap: (req) => {
    return { a: req.b, b: req.a };
  },
  fail: () => {
    throw new CallzError("test_error");
  }
});

import { Hono, type Context } from "hono";
import { serve } from "@hono/node-server";

test("hono web server", async () => {
  const app = new Hono();

  app.post("/callz/:method", async (c: Context) => {
    return c.json(await server(c.req.raw));
  });

  const s = serve({ fetch: app.fetch, port: 5566 });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const client = callzClient(service, "http://localhost:5566/callz");

  const res = await client.add({ a: 2, b: 2 });
  console.log(res);

  await new Promise<Error | undefined>((resolve) => {
    s.close(resolve);
  });
});
