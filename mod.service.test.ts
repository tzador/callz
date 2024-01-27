import { z } from "zod";
import { zPullService, zPushService } from "./mod.ts";

export const pullService = zPullService({
  swap: {
    req: z.object({ a: z.string(), b: z.string() }),
    res: z.object({ a: z.string(), b: z.string() })
  },
  diff: {
    req: z.object({ a: z.number(), b: z.number() }),
    res: z.number()
  }
});

///
export const pushService = zPushService({
  tick: z.date(),
  newMessage: z.object({ message: z.string() })
});
