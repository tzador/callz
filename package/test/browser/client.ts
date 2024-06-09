import callz from "../../src/callz";
import type { Service } from "./server";

const client = callz.client<Service>("http://localhost:9000/callz");

setTimeout(async () => {
  const pong = await client.ping("ping");
  console.log({ pong });
}, 1000);
