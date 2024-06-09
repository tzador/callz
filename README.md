# CallZ

Awesome, Typesafe, Zod powered RPC, with streaming support.

```typescript
// Service implementation
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
};
```

```typescript
// Service usage
const client = callz.client<typeof service>("http://localhost:3000");

const pong = await client.ping(); // pong === "pong"

for await (const time of await client.clock()) {
  console.log(time);
}
```
