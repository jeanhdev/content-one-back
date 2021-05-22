import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn
} from "typeorm";
import { Feed } from "./Feed";
import { User } from "./User";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
@Entity()
export class Category extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @Field()
  @Column({ nullable: false })
  name: string;

  @Field()
  @Column({ nullable: false })
  description: string;

  @Field()
  @Column({ nullable: false })
  userId: number;
  @ManyToOne(() => User, (user) => user.categories)
  user: User[];

  @OneToMany(() => Feed, (feed) => feed.category)
  feeds: Feed[];
}
