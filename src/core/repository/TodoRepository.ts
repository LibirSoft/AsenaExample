import { Component, Inject } from '@asenajs/asena';
import {DatabaseService, type FakeDatabase} from '../../db/DatabaseService.ts';

export interface Todo {
  id: number;
  title: string;
  description: string;
  isCompleted: boolean;
  userId: number;
}

export interface CreateTodoDto {
  title: string;
  description: string;
  isCompleted: boolean;
}

@Component()
export class TodoRepository {

  @Inject(DatabaseService, (service: DatabaseService) => service.connection)
  private connection: FakeDatabase;

  public async getTodosByUserId(userId: number) {
    return this.connection.todos.filter((user) => user.id === userId);
  }

  public async getTodoByIdAndUserId(id: number, userId: number) {
    return this.connection.todos.filter((todo) => todo.id === id && todo.userId === userId);
  }

  public async deleteTodoByIdAndUserId(id: number, userId: number) {
    const todo = this.connection.todos.find((todo) => todo.id === id && todo.userId === userId);

    if (!todo) {
      return false;
    }

    this.connection.todos = this.connection.todos.filter((todo) => todo.id !== id);

    return true;
  }

  public async createTodo(userId: number, createTodoDto: CreateTodoDto) {
    const todo: Todo = {
      id: this.connection.todos.length + 1,
      userId,
      ...createTodoDto,
    };

    this.connection.todos.push(todo);

    return todo;
  }

  public async updateTodoById(todoDto: Todo) {
    const todo = this.connection.todos.find((todo) => todo.id === todoDto.id);

    if (!todo) {
      return false;
    }

    todo.title = todoDto.title;

    todo.description = todoDto.description;

    todo.isCompleted = todoDto.isCompleted;

    return todo;
  }

}
