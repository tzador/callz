import { Hono, type Context } from "hono";
import { transpile } from "https://deno.land/x/emit@0.34.0/mod.ts";
import { pullService, pushService } from "./mod.service.test.ts";
import { zPullServer, zPushHandler, zPushServer } from "./mod.ts";

const pullServer = zPullServer(pullService, {
  swap: ({ a, b }) => ({ a: b, b: a }),
  diff: ({ a, b }) => a - b
});

const pushServer = zPushServer(pushService);

setInterval(() => {
  pushServer("/12345").tick(new Date());
}, 1000);

const app = new Hono();
app.post("/pull/:method", (c: Context) => pullServer(c.req.raw));
app.get("/push/*", (c: Context) => zPushHandler("/push", c.req.raw));

app.get("/", async (c: Context) => {
  return new Response(await Deno.readTextFile("./mod.test.html"), {
    headers: {
      "content-type": "text/html"
    }
  });
});

app.get("/*", async (c: Context, next: () => void) => {
  const reqUrl = new URL(c.req.url);
  if (!reqUrl.pathname.endsWith(".ts")) {
    await next();
  }
  const url = new URL("." + reqUrl.pathname, import.meta.url);

  const result = await transpile(url, {
    cache: false,
    importMap: {
      imports: {
        zod: "https://deno.land/x/emit@0.34.0/mod.ts"
      }
    }
  });
  return new Response(result.get(url.toString()), {
    headers: {
      "content-type": "application/javascript"
    }
  });
});

Deno.serve(app.fetch);

///
