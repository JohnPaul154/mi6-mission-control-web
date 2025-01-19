'use client';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";
import { useChat } from '@/contexts/ChatContext';
import { useSession } from "@/contexts/SessionContext";
import { get, ref } from "firebase/database";
import { realtimeDB } from "@/firebase/init-firebase";


export default function MI6ChatRoomPage() {

  // Chat parameters 
  const { currentChat, setCurrentChat, sendMessage } = useChat();
  const { session } = useSession();
  const { messages } = useChat();

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef(null);

  // Chat states
  const [message, setMessage] = useState("");
  const [agents, setAgents] = useState<any[]>([])

  // Set chat to mi6-chat-room
  useEffect(() => {
    setCurrentChat({ id: "mi6-chat-room" });
  }, [setCurrentChat]);


  // Fetch agents when the component mounts
  const getAllAgents = async (): Promise<any[]> => {
    try {
      // Reference to the /agents path
      const agentsRef = ref(realtimeDB, "agents");

      // Get the snapshot of the /agents path
      const snapshot = await get(agentsRef);

      if (snapshot.exists()) {
        const agentsData = snapshot.val();
        // Convert the object into an array of agents
        const agents = Object.entries(agentsData).map(([id, data]) => {
          if (data && typeof data === "object") {
            return { id, ...data };
          } else {
            console.warn(`Invalid data for agent ${id}:`, data);
            return { id }; // Return only the ID if the data is invalid
          }
        });

        console.log("Agents retrieved successfully:", agents);
        return agents;
      } else {
        console.log("No agents found.");
        return [];
      }
    } catch (error) {
      console.error("Error retrieving agents:", error);
      return [];
    }
  };

  useEffect(() => {
    const fetchAgents = async () => {
      const agentsList = await getAllAgents();
      setAgents(agentsList);
    };

    fetchAgents();
  }, []);


  // Scroll to the bottom when new messages are added
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Message handlers
  const handleSendMessage = async () => {
    console.log(message)
    if (message.trim() && currentChat?.id) {
      await sendMessage(currentChat.id, session!.id, message);
      setMessage('');
    }
  };

  const getAgentById = (userId: string) => {
    const agent = agents.find((agent) => agent.id === userId);
    return agent;
  };

  return (
    <div className="min-full h-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4 min-h-[3%]">Chat</h1>

      <Card className="w-full h-full max-h-[96%] flex flex-col justify-between">

        {/* Header */}
        <CardHeader className="flex-none min-h-[5%] flex flex-row justify-between border-b-2">
          <div>
            <CardTitle className="text-lg font-semibold">MI6 Chat Room</CardTitle>
          </div>
        </CardHeader>

        {/* Message Container */}
        <CardContent
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto mx-6 flex flex-col space-y-4 h-full max-h-[80%]"
        >
          {messages.map((message, index) => {
            const agent = getAgentById(message.senderId);
            const isCurrentUser = message.senderId === session!.id;
            const isLastFromSender = index === messages.length - 1 || messages[index + 1].senderId !== message.senderId;

            return (
              <div
                key={message.id}
                className={`flex ${isCurrentUser ? "justify-end text-right" : "justify-start text-left"} text-wrap`}
              >
                {/* For the current user's message, only show the text */}
                {isCurrentUser ? (
                  <div className="p-3 rounded-lg bg-blue-200 text-stone-900 max-w-[60%]">
                    <div>{message.text}</div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 max-w-[60%]">

                    {isLastFromSender ? (
                      <img
                        src={agent?.avatar || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp"}  // Default to Gravatar if avatar is missing
                        alt={`${agent?.name} profile`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12" />  // Placeholder div for non-last sender
                    )}

                    <div>
                      <div className="p-3 rounded-lg bg-gray-100 text-stone-900 relative flex flex-col">
                        <div>{message.text}</div>
                      </div>

                      {/* Show Name at the bottom only for the last message from the sender */}
                      {isLastFromSender && (
                        <div className="text-xs text-white-900 mt-2">
                          {agent ? agent.name : "Unknown"}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </CardContent>

        {/* Send Message */}
        <CardFooter className="flex flex-none gap-2 min-h-[5%]">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage}>Send</Button>
        </CardFooter>
        
      </Card>
    </div>
  );
}
