import { z } from "zod";

export class ZError {
  constructor(public code: string, public message?: unknown) {}
}

export type ZMethod = {
  req: z.ZodType;
  res: z.ZodType;
};

export const z_client: <S extends { [name in keyof S]: ZMethod }>(
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

export const z_server: <S extends { [name in keyof S]: ZMethod }, C>(
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
      if (!method) throw new ZError("method_not_found");

      const req_check = await service[name].req.safeParseAsync(req);
      if (!req_check.success) {
        throw new ZError(
          "request_validation_failed",
          JSON.parse(req_check.error.message)
        );
      }

      const res = await method(req, ctx);

      const res_check = await service[name].res.safeParseAsync(res);
      if (!res_check.success) {
        throw new ZError(
          "response_validation_failed",
          JSON.parse(res_check.error.message)
        );
      }

      return res;
    } catch (error) {
      if (error instanceof ZError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ZError("internal_server_error", error.message);
      }
      console.error(error);
      throw new ZError("internal_server_error");
    }
  };
};
