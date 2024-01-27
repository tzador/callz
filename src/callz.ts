import * as status from "human-status";
import { ZodError } from "zod";

class CallzError extends Error {
  constructor(public status: number, public message: any) {
    super(message);
    this.status = status;
  }
}

export const callzHandler: <S extends Record<string, (...args: any[]) => any>>(
  service: S
) => (request: Request) => Promise<Response> = (service) => async (request) => {
  try {
    if (request.method !== "POST") {
      throw new CallzError(
        status.METHOD_NOT_ALLOWED_405,
        "Only POST is supported"
      );
    }

    const method = request.url.split(/\/+/g).pop();

    if (!method) {
      throw new CallzError(status.BAD_REQUEST_400, "Method name not provided");
    }

    const fn = service[method];

    if (!fn) {
      throw new CallzError(status.NOT_FOUND_404, "Method not found");
    }

    let args: any[] = [];
    try {
      args = await request.json();
    } catch (error: any) {
      throw new CallzError(status.BAD_REQUEST_400, error.message);
    }

    try {
      const res = await fn(...args);
      return Response.json(res);
    } catch (error: any) {
      if (error instanceof ZodError) {
        throw new CallzError(status.BAD_REQUEST_400, error.issues);
      }
      console.log(error);
      throw new CallzError(status.INTERNAL_SERVER_ERROR_500, error.message);
    }
  } catch (error: any) {
    return Response.json(
      { error: error.message },
      { status: error.status ?? status.INTERNAL_SERVER_ERROR_500 }
    );
  }
};

export const callzClient: <S extends Record<string, (...args: any[]) => any>>(
  url: string
) => S = (url) => {
  return new Proxy({} as any, {
    get(_, method) {
      return async (...args: any[]) => {
        const response = await fetch(`${url}/${method.toString()}`, {
          method: "POST",
          body: JSON.stringify(args),
          headers: { "Content-Type": "application/json" }
        });
        if (response.status < 300) {
          return await response.json();
        }
        try {
          const json = await response.json();
          throw new CallzError(response.status, json.error?.message);
        } catch {
          throw new CallzError(response.status, response.statusText);
        }
      };
    }
  });
};
