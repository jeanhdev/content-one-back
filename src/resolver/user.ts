import { User } from "../entity/User";
import {
  Resolver,
  Query,
  Mutation,
  Arg,
  InputType,
  Field,
  ObjectType,
  Ctx
} from "type-graphql";
import argon2 from "argon2";
import { ServerCtx } from "src/types";
import sendEmail from "../utils/mailer";
import { v4 } from "uuid";

// How does auth work ?
// 1 - After login, Redis stores the following key >> value pair, sess:sdvkdfkvdsv >> {userId: 1} in memory
// 2 - express-session will set a session ID cookie on my browser
// 3 - The cookie is an identifier to access my server-side session data ie. redis data
// 4 - WHen user make a request, the session identifier is sent to the server
// 5 - The server decrypt the identifier to access it's value and makes a request to redis
// 6 - Redis let us compare the userId to our Postgres DB of users

@InputType()
class UserInput {
  @Field({ nullable: true })
  firstName: string;
  @Field()
  email: string;
  @Field()
  password: string;
}

@ObjectType()
export class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: ServerCtx) {
    if (!req.session.userId) {
      return null;
    }
    const user = await User.findOne(req.session.userId);
    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UserInput,
    @Ctx() { req }: ServerCtx
  ): Promise<UserResponse> {
    const isRegistered = await User.findOne({
      where: {
        email: options.email
      }
    });
    if (isRegistered !== undefined) {
      return {
        errors: [
          {
            field: "email",
            message: "user already registered"
          }
        ]
      };
    }
    if (options.email.length <= 6) {
      return {
        errors: [{ field: "email", message: "email is invalid" }]
      };
    }
    if (options.password.length <= 3) {
      return {
        errors: [
          { field: "password", message: "length must be greater than 3" }
        ]
      };
    }
    const hashedPwd = await argon2.hash(options.password);
    const user = await User.create({
      firstName: options.firstName,
      email: options.email,
      password: hashedPwd
    }).save();
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options") options: UserInput,
    @Ctx() { req }: ServerCtx
  ): Promise<UserResponse> {
    const user = await User.findOne({
      where: { email: options.email }
    });
    if (!user) {
      return {
        errors: [
          {
            field: "email",
            message: "email does not exists"
          }
        ]
      };
    }
    const valid = await argon2.verify(user.password, options.password);
    if (!valid) {
      return {
        errors: [
          {
            field: "password",
            message: "password is incorrect"
          }
        ]
      };
    }

    req.session.userId = user.id;

    console.log(req.session.userId);

    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: ServerCtx) {
    if (!req.session.userId) {
      return false;
    }
    const result = new Promise((resolve) => {
      res.clearCookie("qid");
      req.session.destroy((err) => {
        if (err) {
          resolve(false);
        }
        resolve(true);
      });
    });
    return result;
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: ServerCtx
  ) {
    const user = await User.findOne({
      where: {
        email: email
      }
    });
    if (user === undefined) {
      // User not existing
      return false;
    }
    const token = v4();

    await redis.set(
      "forget-password" + token,
      user.id,
      "ex",
      1000 * 60 * 60 * 24 * 3
    );

    await sendEmail(
      email,
      `<a href="http://localhost:3000/auth/update-password/${token}">Update my password</a>`
    );

    return true;
  }

  @Mutation(() => UserResponse)
  async updatePassword(
    @Arg("token") token: string,
    @Arg("password")
    password: string,
    @Ctx()
    { redis }: ServerCtx
  ): Promise<UserResponse> {
    if (password.length <= 3) {
      return {
        errors: [
          { field: "password", message: "length must be greater than 3" }
        ]
      };
    }
    // Retrieve the id from redis
    const userId = await redis.get("forget-password" + token);
    if (!userId) {
      return {
        errors: [{ field: "token", message: "your token is invalid" }]
      };
    }
    // Retrieve our user
    const user = await User.findOne(userId);
    if (!user) {
      return {
        errors: [{ field: "token", message: "user no longer exists" }]
      };
    }
    // Update the new password
    user.password = await argon2.hash(password);
    user.save();
    // Return the user
    return { user };
  }
}
