import { z } from "zod";

const jsonLiteralSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
type JsonLiteral = z.infer<typeof jsonLiteralSchema>;
type Json = JsonLiteral | { [key: string]: Json } | Json[];
const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([jsonLiteralSchema, z.array(jsonSchema), z.record(jsonSchema)]),
);

export class ErrorZ extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
  }
}

const describeSymbol = Symbol("doc");
const requestSymbol = Symbol("request");
const replySymbol = Symbol("reply");
const streamSymbol = Symbol("stream");

function annotate(fn: any, symbol: symbol, value: any) {
  fn[symbol] = value;
}

const request = (description?: string) => {
  return <Receive extends Json>(requestSchema: z.ZodType<Receive>) => ({
    reply: <Reply extends Json>(replySchema: z.ZodType<Reply>) => {
      return {
        function: (fn: (request: Receive) => Promise<Reply>) => {
          async function f(req: any) {
            const res = await fn(
              await requestSchema.parseAsync(req, { path: [":request"] }),
            );

            return await replySchema.parseAsync(res, { path: [":response"] });
          }
          annotate(f, describeSymbol, description);
          annotate(f, requestSymbol, requestSchema);
          annotate(f, replySymbol, replySchema);
          return f;
        },
      };
    },

    stream: <Event extends Json>(eventSchema: z.ZodType<Event>) => ({
      generator: (fn: (req: Receive) => Promise<AsyncGenerator<Event>>) => {
        const p = async (req: any) => {
          async function* f() {
            const res = await fn(
              await requestSchema.parseAsync(req, {
                path: [":stream-request"],
              }),
            );
            for await (const item of res) {
              yield await eventSchema.parseAsync(item, {
                path: [":stream-item"],
              });
            }
          }
          return f();
        };
        annotate(p, describeSymbol, description);
        annotate(p, requestSymbol, requestSchema);
        annotate(p, streamSymbol, eventSchema);
        return p;
      },
    }),
  });
};

export default {
  describe: (description: string) => ({ request: request(description) }),

  request: request(),

  server: async <M>(request: Request, service: M) => {
    const method = request.url.split("/").pop() ?? "";
    async function route(path: string[], service: any) {
      const handler = service[path[0]];
      if (typeof handler === "function") {
        try {
          const result = await handler(await request.json());
          if (typeof result?.[Symbol.asyncIterator] === "function") {
            const encoder = new TextEncoder();

            const readable = new ReadableStream({
              start(controller) {
                (async () => {
                  for await (const item of result) {
                    controller.enqueue(
                      encoder.encode(JSON.stringify(item) + "\n"),
                    );
                  }
                  controller.close();
                })();
              },
            });

            return new Response(readable, {
              headers: { "Content-Type": "application/x-ndjson" },
            });
          }
          return Response.json(result);
        } catch (error: any) {
          if (error instanceof ErrorZ) {
            console.error(JSON.stringify(error, null, 2));
            return new Response(error.message, { status: 418 });
          } else if (error instanceof z.ZodError) {
            const path = error.errors[0].path[0];
            error.errors[0].path[0] = method + path;
            if (path === ":request") {
              return Response.json(error.format(), {
                status: 400,
                statusText: "Bad Request",
              });
            } else {
              return Response.json(error.format(), {
                status: 500,
                statusText: "Internal Server Error",
              });
            }
          } else {
            return new Response(error.message, {
              status: 500,
              statusText: "Internal Server Error",
            });
          }
        }
      } else if (typeof handler === "object") {
        return await route(path.slice(1), handler);
      } else {
        return new Response(`Function ${method} not found`, {
          status: 404,
          statusText: "Function Not Found",
        });
      }
    }

    return await route(method.split(":")[1].split("."), service);
  },

  client: <Service>(
    endpoint: string,
    myFetch: (request: Request) => Promise<Response> = fetch,
  ) => {
    function proxy(_target: any, prefix: string[]): any {
      return new Proxy(
        async (req: any) => {
          const url =
            endpoint.replace(/\/$/, "") + "/callz:" + prefix.join(".");
          const request = new Request(url, {
            method: "POST",
            body: JSON.stringify(req),
            headers: { "Content-Type": "application/json" },
          });
          const response = await myFetch(request);

          if (response.status === 418) {
            const { code, message } = await response.json();
            new ErrorZ(code, message);
          }

          if (response.headers.get("Content-Type") === "application/x-ndjson") {
            const g = async function* g() {
              const reader = response.body?.getReader();
              if (!reader) return;
              let buffer = "";
              const decoder = new TextDecoder("utf-8");
              for (;;) {
                const { done, value } = await reader.read();
                if (done) {
                  break;
                }
                buffer += decoder.decode(value);
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                  yield JSON.parse(line);
                }
              }
            };
            return g();
          }

          return await response.json();
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

    return proxy({}, []) as Service;
  },

  error: (name: string, message: any) => new ErrorZ(name, message),
};
