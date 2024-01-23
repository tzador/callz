import { expect, test } from "vitest";
import { z } from "zod";
import { ZError, z_client, z_server } from "../src/zcall.ts";

const service = {
  add: {
    req: z.object({ a: z.number(), b: z.number() }),
    res: z.number()
  },
  swap: {
    req: z.object({
      a: z.string(),
      b: z.string()
    }),
    res: z.object({
      b: z.string(),
      a: z.string()
    })
  },
  fail: {
    req: z.undefined(),
    res: z.undefined()
  }
};

const server = z_server(service, {
  add: (req) => {
    return req.a + req.b;
  },
  swap: (req) => {
    return { a: req.b, b: req.a };
  },
  fail: () => {
    throw new ZError("test_error");
  }
});

const client = z_client(service, server(null));

test("add method", async () => {
  const res = await client.add({ a: 2, b: 2 });
  expect(res).toBe(4);
});

test("swap method", async () => {
  const res = await client.swap({ a: "hello", b: "world" });
  expect(res.a).toBe("world");
  expect(res.b).toBe("hello");
});

test("fail method", async () => {
  try {
    await client.fail(undefined);
    expect(false).toBe(true);
  } catch (error) {
    expect(error).toBeInstanceOf(ZError);
    expect(error.code).toBe("test_error");
  }
});
