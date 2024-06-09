# CallZ

Awesome, Typesafe, Zod powered RPC, with streaming support.

```typescript
const service = {
  ping: callz
    .doc("It pings")
    .request(z.literal("ping"))
    .reply(z.literal("pong"))
    .function(() => "pong"),
};
```
