'use client';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { get, onValue, ref, set, update } from "firebase/database";
import { realtimeDB, firestoreDB } from "@/firebase/init-firebase";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc, Timestamp, DocumentReference, updateDoc, query, collection, where, getDocs } from "firebase/firestore";
import { EventData, AgentData, ArsenalData, ReviewData } from "@/firebase/collection-types"
import ProgressBar from "@/components/event-progress";
import StarRatingInput from "@/components/star-rating-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Import AlertDialog components
import { useChat } from "@/contexts/ChatContext";
import { useSession } from "@/contexts/SessionContext";
import { Input } from "@/components/ui/input";


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

export default function CustomerPage() {
  // Parameters (in the url)
  const router = useRouter();
  const params = useParams();
  const { eventId } = params as { eventId: string };
  
  // Chat parameters
  const { currentChat, setCurrentChat, sendMessage } = useChat();
  const { session } = useSession();
  const { messages } = useChat();

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef(null);

  // Global states
  const [review, setReview] = useState<ReviewData | null>(null);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [event, setEvent] = useState<EventData | null>(null);
  const [agents, setAgents] = useState<DocumentReference[]>([]);

  // Message states
  const [checklist, setChecklist] = useState<{ [key: string]: { completed: boolean; timestamp: number } }>({});
  const [message, setMessage] = useState("");


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
    setCurrentChat({ id: `${eventId}-CST` });
  }, []);

  // Fetch checklist from Firebase
  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        const snapshot = await get(ref(realtimeDB, `chats/${eventId}/info/checklist`));
        if (snapshot.exists()) {
          const data = snapshot.val();

          // Define the fixed order
          const order = [
            "arrivalHQ", 
            "onTheWayToEvent", 
            "arrivalEvent", 
            "setupDone", 
            "missionComplete", 
            "cleanup", 
            "onTheWayToHQ",
            "returnHQ"];

          // Sort checklist based on the defined order
          const sortedChecklist = Object.fromEntries(
            order
              .filter((key) => key in data) // Ensure only existing keys are included
              .map((key) => [key, data[key]]) // Map to key-value pairs
          );

          console.log(sortedChecklist)

          setChecklist(sortedChecklist);
        }
      } catch (error) {
        console.error("Error fetching checklist:", error);
      }
    };

    fetchChecklist();
  }, [eventId]);

  useEffect(() => {
      if (eventId) {
  
        const eventRef = doc(firestoreDB, "events", eventId);
  
        console.log(eventRef.id)

        // Fetch event details and fill fields
        const fetchReview = async () => {
          try {
            const q = query(collection(firestoreDB, "reviews"), where("eventId", "==", eventRef));
            const querySnapshot = await getDocs(q);
  
            if (!querySnapshot.empty) {
              const docSnap = querySnapshot.docs[0]; // Get the first matching document
              const data = docSnap.data() as ReviewData;
  
              setReview({
                id: docSnap.id,
                ...data, // Spread all other properties from data
              });
  
              setRating(data.rating)
  
              const agentList: DocumentReference[] = await getAgentsFromEvent(eventId);
  
              setAgents(agentList)
  
            } else {
              console.error("Review not found for eventID:", eventId);
            }
          } catch (error) {
            console.error("Error fetching event data:", error);
          }
        };
  
        fetchReview();
  
      }
    }, [eventId, shouldRefetch]);

  const updateRatingRealtimeDB = async (agentId: string, newRating: number) => {
    try {
      const ratingRef = ref(realtimeDB, `agents/${agentId}`); // Adjust the path as needed
      const snapshot = await get(ratingRef);
  
      if (snapshot.exists()) {
        const data = snapshot.val();
        const currentRating = data.rating || 0;
        const ratingCount = data.ratingCount || 0;
  
        // Calculate the new rating (assuming an average rating system)
        const updatedRating = currentRating + newRating;
        const updatedRatingCount = ratingCount + 1;
  
        // Update in Firebase
        await update(ratingRef, {
          rating: updatedRating,
          ratingCount: updatedRatingCount,
        });
  
        console.log("Rating updated successfully!");
      } else {
        console.error("Review not found.");
      }
    } catch (error) {
      console.error("Error updating rating:", error);
    }
  };

  const getAgentsFromEvent = async (eventId: string): Promise<DocumentReference[]> => {
    try {
      const eventRef = doc(firestoreDB, "events", eventId);
      const eventSnap = await getDoc(eventRef);
  
      if (eventSnap.exists()) {
        const eventData = eventSnap.data();
        const agentIds: string[] = eventData.agents || []; // Assuming `agents` is an array of IDs
  
        // Convert agent IDs to DocumentReference<AgentData> objects
        return eventData.agents
      } else {
        console.error("Event not found.");
        return [];
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
      return [];
    }
  };

  const handleSaveChanges = async () => {
      if (review && review.id) {
        try {
          const docRef = doc(firestoreDB, "reviews", review.id);
          await updateDoc(docRef, {
            rating: rating,
            review: review.review
          });
  
          console.log("Review data updated successfully!");
  
          await Promise.all(agents.map(agentRef => 
            updateRatingRealtimeDB(agentRef.id, rating)
          ));
        } catch (error) {
          console.error("Error saving event data:", error);
        }
      }
    };

  // Format timestamp
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleString(); // Format timestamp as readable date
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
      await sendMessage(currentChat.id, "customer", message);
      setMessage('');
    }
  };

  const getAgentById = (userId: string) => {
    const agent = agents.find((agent) => agent.id === userId);
    return agent;
  };

  return (
    <div className="min-full h-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold text-center mb-4 ml-4 min-h-[3%]">{event?.eventName || "Event"}</h1>

      <Card className="w-[50%] h-full max-h-[96%] flex flex-col justify-between self-center">

        {/* Header */}
        <CardHeader className="flex-none min-h-[5%] flex flex-row justify-between border-b-2">
          <div>
            <h2 className="text-sm font-bold">Team Leader: {event?.agentNames?.[0] || "No Agents Assigned"}</h2>
            <h3 className="text-sm ">Team: {event?.agentNames?.slice(1).join(", ") || "No Agents Assigned"}</h3>
          </div>
        </CardHeader>
        <div className="px-4">
          <ProgressBar checklist={checklist}/>
        </div>

        <CardFooter className="flex flex-col flex-none border-t min-h-[5%] p-4">
        {checklist.missionComplete?.completed ? (
          <div className="w-full flex flex-col">
            <h3 className="my-2 self-center">Review</h3>
            
            <div className="mb-4 flex justify-center">
              <StarRatingInput value={rating} onChange={setRating} disabled={Boolean(review?.rating && review?.review)}/>
            </div>
              
            <textarea
              className="w-full h-[10rem] p-4 border text-white"
              value={review?.review}
              disabled={Boolean(review?.rating && review?.review)}
              onChange={(e) => setReview((prev) => prev ? { ...prev, review: e.target.value } : null)}
            />
            <div className="flex flex-row gap-4 w-full">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="mt-4 w-full" disabled={Boolean(review?.rating && review?.rating !== 0 && review?.review)}>Submit</Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit Review</AlertDialogTitle>
                  </AlertDialogHeader>
                  Submit the review for this event?
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSaveChanges}>Save</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <Card className="flex flex-col w-full h-[40vh]">
            <CardHeader>
              <CardTitle className="pb-4 border-b-2">Real Time Support</CardTitle>
            </CardHeader>
            <CardContent
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto mx-6 flex flex-col space-y-4 h-full max-h-[80%]"
            >
              {messages.map((message, index) => {
                const agent = getAgentById(message.senderId);
                const isCurrentUser = message.senderId === "customer";
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
                            src={"https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp"}
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
            )
          }
        </CardFooter>
        
      </Card>
    </div>
  );
}
