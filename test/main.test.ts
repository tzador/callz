import { z } from "zod";
import {
  z_client,
  z_method,
  z_service,
  z_server,
  ZError
} from "../src/main.ts";
import { expect, test } from "vitest";

// Define the service interface
const test_service = z_service({
  add: z_method({
    req: z.object({
      a: z.number(),
      b: z.number()
    }),
    res: z.number()
  }),
  swap: z_method({
    req: z.object({
      a: z.string(),
      b: z.string()
    }),
    res: z.object({
      b: z.string(),
      a: z.string()
    })
  }),
  fail: z_method({
    req: z.string(),
    res: z.string()
  })
});

// Implement the service
const test_server = z_server();

test_server.handle(test_service.add, (req) => {
  return req.a + req.b;
});

test_server.handle(test_service.swap, (req) => {
  return { a: req.b, b: req.a };
});

test_server.handle(test_service.fail, () => {
  throw new ZError("test_error");
});

// Use the service through client
const test_client = z_client(test_server.fetcher);

test("add method", async () => {
  const res = await test_client(test_service.add, { a: 2, b: 2 });
  expect(res).toBe(4);
});

test("swap method", async () => {
  const res = await test_client(test_service.swap, { a: "hello", b: "world" });
  expect(res.a).toBe("world");
  expect(res.b).toBe("hello");
});

test("fail method", async () => {
  try {
    await test_client(test_service.fail, "hello, world");
    expect(false).toBe(true);
  } catch (error) {
    expect(error).toBeInstanceOf(ZError);
    expect(error.code).toBe("test_error");
  }
});
