import { describe, test, expect, mock } from 'bun:test';
import { mockComponent } from '@asenajs/asena/test';
import { isHttpException } from '@asenajs/asena/adapter';
import { ChatService, type ChatRoomRow, type MessageRow } from '../../src/services/ChatService';

const room: ChatRoomRow = {
  id: 1,
  name: 'General',
  description: null,
  createdBy: 7,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const message: MessageRow = {
  id: 11,
  content: 'hello',
  roomId: 1,
  senderId: 7,
  isRead: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

/** Explicit double — ChatRepository is injected by name, not by class. */
function createChatRepositoryDouble() {
  return {
    create: mock(async (data: Omit<ChatRoomRow, 'id' | 'createdAt'>) => ({ ...room, ...data })),
    findAllRooms: mock(async () => [] as ChatRoomRow[]),
    findRoomById: mock(async () => room as ChatRoomRow | null),
    deleteById: mock(async () => true),
    findMember: mock(async () =>
      ({ id: 1, roomId: 1, userId: 7, joinedAt: new Date() }) as {
        id: number;
        roomId: number;
        userId: number;
        joinedAt: Date;
      } | null,
    ),
    insertMember: mock(async () => undefined),
    deleteMember: mock(async () => undefined),
    createMessage: mock(async (data: Omit<MessageRow, 'id' | 'createdAt'>) => ({ ...message, ...data })),
    findMessageById: mock(async () => message as MessageRow | null),
    findMessagesByRoomId: mock(async () => [] as MessageRow[]),
    markMessageAsRead: mock(async () => undefined),
    deleteMessageById: mock(async () => undefined),
  };
}

async function expectHttpError(promise: Promise<unknown>, status: number): Promise<void> {
  try {
    await promise;
    throw new Error('should have thrown');
  } catch (error) {
    expect(isHttpException(error as Error)).toBe(true);
    expect((error as { status?: number }).status).toBe(status);
  }
}

describe('ChatService', () => {
  test('getRoom throws 404 when the room does not exist', async () => {
    const chatRepository = createChatRepositoryDouble();
    const { instance } = mockComponent(ChatService, { overrides: { chatRepository } });

    chatRepository.findRoomById.mockResolvedValue(null);

    await expectHttpError(instance.getRoom(7, 999), 404);
  });

  test('getRoom throws 403 for a non-member', async () => {
    const chatRepository = createChatRepositoryDouble();
    const { instance } = mockComponent(ChatService, { overrides: { chatRepository } });

    chatRepository.findMember.mockResolvedValue(null);

    await expectHttpError(instance.getRoom(8, 1), 403);
  });

  test('createRoom registers the creator as the first member', async () => {
    const chatRepository = createChatRepositoryDouble();
    const { instance } = mockComponent(ChatService, { overrides: { chatRepository } });

    await instance.createRoom(7, { name: 'General' });

    expect(chatRepository.insertMember).toHaveBeenCalledWith(1, 7);
  });

  test('joinRoom throws 404 for a missing room and is otherwise idempotent-safe', async () => {
    const chatRepository = createChatRepositoryDouble();
    const { instance } = mockComponent(ChatService, { overrides: { chatRepository } });

    chatRepository.findRoomById.mockResolvedValue(null);

    await expectHttpError(instance.joinRoom(8, 999), 404);

    chatRepository.findRoomById.mockResolvedValue(room);

    await instance.joinRoom(8, 1);

    expect(chatRepository.insertMember).toHaveBeenCalledWith(1, 8);
  });

  test('leaveRoom refuses the owner (403) but not a regular member', async () => {
    const chatRepository = createChatRepositoryDouble();
    const { instance } = mockComponent(ChatService, { overrides: { chatRepository } });

    await expectHttpError(instance.leaveRoom(7, 1), 403);
    expect(chatRepository.deleteMember).not.toHaveBeenCalled();

    await instance.leaveRoom(8, 1);

    expect(chatRepository.deleteMember).toHaveBeenCalledWith(1, 8);
  });

  test('deleteRoom throws 403 for a non-owner and deletes for the owner', async () => {
    const chatRepository = createChatRepositoryDouble();
    const { instance } = mockComponent(ChatService, { overrides: { chatRepository } });

    await expectHttpError(instance.deleteRoom(8, 1), 403);
    expect(chatRepository.deleteById).not.toHaveBeenCalled();

    await instance.deleteRoom(7, 1);

    expect(chatRepository.deleteById).toHaveBeenCalledWith(1);
  });

  test('createMessage throws 403 for a non-member', async () => {
    const chatRepository = createChatRepositoryDouble();
    const { instance } = mockComponent(ChatService, { overrides: { chatRepository } });

    chatRepository.findMember.mockResolvedValue(null);

    await expectHttpError(instance.createMessage(8, 1, 'hi'), 403);
    expect(chatRepository.createMessage).not.toHaveBeenCalled();
  });

  test('deleteMessage throws 403 when called by someone other than the sender', async () => {
    const chatRepository = createChatRepositoryDouble();
    const { instance } = mockComponent(ChatService, { overrides: { chatRepository } });

    await expectHttpError(instance.deleteMessage(8, 11), 403);
    expect(chatRepository.deleteMessageById).not.toHaveBeenCalled();
  });

  test('markMessageAsRead requires membership of the message room', async () => {
    const chatRepository = createChatRepositoryDouble();
    const { instance } = mockComponent(ChatService, { overrides: { chatRepository } });

    chatRepository.findMember.mockResolvedValue(null);

    await expectHttpError(instance.markMessageAsRead(8, 11), 403);
    expect(chatRepository.markMessageAsRead).not.toHaveBeenCalled();
  });

  test('getMessages clamps the page size to the CHAT_MAX_PAGE_SIZE default (100)', async () => {
    const chatRepository = createChatRepositoryDouble();
    const { instance } = mockComponent(ChatService, { overrides: { chatRepository } });

    await instance.getMessages(7, 1, 5000);

    expect(chatRepository.findMessagesByRoomId).toHaveBeenCalledWith(1, 100);
  });

  test('a @Value field is pinned through overrides like any other field', async () => {
    const chatRepository = createChatRepositoryDouble();
    const { instance } = mockComponent(ChatService, { overrides: { chatRepository, maxPageSize: 10 } });

    await instance.getMessages(7, 1, 5000);

    expect(chatRepository.findMessagesByRoomId).toHaveBeenCalledWith(1, 10);
  });
});
