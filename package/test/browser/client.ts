import callz from "../../src/callz";
import type { Service } from "./server";

const client = callz.client<Service>("http://localhost:9000/callz");

const pong = await client.ping("ping");
console.log({ pong });
for await (const time of await client.time("hello")) {
  console.log({ time });
}
