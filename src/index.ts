import "reflect-metadata";
import { createConnection, createQueryBuilder } from "typeorm";
import { Category } from "./entity/Category";
import { Feed } from "./entity/Feed";
import { User } from "./entity/User";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { FeedResolver } from "./resolver/feed";
import { UserResolver } from "./resolver/user";
import session from "express-session";
import connectRedis from "connect-redis";
import Redis from "ioredis";
import { __prod__ } from "./helpers";
import { ServerCtx } from "./types";
import sendEmail from "./utils/mailer";
import { CategoryResolver } from "./resolver/category";

const PORT = process.env.PORT || 4000;

createConnection()
  .then(async () => {
    const app = express();
    // The order that you'll run the middleware is the the order they'll run (yes, therefore redis b4 apollo)

    const RedisStore = connectRedis(session);
    const redis = new Redis();
    app.use(
      session({
        name: "qid",
        store: new RedisStore({ client: redis, disableTouch: true }),
        cookie: {
          domain: "https://content-one-front.vercel.app/",
          maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
          httpOnly: true,
          sameSite: "lax", // csrf
          secure: __prod__
        },
        saveUninitialized: false,
        secret: "m0z6l{z!`s6ngiSAz')IYH18T0W)y[",
        resave: false
      })
    );

    const apolloServer = new ApolloServer({
      schema: await buildSchema({
        resolvers: [UserResolver, FeedResolver, CategoryResolver]
      }),
      context: ({ req, res }): ServerCtx => ({ req, res, redis })
    });

    apolloServer.applyMiddleware({
      app,
      cors: {
        origin: "https://content-one-front.vercel.app/",
        credentials: true
      }
    });

    app.listen(PORT, () => {
      console.log("Started listening on port 4000");
    });
  })
  .catch((error) => console.log(error));
