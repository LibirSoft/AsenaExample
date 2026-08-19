import * as User from './user.schema';
import * as Todo from './todo.schema';

export default {
  ...User,
  ...Todo,
};
