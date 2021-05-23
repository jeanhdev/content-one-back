import "reflect-metadata";
import { createConnection } from "typeorm";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { FeedResolver } from "./resolver/feed";
import { UserResolver } from "./resolver/user";
import session from "express-session";
import connectRedis from "connect-redis";
import cors from "cors";
import Redis from "ioredis";
import { __prod__ } from "./helpers";
import { ServerCtx } from "./types";
import { CategoryResolver } from "./resolver/category";

// const PORT = process.env.PORT || 4000;

createConnection()
  .then(async () => {
    const app = express();
    // The order that you'll run the middleware is the the order they'll run (yes, therefore redis b4 apollo)
    const RedisStore = connectRedis(session);
    const redis = new Redis(process.env.REDIS_URL);
    app.set("trust proxy", 1);
    app.use(
      cors({
        origin: "https://content-one-front.herokuapp.com/",
        credentials: true
      })
    );
    app.use(
      session({
        name: "qid",
        store: new RedisStore({ client: redis, disableTouch: true }),
        cookie: {
          domain: ".herokuapp.com",
          maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
          httpOnly: true,
          sameSite: "none", // csrf
          secure: __prod__
        },
        proxy: true,
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
      cors: false
    });

    app.listen(parseInt(process.env.PORT!), () => {
      console.log("Running");
    });
  })
  .catch((error) => console.log(error));
