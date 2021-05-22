import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  UseMiddleware
} from "type-graphql";
import { Feed } from "../entity/Feed";
import { Category } from "../entity/Category";
import { ServerCtx } from "src/types";
import { createQueryBuilder, getConnection } from "typeorm";
import { isAuth } from "../middleware/isAuth";
import { FieldError } from "./user";

@ObjectType()
class FeedsResponse {
  @Field(() => Category, { nullable: true })
  category?: Category;

  @Field(() => [Feed], { nullable: true })
  feeds?: Feed[];

  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => [NoDataError], { nullable: true })
  error?: NoDataError[];
}

@ObjectType()
export class NoDataError {
  @Field()
  message: string;
}

@ObjectType()
class FeedResponse {
  @Field(() => Feed, { nullable: true })
  feed?: Feed;

  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];
}

@Resolver()
export class FeedResolver {
  // Functions here are mutations or queries
  // Queries : searching (R)
  // Mutations : mutating (CUD)

  // QUERIES
  @Query(() => Feed, { nullable: true })
  readFeed(@Arg("id") id: number): Promise<Feed | undefined> {
    return Feed.findOne(id);
  }

  @Query(() => FeedsResponse)
  @UseMiddleware(isAuth)
  async readFeeds(
    @Arg("categoryId") categoryId: number,
    @Ctx() { req }: ServerCtx
  ): Promise<FeedsResponse> {
    const category = await Category.findOne(categoryId);
    if (category === undefined) {
      return {
        errors: [
          {
            field: "categoryId",
            message: "Category does not exists."
          }
        ]
      };
    }

    const feeds = await createQueryBuilder(Feed, "feed")
      .leftJoin("feed.category", "category")
      .where("category.userId = :userId", { userId: req.session.userId })
      .andWhere("feed.categoryId = :categoryId", { categoryId: categoryId })
      .getMany();

    if (feeds.length === 0) {
      return {
        error: [
          {
            message: "No data."
          }
        ],
        category: category
      };
    }

    return {
      category: category,
      feeds: feeds
    };
  }

  // MUTATIONS
  @Mutation(() => FeedResponse)
  async createFeed(
    @Arg("name") name: string,
    @Arg("feedUrl") feedUrl: string,
    @Arg("categoryId") categoryId: number
  ): Promise<Feed | null> {
    const category = await Category.findOne(categoryId);
    if (!category) {
      return null;
    }
    const feed = await Feed.create({
      categoryId: categoryId,
      name: name,
      feedUrl: feedUrl
    }).save();
    return feed;
  }

  @Mutation(() => FeedResponse, { nullable: true })
  async updateFeed(
    @Arg("id") id: number,
    @Arg("name", { nullable: true }) name: string,
    @Arg("feedUrl", { nullable: true }) feedUrl: string
  ): Promise<FeedResponse> {
    const feed = await Feed.findOne(id);
    if (!feed) {
      return {
        errors: [
          {
            field: "name",
            message: "feed does not exists."
          }
        ]
      };
    }
    await getConnection()
      .createQueryBuilder()
      .update(Feed)
      .set({ name: name, feedUrl: feedUrl })
      .where("id = :id", { id: id })
      .execute();

    return { feed };
  }

  @Mutation(() => Boolean)
  async deleteFeed(@Arg("id") id: number): Promise<boolean> {
    await Feed.delete(id);
    return true;
  }
}
