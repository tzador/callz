import { z } from "zod";
import { z_client, z_method, z_service, z_server } from "../src/main.ts";
import { serve } from "@hono/node-server";
import { Hono, type Context } from "hono";

const test_service = z_service({
  add: z_method({
    req: z.object({
      a: z.number(),
      b: z.number()
    }),
    res: z.number()
  })
});

const test_server = z_server();

test_server.on(test_service.add, (req) => {
  return req.a + req.b;
});

const app = new Hono();

app.post("/zcalls/:method", async (c: Context) => {
  return test_server.handle(c.req.raw);
});

serve(app, async (info) => {
  console.log(`Hono listening on http://localhost:${info.port}`);

  const test_client = z_client("http://localhost:3000/zcalls");

  const res = await test_client(test_service.add, { a: 2, b: 2 });
  console.log(res);
});
