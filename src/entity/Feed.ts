import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm";
import { Category } from "./Category";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
@Entity()
export class Feed extends BaseEntity {
  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  id: string;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @Field()
  @Column({ nullable: false })
  name: string;

  @Field()
  @Column({ nullable: false })
  feedUrl: string;

  @Field()
  @Column({ nullable: false })
  categoryId: number;
  @ManyToOne(() => Category, (category) => category.feeds)
  category: Category[];
}
