import { expect, test } from "vitest";
import callz from "../src/callz";
import { z } from "zod";

const service = {
  flipflop: callz
    .request(z.object({ one: z.number(), two: z.number() }))
    .reply(z.object({ one: z.number(), two: z.number() }))
    .function(({ one, two }) => ({ one: two, two: one })),

  play: callz
    .request(z.literal("ping"))
    .reply(z.literal("pong"))
    .function(() => "pong"),

  requestEmpty: callz
    .request(z.undefined())
    .reply(z.object({}))
    .function(() => ({})),

  ticktack: callz
    .request(z.null())
    .stream(z.union([z.literal("tick"), z.literal("tack")]))
    .generator(async () => {
      return (async function* () {
        for (let i = 0; i < 4; i++) {
          yield i % 2 === 0 ? "tick" : "tack";
          await new Promise((r) => setTimeout(r, 1000));
        }
      })();
    }),
};

const client = callz.client<typeof service>(
  "http://localhost:3000/callz",
  async (request: Request) => {
    return await callz.server(request, service);
  },
);

test("ping pong", async () => {
  const pong = await client.play("ping");
  expect(pong).toBe("pong");
});

test("flip flop", async () => {
  const { one, two } = await client.flipflop({ one: 10, two: 20 });
  expect(one).toBe(20);
  expect(two).toBe(10);
});

test("seconds stream", async () => {
  let i = 0;
  for await (const t of await client.ticktack(null)) {
    expect(t).toBe(i % 2 === 0 ? "tick" : "tack");
    i++;
  }
});
