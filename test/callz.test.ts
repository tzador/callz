import { expect, test } from "vitest";
import callz from "../src/callz";
import { z } from "zod";

test("ping pong", async () => {
  const service = {
    play: callz
      .request(z.literal("ping"))
      .reply(z.literal("pong"))
      .function(() => "pong"),
  };
  const client = callz.client<typeof service>(
    "http://localhost:3000/callz",
    async (request: Request) => {
      return await callz.server(request, service);
    },
  );
  const pong = await client.play("ping");
  expect(pong).toBe("pong");
});

test("flip flop", async () => {
  const service = {
    flipflop: callz
      .request(z.object({ one: z.number(), two: z.number() }))
      .reply(z.object({ one: z.number(), two: z.number() }))
      .function(({ one, two }) => ({ one: two, two: one })),
  };
  const client = callz.client<typeof service>(
    "http://localhost:3000/callz",
    async (request: Request) => {
      return await callz.server(request, service);
    },
  );

  const { one, two } = await client.flipflop({ one: 10, two: 20 });
  expect(one).toBe(20);
  expect(two).toBe(10);
});
