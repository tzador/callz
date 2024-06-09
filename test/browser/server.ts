import { z } from "zod";
import callz from "../../src/callz";

const service = {
  ping: callz
    .doc("It pings")
    .request(z.literal("ping"))
    .reply(z.literal("pong"))
    .error("This is an error")
    .error("This is another error")
    .function(() => "pong"),

  account: {
    new: callz
      .doc("It pings")
      .request(z.literal("ping"))
      .reply()
      .error("not_found")
      .error("already_taken", z.object({ suggestion: z.string() }))
      .function(() => "pong"),
  },

  time: callz
    .request(z.string())
    .stream(z.string())
    .error("This is an error")
    .generator(async () => {
      return (async function* () {
        yield "1";
        yield "2";
        yield "3";
      })();
    }),
};

export type Service = typeof service;
