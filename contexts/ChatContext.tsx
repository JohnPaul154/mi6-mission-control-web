import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { ChatService, Message } from '../firebase/chat';

interface Chat {
  id: string;
  name?: string; // Add other relevant fields if necessary
}

interface ChatContextValue {
  currentChat: Chat | null;
  setCurrentChat: (chat: Chat | null) => void;
  messages: Message[];
  sendMessage: (chatId: string, userId: string, message: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (currentChat?.id) {
      const unsubscribe = ChatService.subscribeToMessages(
        currentChat.id,
        setMessages
      );
      return () => unsubscribe();
    }
  }, [currentChat]);

  const value: ChatContextValue = {
    currentChat,
    setCurrentChat,
    messages,
    sendMessage: ChatService.sendMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = (): ChatContextValue => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
