import { z } from "zod";

export class ZError {
  constructor(public code: string, public message?: unknown) {}
}

type Method<Req, Res> = {
  req: z.ZodType<Req>;
  res: z.ZodType<Res>;
};

type MethodWithName<Req, Res> = Method<Req, Res> & {
  name: string;
};

export function z_service<
  T extends Record<string, MethodWithName<unknown, unknown>>
>(spec: T) {
  return new Proxy(spec, {
    get: (target, prop) => {
      const name = prop.toString();

      // deno-lint-ignore no-explicit-any
      const signature = (target as any)[name];
      if (!signature) {
        throw new Error(`Method ${name} not found`);
      }
      return {
        ...signature,
        name
      };
    }
  });
}

export const z_method: <Req, Res>(
  method: Method<Req, Res>
) => MethodWithName<Req, Res> = (method) => {
  return { ...method, name: "" };
};

export const z_client: (
  fetcher: (name: string, req: unknown) => Promise<unknown>
) => <Req, Res>(method: MethodWithName<Req, Res>, req: Req) => Promise<Res> =
  (fetcher) => async (method, req) => {
    const res = await fetcher(method.name, req);
    // deno-lint-ignore no-explicit-any
    return res as any;
  };

export const z_server = () => {
  const handlers: {
    [name: string]: {
      method: MethodWithName<unknown, unknown>;
      // deno-lint-ignore no-explicit-any
      fun: (req: any, ctx?: unknown) => any;
    };
  } = {};
  return {
    handle: <Req, Res>(
      method: MethodWithName<Req, Res>,
      fun: (req: Req, ctx?: unknown) => Promise<Res> | Res
    ) => {
      if (handlers[method.name]) {
        throw new ZError(
          "method_already_exists",
          `Method "${method.name}" already exists`
        );
      }

      handlers[method.name] = {
        method,
        fun
      };
    },

    fetcher: async (
      name: string,
      req: unknown,
      ctx?: unknown
    ): Promise<unknown> => {
      try {
        const handler = handlers[name];
        if (!handler) throw new ZError("method_not_found");

        const req_check = await handler.method.req.safeParseAsync(req);
        if (!req_check.success) {
          throw new ZError(
            "request_validation_failed",
            JSON.parse(req_check.error.message)
          );
        }

        const res = await handler.fun(req, ctx);

        const res_check = await handler.method.res.safeParseAsync(res);
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
    }
  };
};
