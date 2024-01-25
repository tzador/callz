import { z } from "zod";

export class CallzError {
  constructor(public code: string, public message?: unknown) {}
}

export type CallzMethod = {
  req: z.ZodType;
  res: z.ZodType;
};

export const callzClient: <S extends { [name in keyof S]: CallzMethod }>(
  _service: S,
  fetcher: (name: keyof S, args: unknown) => Promise<unknown>
) => {
  [name in keyof S]: (
    req: z.infer<S[name]["req"]>
  ) => Promise<z.infer<S[name]["res"]>>;
} = (_service, fetcher) => {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        return async (req: unknown) => {
          // deno-lint-ignore no-explicit-any
          return await fetcher(prop.toString() as any, req);
        };
      }
    }
    // deno-lint-ignore no-explicit-any
  ) as any;
};

export const callzFetcher: (
  url: string,
  fetch_?: typeof fetch
) => <S extends { [name in keyof S]: CallzMethod }>(
  name: keyof S,
  req: unknown
) => Promise<unknown> = (url, fetch_) => async (name, req) => {
  fetch_ = fetch_ ?? fetch;
  const response = await fetch_(`${url}/${name.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(req)
  });
  if (response.ok) {
    return await response.json();
  } else {
    if (response.status === 418) {
      const body = await response.json();
      throw new CallzError(body.code, body.message);
    }
  }
  throw new CallzError("client_error", response.statusText);
};

export const callzServer: <S extends { [name in keyof S]: CallzMethod }, C>(
  service: S,
  methods: {
    [name in keyof S]: (
      req: z.infer<S[name]["req"]>,
      ctx: C
    ) => Promise<z.infer<S[name]["res"]>> | z.infer<S[name]["res"]>;
  }
) => (ctx: C) => (name: keyof S, req: unknown) => Promise<unknown> = (
  service,
  methods
) => {
  return (ctx) => async (name, req) => {
    try {
      const method = methods[name];
      if (!method) throw new CallzError("method_not_found");

      const req_check = await service[name].req.safeParseAsync(req);
      if (!req_check.success) {
        throw new CallzError(
          "request_validation_failed",
          JSON.parse(req_check.error.message)
        );
      }

      const res = await method(req, ctx);

      const res_check = await service[name].res.safeParseAsync(res);
      if (!res_check.success) {
        throw new CallzError(
          "response_validation_failed",
          JSON.parse(res_check.error.message)
        );
      }

      return res;
    } catch (error) {
      if (error instanceof CallzError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new CallzError("internal_server_error", error.message);
      }
      console.error(error);
      throw new CallzError("internal_server_error");
    }
  };
};
