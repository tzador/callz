import { z } from "zod";

type Service = object;

const service = <S extends Service>(service: S) => service;

const methodSymbol = Symbol("callz:method");
const streamSymbol = Symbol("callz:stream");

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | { [key: string]: Json } | Json[];
const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]),
);

const method = {
  request<Request>(requestSchema: z.ZodType<Request>) {
    return {
      result<Result>(resultSchema: z.ZodType<Result>) {
        return {
          implementation(fn: (request: Request) => Promise<Result>) {
            const wrapped = async (request: Request) =>
              await resultSchema.parseAsync(await fn(await requestSchema.parseAsync(request)));
            // TODO: handle parse errors
            wrapped[methodSymbol] = true;
            return wrapped;
          },
        };
      },
    };
  },
};

const stream = {
  request<Request>(requestSchema: z.ZodType<Request>) {
    return {
      message<Message>(messageSchema: z.ZodType<Message>) {
        return {
          implementation(
            fn: (request: Request, emit: (message: Message) => Promise<void>) => Promise<void>,
          ): (request: Request, callback: (message: Message) => Promise<void>) => Promise<void> {
            // await requestSchema.parseAsync(request)
            // TODO: handle parse errors
            const wrapped = async (
              request: Request,
              callback: (message: Message) => Promise<void>,
            ) => {
              await fn(await requestSchema.parseAsync(request), async (message) => {
                callback(await messageSchema.parseAsync(message));
                // TODO: handle parse errors
              });
            };
            (wrapped as any)[streamSymbol] = true;
            return wrapped;
          },
        };
      },
    };
  },
};

const server = async <S extends object>(service: S, request: Request) => {
  async function route(path: string[], service: any) {
    if (path.length === 0) {
      const req = await request.json();
      if (typeof service === "function") {
        if (service[methodSymbol]) {
          const result = await service(req);
          return Response.json(result);
        } else if (service[streamSymbol]) {
          const encoder = new TextEncoder();
          const readable = new ReadableStream({
            async start(controller) {
              try {
                await service(req, async (message: any) => {
                  controller.enqueue(encoder.encode("data: " + JSON.stringify(message) + "\n\n"));
                });
              } finally {
                controller.close();
              }
            },
          });
          return new Response(readable, {
            headers: {
              "X-Accel-Buffering": "no",
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
            },
          });
        } else {
          return Response.json(
            { status: "error", error: { code: "not_found" } },
            {
              status: 404,
              statusText: "Not Found",
            },
          );
        }
      }
    } else if (typeof service === "object") {
      return await route(path.slice(1), service[path[0]]);
    } else {
      return Response.json(
        { status: "error", error: { code: "not_found" } },
        {
          status: 404,
          statusText: "Not Found",
        },
      );
    }
  }
  return await route(new URL(request.url).pathname.split("/").pop()!.split("."), service);
};

const client = <S extends Service>(endpoint: string): S => {
  function proxy(_target: any, prefix: string[]): any {
    return new Proxy(
      async (request: any, emit?: (message: any) => Promise<void>) => {
        const url = endpoint.replace(/\/$/, "") + "/" + prefix.join(".");

        const response = await fetch(url, {
          method: "POST",
          body: JSON.stringify(request),
          headers: { "Content-Type": "application/json" },
        });

        if (response.headers.get("Content-Type") === "text/event-stream") {
          const reader = response.body?.getReader();
          if (!reader) return;
          let buffer = "";
          const decoder = new TextDecoder();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            buffer += decoder.decode(value);
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                await emit!(JSON.parse(line.slice(6)));
              }
            }
          }
        } else {
          return await response.json();
        }
      },
      {
        get: (_target, name) => {
          if (typeof name === "string") {
            return proxy(_target, [...prefix, name]);
          } else {
            new Error("Invalid service name type, string expected");
          }
        },
      },
    ) as any;
  }

  return proxy({}, []) as S;
};

export default {
  client,
  server,
  service,
  method,
  stream,
};
