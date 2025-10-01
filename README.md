# AsenaJS Example Project 🚀

A comprehensive example application showcasing **AsenaJS framework** features through Todo and Chat applications with real-time WebSocket communication.

## 🎯 About AsenaJS

AsenaJS is a modern TypeScript framework for building scalable server-side applications with:
- **Decorator-based architecture** - Clean, declarative code
- **Dependency Injection** - Built-in IoC container
- **WebSocket support** - First-class real-time communication
- **Database integration** - Seamless ORM integration (Drizzle)
- **Type safety** - Full TypeScript support throughout

## ✨ Features Demonstrated

### Core AsenaJS Features

#### 1. **Dependency Injection**
```typescript
@Service()
export class TodoService {
  @Inject("TodoRepository")
  // @Inject(TodoRepository) you can use like that also
  private todoRepository: TodoRepository;
}
```

#### 2. **Decorator-based Routing**
```typescript
@Controller({ path: '/todos', middlewares: [AuthMiddleware] })
export class TodoController {
  @Get({ path: '/', description: 'Get all todos' })
  public async getTodos(context: Context) { }
}
```

#### 3. **Repository Pattern with Drizzle ORM**

```typescript
import {BunSQLDatabase} from "drizzle-orm/bun-sql";

@Repository({
  databaseService: 'DatabaseService',
  table: TodoSchema,
})
export class TodoRepository extends BaseRepository<TodoSchemaType, BunSQLDatabase> {
  public async getTodosByUserId(userId: string): Promise<Todo[]> {
    return await this.db!.select().from(TodoSchema);
  }
}
```

#### 4. **WebSocket Support**
```typescript
@WebSocket({ path: 'chat-room', middlewares: [WSAuthMiddleware] })
export class ChatWebSocket extends AsenaWebSocketService<{ user: User }> {
  @Inject("ChatService")
  private chatService: ChatService;
  
  public async onMessage(ws: Socket, message: Buffer | string) {
    // Real-time message handling
  }
}
```

#### 5. **Middleware System**
```typescript
@Middleware()
export class AuthMiddleware implements MiddlewareService {
  public async handle(context: Context, next: Next) {
    // Authentication logic
  }
}
```

#### 6. **Validation with Zod**
```typescript
@Middleware({ validator: true })
export class CreateTodoValidator extends ValidationService {
  public json() {
    return z.object({
      title: z.string(),
      description: z.string(),
      isCompleted: z.boolean(),
    });
  }
}
```

## 🏗️ Project Architecture

### Clean Architecture Layers

```
┌─────────────────────────────────────┐
│         Controllers                 │  ← REST & WebSocket endpoints
│  @Controller, @WebSocket            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│          Services                   │  ← Business logic
│          @Service                   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        Repositories                 │  ← Data access
│  @Repository (BaseRepository)       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Database (Drizzle ORM)         │
└─────────────────────────────────────┘
```

### Project Structure

```
src/
├── controller/          # REST & WebSocket controllers
│   ├── TodoController.ts
│   ├── ChatController.ts
│   └── AuthController.ts
├── core/
│   ├── repository/      # @Repository classes
│   │   ├── TodoRepository.ts
│   │   └── ChatRepository.ts
│   ├── service/         # @Service classes
│   │   ├── TodoService.ts
│   │   └── ChatService.ts
│   └── schemas/         # Drizzle ORM schemas
│       ├── User.ts
│       ├── Todo.ts
│       └── Chat.ts
├── websocket/           # WebSocket handlers
│   ├── ChatWebSocket.ts          # Authenticated
│   └── NotificationWebSocket.ts  # Public
└── middleWare/
    ├── auth/            # Authentication
    └── validator/       # Request validation
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Setup Database
```bash
# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE asenatest;"

# Generate migrations from schemas
bun run drizzle:generate

# Apply migrations
bun run drizzle:migrate
```

### 3. Start Server
```bash
bun run build:start
```

Server runs on `http://localhost:3000`

### 4. Test WebSockets
Open `http://localhost:3000/websocket-test.html` for interactive WebSocket testing.

## 📋 API Examples

### Todo API (with Authentication)

**Create Todo:**
```bash
POST /todos
Authorization: Cookie
{
  "title": "Learn AsenaJS",
  "description": "Study the framework",
  "isCompleted": false
}
```

**Get All Todos:**
```bash
GET /todos
Authorization: Cookie
```

### Chat API (with Authentication)

**Create Chat Room:**
```bash
POST /chat/rooms
{
  "name": "General",
  "description": "Main chat room"
}
```

**Send Message:**
```bash
POST /chat/messages
{
  "content": "Hello, World!",
  "roomId": "room-uuid"
}
```

## 🔌 WebSocket Examples

### 1. Chat WebSocket (Authenticated)
```javascript
// Requires authentication cookie
const chatWs = new WebSocket('ws://localhost:3000/chat-room');

chatWs.onopen = () => {
  // Join a room and send message
  chatWs.send(JSON.stringify({
    type: 'message',
    content: 'Hello everyone!',
    roomId: 'room-uuid'
  }));
};

chatWs.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### 2. Notification WebSocket (Public)
```javascript
// No authentication required
const notifWs = new WebSocket('ws://localhost:3000/notifications');

notifWs.onopen = () => {
  // Subscribe to a channel
  notifWs.send(JSON.stringify({
    type: 'subscribe',
    channel: 'updates'
  }));
};

notifWs.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log('Notification:', notification);
};
```

## 🎓 Key AsenaJS Concepts

### 1. Dependency Injection
AsenaJS uses a powerful IoC container. Dependencies are automatically resolved:

```typescript
@Service()
export class ChatService {
  @Inject(ChatRepository)  // Automatically injected
  private chatRepository: ChatRepository;
}
```

### 2. Decorator-based Configuration
Everything is configured through decorators:

- `@Controller()` - Define REST controllers
- `@Service()` - Define services
- `@Repository()` - Define data repositories
- `@WebSocket()` - Define WebSocket handlers
- `@Middleware()` - Define middlewares
- `@Get()`, `@Post()`, `@Put()`, `@Delete()` - Define routes

### 3. Middleware Chain
Middlewares can be applied at controller or route level:

```typescript
@Controller({ 
  path: '/todos', 
  middlewares: [AuthMiddleware] // Applied to all routes
})
export class TodoController {
  @Post({ 
    path: '/', 
    validator: CreateTodoValidator // Route-specific
  })
  public async create(context: Context) { }
}
```

### 4. WebSocket with Authentication
WebSockets can use middlewares just like REST endpoints:

```typescript
@WebSocket({ 
  path: 'chat-room', 
  middlewares: [WSAuthMiddleware] // Auth required
})
export class ChatWebSocket extends AsenaWebSocketService<{ user: User }> {
  public onMessage(ws: Socket<{ user: User }>, message: Buffer | string) {
    // User data available from ws.data.user
  }
}
```

### 5. Type-Safe Database Access
Using Drizzle ORM with AsenaJS:

```typescript
@Repository({
  databaseService: 'DatabaseService',
  table: TodoSchema,
})
export class TodoRepository extends BaseRepository<TodoSchemaType> {
  // this.db is automatically injected and type-safe
  public async getTodos(): Promise<Todo[]> {
    return await this.db!.select().from(TodoSchema);
  }
}
```

## 🌟 Application Features

### Todo Application
- ✅ Full CRUD operations
- ✅ User-specific todos
- ✅ Authentication required
- ✅ Request validation with Zod
- ✅ UUID-based identification

### Chat Application

**REST API:**
- ✅ Create/list/delete chat rooms
- ✅ Send/retrieve messages
- ✅ Mark messages as read
- ✅ User authorization

**WebSocket (Authenticated):**
- ✅ Real-time messaging
- ✅ Room-based communication
- ✅ Message persistence
- ✅ Typing indicators
- ✅ Pub/Sub pattern

**WebSocket (Public):**
- ✅ Public broadcast system
- ✅ Channel subscriptions
- ✅ Real-time notifications
- ✅ No authentication needed

## 💾 Database

Using **Drizzle ORM** with automatic migrations:

```typescript
// Define schema
export const TodoSchema = pgTable('todos', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  userId: uuid('user_id').references(() => UserSchema.id, { onDelete: 'cascade' }),
});
````
```shell
// Drizzle Kit generates migrations automatically
bun run drizzle:generate
bun run drizzle:migrate
```

**Database Schema:**
- Users table (UUID primary keys)
- Todos table (with foreign keys)
- Chat rooms table
- Messages table

## 🧪 Testing

**Interactive WebSocket Test Page:**
Visit `http://localhost:3000/websocket-test.html` to:
- Test both WebSocket endpoints
- Subscribe to channels
- Send/receive messages
- See real-time updates

## 📚 Learn More

- **AsenaJS Documentation:** [GitHub](https://github.com/AsenaJs)
- **Drizzle ORM:** [Website](https://orm.drizzle.team/)
- **Bun Runtime:** [Website](https://bun.sh/)

## 🛠️ Technologies

- **AsenaJS** - Backend framework
- **TypeScript** - Type safety
- **Drizzle ORM** - Database toolkit
- **PostgreSQL** - Database
- **Bun** - JavaScript runtime
- **Hono** - Web framework adapter
- **Zod** - Schema validation

## 📝 Notes

- All IDs use UUID for scalability
- WebSocket connections support authentication
- Repository pattern with dependency injection
- Clean separation of concerns
- Full TypeScript type safety

---

**Built with ❤️ using [AsenaJS](https://github.com/AsenaJs)**

This example demonstrates AsenaJS's powerful features for building modern, scalable applications with clean architecture and type safety.
