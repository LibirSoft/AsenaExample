import {boolean, integer, pgTable, serial, varchar} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";
import {user} from "./userSchema.ts";

export const todo = pgTable('todo', {
    id: serial('id').primaryKey().notNull(),
    title: varchar('title')
        .notNull()
        .default(sql`gen_random_uuid()`),
    description: varchar('description'),
    isCompleted: boolean('isCompleted').notNull(),
    userId: integer('userId').references(()=>user.id).notNull(),
});