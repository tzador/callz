<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sakura.css/css/sakura.css" type="text/css">

# CallZ

Awesome, Typesafe, Zod powered RPC, with streaming support.

```typescript
// server.ts
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
```

```typescript
// client.ts
import type { service } from "./server.ts";

const client = callz.client<typeof service>("http://localhost:3000");

const pong = await client.ping(); // pong === "pong"

for await (const time of await client.clock()) {
  console.log(time);
}
```
