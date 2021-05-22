import { isAuth } from "../middleware/isAuth";
import { ServerCtx } from "src/types";
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
import { Category } from "../entity/Category";
import { getConnection, getRepository } from "typeorm";
import { FieldError } from "./user";
import { User } from "src/entity/User";

@ObjectType()
class ArrayOfCategories {
  @Field(() => [Category])
  categories: Category[];
}

@ObjectType()
class CategoryResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => Category, { nullable: true })
  category?: Category;
}

@ObjectType()
class DeleteResponse {
  @Field(() => String)
  message: string;

  @Field(() => Boolean)
  result: boolean;
}

@Resolver()
export class CategoryResolver {
  // QUERIES
  @Query(() => Category, { nullable: true })
  readCategory(@Arg("id") id: number) {
    const category = Category.findOne(id);
    if (category === undefined) {
      return category;
    }
    return category;
  }

  @Query(() => ArrayOfCategories)
  @UseMiddleware(isAuth)
  async readCategories(
    @Ctx() { req }: ServerCtx
  ): Promise<ArrayOfCategories | null> {
    const categories = await getRepository(Category).find({
      where: {
        userId: req.session.userId
      }
    });

    if (!categories) {
      return null;
    }
    return {
      categories: categories
    };
  }

  // MUTATIONS
  @Mutation(() => CategoryResponse)
  async createCategory(
    @Arg("name") name: string,
    @Arg("description") description: string,
    @Ctx() { req }: ServerCtx
  ): Promise<CategoryResponse> {
    const existing = await getRepository(Category).find({
      where: {
        userId: req.session.userId,
        name: name,
        description: description
      }
    });
    if (existing.length !== 0) {
      return {
        errors: [
          {
            field: "name",
            message: "category already exists"
          }
        ]
      };
    }
    const category = await Category.create({
      name: name,
      description: description,
      userId: req.session.userId
    }).save();

    return { category };
  }

  @Mutation(() => CategoryResponse)
  @UseMiddleware(isAuth)
  async updateCategory(
    @Arg("id") id: number,
    @Arg("name") name: string,
    @Arg("description") description: string
  ): Promise<CategoryResponse> {
    const category = await Category.findOne(id);
    if (category === undefined) {
      return {
        errors: [{ field: "id", message: "category does not exist" }]
      };
    }
    await getConnection()
      .createQueryBuilder()
      .update(Category)
      .set({ name: name, description: description })
      .where("id = :id", { id: id })
      .execute();

    return { category };
  }

  @Mutation(() => DeleteResponse)
  @UseMiddleware(isAuth)
  async deleteCategory(
    @Arg("id") id: number,
    @Ctx() { req }: ServerCtx
  ): Promise<DeleteResponse> {
    const category = await Category.findOne(id);
    if (category === undefined) {
      return { result: false, message: "category does not exist." };
    }
    if (category.userId !== req.session.userId) {
      return { result: false, message: "unauthorized." };
    }
    await Category.delete({ id: id });
    return {
      result: true,
      message: "category deleted."
    };
  }
}
