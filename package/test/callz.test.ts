// import { expect, test, assert } from "vitest";
// import callz from "../src/callz";
// import { z } from "zod";

// const service = {
//   echo: callz.method
//     .request(z.string())
//     .result(z.string())
//     .method(async (request) => {
//       return { status: "ok", result: request };
//     }),

//   fail: callz.method
//     .request(z.string())
//     .result(z.string())
//     .error(z.object({ code: z.literal("stack-overflow"), details: z.string() }))
//     .method(async (request) => {
//       return { status: "error", error: { code: "stack-overflow", details: request } };
//     }),

//   time: callz.stream
//     .request(z.null())
//     .event(z.string())
//     .stream(async () => async (emit) => {
//       await emit("tick");
//       await emit("tack");
//     }),
// };

// const client = callz.client<typeof service>("http://localhost:3000/callz", async (request: Request) => {
//   return await callz.server(service, request);
// });

// test("echo", async () => {
//   const response = await client.echo("hello, world");
//   expect(response.status).toBe("ok");
//   expect(response.result).toBe("hello, world");
// });

// test("fail", async () => {
//   const response = await client.fail("hello, world");
//   expect(response.status).toBe("error");
//   if (response.status === "error") {
//     expect(response.error.code).toBe("stack-overflow");
//     expect(response.error.details).toBe("hello, world");
//   }
// });

// test("time", async () => {
//   const response = await client.time(null);
//   if (typeof response === "function") {
//     response(async (event) => {
//       console.log("EVENT", event);
//     });
//   }
// });
