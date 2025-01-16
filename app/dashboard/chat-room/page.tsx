'use client';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { MoreVertical } from "lucide-react";

export default function ChatRoomPage() {
  const [messages, setMessages] = useState<{ id: number; text: string; sender: string }[]>([
    { id: 1, text: "Hello! How can I help you today?", sender: "bot" },
  ]);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: inputValue.trim(), sender: "user" },
    ]);
    setInputValue("");
  };

  return (
    <div className="min-full h-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4 min-h-[3%]">Chat</h1>

      <Card className="w-full h-full max-h-[96%] flex flex-col justify-between">
        <CardHeader className="flex-none min-h-[5%] flex flex-row justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Event: Ann & Mark Wedding</CardTitle>
            <p className="text-sm text-gray-200">Team: John Doe, Jane Smith, Bob Brown</p>
          </div>
          <MoreVertical className="w-6 h-6 cursor-pointer hover:text-gray-700"/>
        </CardHeader>

        {/* Message Container */}
        <CardContent className="flex-1 overflow-y-auto mx-6 flex flex-col space-y-4 max-h-[85%]">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg ${
                message.sender === "user"
                  ? "bg-blue-100 text-stone-900 self-end text-right"
                  : "bg-gray-100 text-stone-900 self-start"
              }`}
            >
              {message.text}
            </div>
          ))}
        </CardContent>

        <CardFooter className="flex flex-none gap-2 min-h-[5%]">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage}>Send</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
