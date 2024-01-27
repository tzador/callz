import { pullService, pushService } from "./mod.service.test.ts";
import { zPullClient, zPushClient } from "./mod.ts";

const pullClient = zPullClient(pullService, "http://localhost:8000/pull");
const pushClient = zPushClient(pushService, "http://localhost:8000/push");

const swapped = await pullClient.swap({ a: "a", b: "b" });
console.log(swapped);

const diffed = await pullClient.diff({ a: 11, b: 3 });
console.log(diffed);

const channel = pushClient("/12345");

channel.handle.tick((date) => console.log("got a push", date));
