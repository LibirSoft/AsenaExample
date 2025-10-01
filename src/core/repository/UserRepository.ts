import { UserSchema, type UserSchemaType, type User, type NewUser } from '../schemas/User.ts';
import { BaseRepository, Repository } from '@asenajs/asena-drizzle';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import { eq } from 'drizzle-orm';

export interface CreateUserDto {
  name: string;
  email: string;
}

@Repository({
  databaseService: 'DatabaseService',
  table: UserSchema,
  name: 'UserRepository',
})
export class UserRepository extends BaseRepository<UserSchemaType, BunSQLDatabase> {

  public async getUsers(): Promise<User[]> {
    return this.db!.select().from(UserSchema);
  }

  public async getUserById(id: string): Promise<User | null> {
    const [user] = await this.db!.select().from(UserSchema).where(eq(UserSchema.id, id)).limit(1);

    return user || null;
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await this.db!.select().from(UserSchema).where(eq(UserSchema.email, email)).limit(1);

    return user || null;
  }

  public async getUserByName(name: string): Promise<User[]> {
    return this.db!.select().from(UserSchema).where(eq(UserSchema.name, name));
  }

  public async createUser(createUserDto: CreateUserDto): Promise<User> {
    const newUser: NewUser = {
      name: createUserDto.name,
      email: createUserDto.email,
    };

    const [user] = await this.db!.insert(UserSchema).values(newUser).returning();

    return user;
  }

}
