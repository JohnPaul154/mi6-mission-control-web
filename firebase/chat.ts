import { realtimeDB } from './init-firebase';
import { ref, push, onValue, query, limitToLast } from 'firebase/database';

export interface Message {
  id?: string;
  text: string;
  senderId: string;
  timestamp: number;
  status: string;
}

export class ChatService {
  static async sendMessage(chatId: string, userId: string, message: string): Promise<void> {
    const messagesRef = ref(realtimeDB, `chats/${chatId}/messages`);
    await push(messagesRef, {
      text: message,
      senderId: userId,
      timestamp: Date.now(),
      status: 'sent',
    });
  }

  static subscribeToMessages(chatId: string, callback: (messages: Message[]) => void): () => void {
    const messagesRef = ref(realtimeDB, `chats/${chatId}/messages`);
    const recentMessagesQuery = query(messagesRef, limitToLast(50));

    return onValue(recentMessagesQuery, (snapshot) => {
      const messages: Message[] = [];
      snapshot.forEach((child) => {
        messages.push({ id: child.key, ...child.val() } as Message);
      });
      callback(messages);
    });
  }
}