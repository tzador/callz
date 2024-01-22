import { z } from "zod";

type Signature<Req, Res> = {
  req: z.ZodType<Req>;
  res: z.ZodType<Res>;
};

type SignatureWithName<Req, Res> = Signature<Req, Res> & {
  name: string;
};

export function z_service<T extends object>(spec: T) {
  return new Proxy(spec, {
    get: (target, prop) => {
      const signature = (target as any)[prop];
      if (!signature) {
        throw new Error(`Method ${prop.toString()} not found`);
      }
      return {
        ...signature,
        name: prop
      };
    }
  });
}

export const z_method: <Req, Res>(
  signature: Signature<Req, Res>
) => SignatureWithName<Req, Res> = (signature) => {
  return { ...signature, name: "" };
};

export const z_client: (
  url: string
) => <Req, Res>(
  signature: SignatureWithName<Req, Res>,
  req: Req
) => Promise<Res> = (url) => {
  return async (signature, req) => {
    const response = await fetch(url + "/" + signature.name, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req)
    });
    const res = await response.json();
    if (res.error) {
      throw res.error;
    }
    return res;
  };
};

export function z_error(code: string, message?: unknown) {
  return {
    code,
    message
  };
}

export const z_server = () => {
  const methods = {};
  return {
    on: <Req, Res>(
      signature: SignatureWithName<Req, Res>,
      fun: (req: Req) => Res
    ) => {
      (methods as any)[signature.name] = {
        signature,
        fun
      };
    },
    handle: async (request: Request) => {
      const req = await request.json();
      const method = (methods as any)[request.url.split("/").pop()!];

      const error_params = {
        status: 418,
        headers: { "Content-Type": "application/json" }
      };

      if (!method) {
        return new Response(
          JSON.stringify(z_error("method_not_implemented")),
          error_params
        );
      }

      const req_check = await method.signature.req.safeParseAsync(req);
      if (!req_check.success) {
        return new Response(
          JSON.stringify(z_error("invalid_request", req_check.error.message)),
          error_params
        );
      }

      try {
        const res = await method.fun(req);

        const res_check = await method.signature.req.safeParseAsync(req);
        if (!res_check.success) {
          return new Response(
            JSON.stringify(
              z_error("invalid_response", res_check.error.message)
            ),
            error_params
          );
        }

        return new Response(JSON.stringify(res), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error: any) {
        return new Response(
          JSON.stringify(
            z_error(error.code ?? "internal_server_error", error.message)
          ),
          error_params
        );
      }
    }
  };
};
