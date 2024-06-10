import callz from "../src/callz";
import type { Service } from "./server";

const client = callz.client<Service>("http://localhost:9000/callz");

(async () => {
  const pong = await client.ping("ping");
  console.log({ pong });

  await client.time("what is the time?", async (time) => {
    console.log({ time });
  });
})();
