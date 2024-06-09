<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sakura.css/css/sakura.css" type="text/css">

# CallZ

Awesome, Typesafe, Zod powered RPC, with streaming support.

```typescript
// server.ts
import { z } from "zod";
import callz from "callz";

const service = {
  ping: callz
    .doc("It pings")
    .request(z.literal("ping"))
    .reply(z.literal("pong"))
    .function(() => "pong"),
  clock: callz
    .request(z.null())
    .stream(z.union([z.literal("tick"), z.literal("tack")]))
    .generator(async () => {
      return (async function* () {
        for (let i = 0; i < 100; i++) {
          yield new Date().getMilliseconds();
        }
      })();
    }),
  fails: callz
    .doc("It fails")
    .request(z.null())
    .reply(z.null())
    .function(() => throw callz.error("catastrophy"))
};


// Example below is using Hono, but you can use any server you like:
import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get("/callz", async (c) => {
  return c.text("ok");
});

app.post("/callz/*", async (c) => {
  return await callz.server(c.req.raw, service);
});

serve({ fetch: app.fetch, port: 9000 }, () => {
  console.log("CallZ server ready on http://localhost:9000/callz");
});
```

```typescript
// client.ts
import type { service } from ".../server.ts";

const client = callz.client<typeof service>("http://localhost:3000");

const pong = await client.ping(); // pong === "pong"

for await (const time of await client.clock()) {
  console.log(time);
}
```
