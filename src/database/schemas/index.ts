import * as User from './user.schema';
import * as Todo from './todo.schema';
import * as ChatRoom from './chat-room.schema';
import * as ChatRoomMember from './chat-room-member.schema';
import * as Message from './message.schema';

export default {
  ...User,
  ...Todo,
  ...ChatRoom,
  ...ChatRoomMember,
  ...Message,
};
