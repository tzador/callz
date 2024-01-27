import { z } from "zod";

export const add = z
  .function()
  .args(z.object({ a: z.number(), b: z.number() }))
  .returns(z.number())
  .implement((args) => {
    return args.a + args.b;
  });
