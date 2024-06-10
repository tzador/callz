import { z } from "zod";

export const service = <S>(service: S) => service;

export const method = (doc?: string) => {
  return {
    request<Request>(requestSchema: z.ZodType<Request>) {
      return {
        result<Result>(resultSchema: z.ZodType<Result>) {
          return {
            implementation(fn: (request: Request) => Promise<Result>) {
              return async (request: Request) =>
                await resultSchema.parseAsync(await fn(await requestSchema.parseAsync(request)));
            },
          };
        },
      };
    },
  };
};

export const stream = (doc?: string) => {
  return {
    request<Request>(requestSchema: z.ZodType<Request>) {
      return {
        message<Message>(messageSchema: z.ZodType<Message>) {
          return {
            implementation(
              fn: (
                request: Request,
              ) => Promise<(emit: (message: Message) => Promise<void>) => Promise<void>>,
            ) {
              return async (request: Request) =>
                async (emit: (message: Message) => Promise<void>) => {
                  (await fn(await requestSchema.parseAsync(request)))(async (message: Message) => {
                    emit(await messageSchema.parseAsync(message));
                  });
                };
            },
          };
        },
      };
    },
  };
};

method()
  .request(z.literal("ping"))
  .result(z.literal("ping"))
  .implementation(async (a) => a);
z.function().args;

stream()
  .request(z.null())
  .message(z.literal("ping"))
  .implementation(async () => async (emit) => {
    await emit("ping");
  });
z.function().args;
