// deno-lint-ignore-file no-explicit-any
import { z } from "zod";

export const zPullService = <
  Pull extends Record<string, { req: z.ZodType; res: z.ZodType }>
>(
  pull: Pull
) => {
  return pull;
};

export const zPushService = <Push extends Record<string, z.ZodType>>(
  push: Push
) => {
  return push;
};

export const zPullServer: <
  Pull extends Record<string, { req: z.ZodType; res: z.ZodType }>
>(
  service: Pull,
  funs: {
    [K in keyof Pull]: (
      req: z.infer<Pull[K]["req"]>,
      headers: Headers
    ) => Promise<z.infer<Pull[K]["res"]>> | z.infer<Pull[K]["res"]>;
  }
) => (request: Request) => Promise<Response> = (service, funs) => {
  return async (request) => {
    const method = request.url.split(/\/+/g).pop()!;
    const req = await request.json();
    service[method].req.parse(req);
    const res = await funs[method](req, request.headers);
    service[method].res.parse(res);
    return Response.json(res);
    // TODO: handle errors
  };
};

export const zPullClient: <
  Pull extends Record<string, { req: z.ZodType; res: z.ZodType }>
>(
  service: Pull,
  url: string
) => {
  [K in keyof Pull]: (
    req: z.infer<Pull[K]["req"]>
  ) => Promise<z.infer<Pull[K]["res"]>>;
} = (_service, url) => {
  return new Proxy({} as any, {
    get(_, method) {
      return async (req: any) => {
        const response = await fetch(`${url}/${method.toString()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req)
        });
        return await response.json();
      };
    }
  });
};

export const zPushServer: <Push extends Record<string, z.ZodType>>(
  service: Push
) => (channel: string) => {
  [K in keyof Push]: (msg: z.infer<Push[K]>) => void;
} = (_service) => {
  return (channel) => {
    const broadcast = new BroadcastChannel(channel);
    return new Proxy({} as any, {
      get(_, method) {
        return (msg: any) => {
          broadcast.postMessage({ method, msg });
        };
      }
    });
  };
};

export const zPushHandler: (prefix: string, request: Request) => Response = (
  prefix,
  request
) => {
  const url = new URL(request.url);
  const broadcast = new BroadcastChannel(url.pathname.slice(prefix.length));

  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  };
  const encoder = new TextEncoder();
  const keep_alive_comment = encoder.encode(": keepalive\n\n");

  const stream = new ReadableStream({
    start(controller) {
      broadcast.onmessage = ({ data }: MessageEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        controller.enqueue(keep_alive_comment);
      };
    },
    cancel() {
      broadcast.close();
    }
  });
  return new Response(stream, { headers });
};

export const zPushClient: <Push extends Record<string, z.ZodType>>(
  service: Push,
  baseUrl: string
) => (channel: string) => {
  close: () => void;
  handle: {
    [K in keyof Push]: (callback: (msg: z.infer<Push[K]>) => void) => void;
  };
} = (_service, baseUrl) => {
  return (channel) => {
    const event_source = new EventSource(`${baseUrl}${channel}`);
    const callbacks: ((msg: any) => void)[] = [];
    event_source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      for (const callback of callbacks) {
        callback(data);
      }
    };
    event_source.onerror = (error) => {
      console.error("Push client error", error);
    };

    return {
      close: () => {
        event_source.close();
        callbacks = [];
      },
      handle: new Proxy({} as any, {
        get(_, method) {
          return (callback: (msg: any) => void) => {
            callbacks.push((data) => {
              if (data.method === method) {
                callback(data.msg);
              }
            });
          };
        }
      })
    };
  };
};
