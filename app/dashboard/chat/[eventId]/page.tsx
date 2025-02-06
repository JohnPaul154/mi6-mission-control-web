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
import { get, onValue, ref, set } from "firebase/database";
import { realtimeDB, firestoreDB } from "@/firebase/init-firebase";
import { useParams } from "next/navigation";
import { doc, getDoc, Timestamp, DocumentReference } from "firebase/firestore";
import { EventData, AgentData, ArsenalData } from "@/firebase/collection-types"

const convertTo12HourFormat = (time24: string): string => {
  if (time24 == "") {
    return "";
  }

  const [hours, minutes] = time24.split(":").map(Number);
  
  console.log(hours, minutes)

  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error("Invalid time format");
  }

  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;  // Convert hour to 12-hour format, handling midnight (00:00) and noon (12:00)
  const formattedTime = `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
  
  return formattedTime;
};

export default function EventChatPage() {
  // Parameters (in the url)
  const params = useParams();
  const { eventId } = params as { eventId: string };

  // Chat parameters
  const { currentChat, setCurrentChat, sendMessage } = useChat();
  const { session } = useSession();
  const { messages } = useChat();

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef(null);

  // Global states
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [event, setEvent] = useState<EventData | null>(null);

  // Message states
  const [message, setMessage] = useState("");
  const [agents, setAgents] = useState<any[]>([])
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");

  // Function that loads everytime you get to this screen
  useEffect(() => {
    if (eventId) {

      // Fetch event details and fill fields
      const fetchEvent = async () => {
        try {
          const docRef = doc(firestoreDB, "events", eventId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as EventData;

            // Resolve agents
            const agentNames = await Promise.all(
              (data.agents || []).map(async (agentRef: DocumentReference) => {
                const agentDoc = await getDoc(agentRef);
                if (agentDoc.exists()) {
                  const agentData = agentDoc.data() as AgentData;
                  return `${agentData.firstName} ${agentData.lastName}`;
                }
                return "Unknown Agent";
              })
            );

            // Resolve arsenal and add type for filtering later
            const arsenalNames = await Promise.all(
              (data.arsenal || []).map(async (itemRef: DocumentReference) => {
                const itemDoc = await getDoc(itemRef);
                if (itemDoc.exists()) {
                  const itemData = itemDoc.data() as ArsenalData;
                  return `${itemData.name}@${itemData.type}` || "Unnamed Arsenal";
                }
                return "Unknown Arsenal";
              })
            );

            setEvent({
              id: docSnap.id || "Unknown ID", // Firestore document ID
              agentNames: agentNames,
              arsenalNames: arsenalNames,
              ...data, // Spread all other properties from data
            });
          } else {
            console.error("Event not found");
          }
        } catch (error) {
          console.error("Error fetching event data:", error);
        }
      };

      fetchEvent();

    }
  }, [eventId, shouldRefetch]);

  // Set current chat ID
  useEffect(() => {
    setCurrentChat({ id: eventId });
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

  // Fetch status and notes in realtime
  useEffect(() => {
    const statusRef = ref(realtimeDB, `chats/${eventId}/info/status`);
    const notesRef = ref(realtimeDB, `chats/${eventId}/info/notes`);

    // Listen for changes in both fields
    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      const value = snapshot.val();
      if (value) {
        setStatus(value);
      }
    });

    const unsubscribeNotes = onValue(notesRef, (snapshot) => {
      const value = snapshot.val();
      if (value) {
        setNotes(value);
      }
    });

    return () => {
      // Unsubscribe from both listeners when the component unmounts
      unsubscribeStatus();
      unsubscribeNotes();
    };
  }, [eventId]);

  // Handle changing the status
  const handleStatusChange = (newStatus: string) => {
    const statusRef = ref(realtimeDB, `chats/${eventId}/info/status`);
    set(statusRef, newStatus);
    setStatus(newStatus);
  };

  // Handle changing the notes
  const handleNotesChange = (newNotes: string) => {
    const notesRef = ref(realtimeDB, `chats/${eventId}/info/notes`);
    set(notesRef, newNotes);
    setNotes(newNotes);
  };

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
            <CardTitle className="text-lg font-semibold">Event: {event?.eventName}</CardTitle>
            <h3 className="text-sm ">Team: {event?.agentNames?.join(", ") || "No Agents Assigned"}</h3>
          </div>

          <Popover>
            <PopoverTrigger>
              <MoreVertical className="w-6 h-6 cursor-pointer hover:text-gray-700" />
            </PopoverTrigger>
            <PopoverContent className="flex flex-col p-4 max-h-[50vh] overflow-y-auto">

              {/* Status */}
              <h2 className="text-2xl self-center font-semibold pb-2 mb-2">Status</h2>

              <div className="w-full p-2 bg-zinc-800 rounded-lg shadow-md mb-4">
                <div className="flex justify-center gap-2">
                  <button
                    className={`w-24 h-8 px-2 rounded-md text-center text-sm ${status === "good" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    onClick={() => handleStatusChange("good")}
                  >
                    Good
                  </button>
                  <button
                    className={`w-24 h-8 px-2 rounded-md text-center text-sm  ${status === "alert" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    onClick={() => handleStatusChange("alert")}
                  >
                    Alert
                  </button>
                  <button
                    className={`w-24 h-8 px-2 rounded-md text-center text-sm  ${status === "critical" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    onClick={() => handleStatusChange("critical")}
                  >
                    Critical
                  </button>
                </div>
              </div>

              <div className="w-full mb-4 px-2">
                <label>Notes: </label>
                <textarea
                    className="w-full p-2"
                    value={notes || ''}
                    onChange={(e) => handleNotesChange(e.target.value)}
                  />
              </div>

                  
              

              {/* Details */}
              <h2 className="text-2xl self-center font-semibold">Details</h2>

              <div className="w-full p-4 rounded-md shadow-sm">
                <p className="text-sm mt-2">Event Name: {event?.eventName}</p>
                <p className="text-sm mt-2">Location: {event?.location}</p>
                <p className="text-sm mt-2">Date: {event?.eventDate}</p>
                <p className="text-sm mt-2">Layout: {event?.layout}</p>
                <p className="text-sm mt-2">Package: {event?.package}</p>
                <p className="text-sm mt-2">Number of SD Card: {event?.sdCardCount}</p>
                <p className="text-sm mt-2">Number of Battery: {event?.batteryCount}</p>
                <p className="text-sm mt-2">HQT: {convertTo12HourFormat(event?.hqt || "")}</p>
                <p className="text-sm mt-2">AOP: {convertTo12HourFormat(event?.aop || "")}</p>
                <p className="text-sm mt-2">Contact Person: {event?.contactPerson}</p>
                <p className="text-sm mt-2">Contact Number: {event?.contactNumber}</p>
                <p className="text-sm mt-2">Notes:</p>
                <p className="text-sm mt-2 text-wrap">{event?.notes}</p>
              </div>


              {/* Arsenal */}
              <h2 className="text-2xl self-center  font-semibold pb-4">Arsenal</h2>

              <div className=" w-full p-4 mb-4 rounded-md shadow-sm">
                <h3 className="text-lg font-semibold">Camera</h3>
                {event?.arsenalNames && event.arsenalNames.length > 0 ? (
                  (() => {
                    const filteredItems = event.arsenalNames.filter((item) => item.includes("@camera")); // Filter arsenal items by type "printer"

                    return filteredItems.length > 0 ? (
                      filteredItems.map((cameraItem, index) => {
                        const [name] = cameraItem.split("@"); // Extract the name before "@printer"
                        return (
                          <p key={index} className="text-sm mt-2">
                            {name}
                          </p>
                        );
                      })
                    ) : (
                      <p className="text-sm mt-2">No assigned</p>
                    );
                  })()
                ) : (
                  <p className="text-sm mt-2">No assigned</p>
                )}
              </div>

              <div className="w-full p-4 mb-4 rounded-md shadow-sm">
                <h3 className="text-lg font-semibold">Laptop</h3>
                {event?.arsenalNames && event.arsenalNames.length > 0 ? (
                  (() => {
                    const filteredItems = event.arsenalNames.filter((item) => item.includes("@laptop")); // Filter arsenal items by type "printer"

                    return filteredItems.length > 0 ? (
                      filteredItems.map((laptopItem, index) => {
                        const [name] = laptopItem.split("@"); // Extract the name before "@printer"
                        return (
                          <p key={index} className="text-sm mt-2">
                            {name}
                          </p>
                        );
                      })
                    ) : (
                      <p className="text-sm mt-2">No assigned</p>
                    );
                  })()
                ) : (
                  <p className="text-sm mt-2">No assigned</p>
                )}
              </div>

              <div className=" w-full p-4 mb-4 rounded-md shadow-sm">
                <h3 className="text-lg font-semibold">Printer</h3>
                {event?.arsenalNames && event.arsenalNames.length > 0 ? (
                  (() => {
                    const filteredItems = event.arsenalNames.filter((item) => item.includes("@printer")); // Filter arsenal items by type "printer"

                    return filteredItems.length > 0 ? (
                      filteredItems.map((printerItem, index) => {
                        const [name] = printerItem.split("@"); // Extract the name before "@printer"
                        return (
                          <p key={index} className="text-sm mt-2">
                            {name}
                          </p>
                        );
                      })
                    ) : (
                      <p className="text-sm mt-2">No assigned</p>
                    );
                  })()
                ) : (
                  <p className="text-sm mt-2">No assigned</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
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
                  <div className="group relative flex items-center gap-3 max-w-[60%]">
                    <div className="p-3 rounded-lg bg-blue-200 text-stone-900">
                      <div>{message.text}</div>
                    </div>
                    <div className="text-xs text-gray-400 absolute top-1/2 left-[-4rem] transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
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
                      <div className="group relative">
                        <div className="p-3 rounded-lg bg-gray-100 text-stone-900 relative flex flex-col">
                          <div>{message.text}</div>
                        </div>
                        <div className="text-xs text-gray-400 absolute top-1/2 right-[-4rem] transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>

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
            disabled={event?.isArchive}
          />
          <Button onClick={handleSendMessage} disabled={event?.isArchive}>Send</Button>
        </CardFooter>

      </Card>
    </div>
  );
}
