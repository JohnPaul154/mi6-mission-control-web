'use client'

import React from 'react';
import { ChatProvider } from '@/contexts/ChatContext'; // Make sure this is the correct path

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      {children}
    </ChatProvider>
  );
};