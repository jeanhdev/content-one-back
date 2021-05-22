import { MiddlewareFn } from "type-graphql";
import { ServerCtx } from "../types";

export const isAuth: MiddlewareFn<ServerCtx> = ({ context }, next) => {
  if (!context.req.session.userId) {
    throw new Error("not authenticated");
  }

  return next();
};
