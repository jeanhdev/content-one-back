import { Field, ObjectType } from "type-graphql";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm";
import { Category } from "./Category";

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @Field()
  @Column()
  firstName: string;

  @Field()
  @Column({ nullable: false, unique: true })
  email: string;

  @Field()
  @Column({ nullable: false })
  password: string;

  @OneToMany(() => Category, (category) => category.user)
  categories: Category[];
}
