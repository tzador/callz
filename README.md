<link rel="stylesheet" href="https://unpkg.com/sakura.css/css/sakura-dark.css" media="screen" />

# CallZ

[https://github.com/tzador/callz](https://github.com/tzador/callz)

Awesome, **TypeScript** safe, **Zod** powered **RPC** **APIs**, with **Streaming** support.

## Overview

CallZ is a powerful library for building typesafe, Zod validated Remote Procedure Calls (RPC) with built-in streaming support. It simplifies the process of defining and consuming RPC services, ensuring type safety and validation at every step.

## Features

- **Typesafe RPC:** Fully leverage TypeScript to ensure your RPC calls are typesafe.
- **Zod Validation:** Use Zod schemas to validate requests and responses, providing robust data validation.
- **Streaming Support:** Built-in support for streaming responses, allowing you to handle real-time data efficiently.
- **Easy Documentation:** Add documentation to your RPC functions for better clarity and maintainability.
- **Framework Agnostic:** Compatible with any server framework. The example uses Hono, but you can use Express, Koa, or any other framework.

## Installation

To install CallZ and its peer dependency [Zod](https://github.com/colinhacks/zod), run:

    npm install callz zod

    pnpm install callz zod

    yarn add callz zod

## Usage

### Define Your Service

Create a service definition file, for example `service.ts`, where you define your RPC methods.

```typescript
import { z } from "zod";
import callz from "callz";

export const service = {
  ping: callz
    .doc("It pings")
    .request(z.literal("ping"))
    .reply(z.literal("pong"))
    .function(() => "pong"),
  clock: callz
    .request(z.null())
    .event(z.union([z.literal("tick"), z.literal("tack")]))
    .generator(async (_, ok) => {
      return (async function* () {
        for (let i = 0; i < 100; i++) {
          yield new Date().getMilliseconds();
        }
      })();
    }),
  fails: callz
    .doc("It fails")
    .request(z.null())
    .reply(z.null())
    .function(() => {
      throw callz.error("catastrophy", "Something bad happened");
    })
};
```

export type Service = typeof service;

### Set Up the Server

Create a server file, for example `server.ts`, to set up the server and register your service.

```typescript
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import callz from "callz";
import { service } from "./service";

const app = new Hono();

app.get("/callz", async (c) => {
  return c.text("ok");
});

app.post("/callz/*", async (c) => {
  return await callz.server(c.req.raw, service);
});

serve({ fetch: app.fetch, port: 9000 }, () => {
  console.log("CallZ server ready on http://localhost:9000/callz");
});
```

### Create a Client

Create a client file, for example `client.ts`, to interact with your service.

```typescript
import callz from "callz";
import type { Service } from "./service";

const client = callz.client<Service>("http://localhost:9000/callz");

const pong = await client.ping(); // pong === "pong"

for await (const time of await client.clock()) {
  console.log(time);
}
```

## Contributing

Contributions are welcome! Please read the [contributing guidelines](https://github.com/tzador/callz/blob/main/CONTRIBUTING.md) for more information.

## License

CallZ is released under the MIT License. See the [LICENSE](https://github.com/tzador/callz/blob/main/LICENSE) file for more information.
