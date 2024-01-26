import { z } from "zod";

export class CallzError {
  constructor(public code: string, public message?: unknown) {}
}

export type CallzMethod = {
  req: z.ZodType;
  res: z.ZodType;
};

export type CallzService<S> = { [name in keyof S]: CallzMethod };

export const callzService: <S extends CallzService<S>>(service: S) => S = (
  service
) => service;

export const callzClient: <S extends CallzService<S>>(
  _service: S,
  url: string
) => {
  [name in keyof S]: (
    req: z.infer<S[name]["req"]>
  ) => Promise<z.infer<S[name]["res"]>>;
} = (_service, url) => {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        return async (req: unknown) => {
          const response = await fetch(`${url}/${prop.toString()}`, {
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
          throw new CallzError("client_error");
        };
      }
    }
    // deno-lint-ignore no-explicit-any
  ) as any;
};

export const callzServer: <S extends CallzService<S>>(
  service: S,
  methods: {
    [name in keyof S]: (
      req: z.infer<S[name]["req"]>,
      headers: Headers
    ) => Promise<z.infer<S[name]["res"]>> | z.infer<S[name]["res"]>;
  }
) => (request: Request) => Promise<Response> =
  (service, methods) => async (request) => {
    const req = await request.json();
    const name = request.url.split("/").pop() as keyof typeof service;

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

      const res = await method(req, request.headers);

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
