'use client'

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventCard } from "@/components/event-card";
import { Plus } from "lucide-react";
import { collection, getDocs, getDoc, addDoc, Timestamp, DocumentReference } from "firebase/firestore";
import { firestoreDB, realtimeDB } from "@/firebase/init-firebase";
import { AgentData, EventData } from "@/firebase/collection-types"; 
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
import { set, ref } from "firebase/database";

export default function MissionControlPage() {
  const router = useRouter();

  const [events, setEvents] = useState<EventData[]>([]); // State for events
  const [isDialogOpen, setIsDialogOpen] = useState(false); // State for the AlertDialog visibility
  const [newEventName, setNewEventName] = useState("");

  const statuses: ("good" | "alert" | "critical")[] = ["good", "alert", "critical"];
  const randomStatus: "good" | "alert" | "critical" = statuses[Math.floor(Math.random() * statuses.length)];

  // Fetch the event data and ensure the references are resolved before rendering
  const fetchEvents = async () => {
    try {
      const querySnapshot = await getDocs(collection(firestoreDB, "events"));
      const eventsData: EventData[] = [];
  
      // Fetch all event documents
      const eventPromises = querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data() as Partial<EventData>;
  
        // Resolve agent references to their actual data (use IDs for rendering)
        const agentNames = await Promise.all(
          (data.agents || []).map(async (agentRef: DocumentReference) => {
            try {
              const agentDoc = await getDoc(agentRef);
              if (agentDoc.exists()) {
                const agentData = agentDoc.data() as AgentData;
                return `${agentData.firstName} ${agentData.lastName}`;
              }
            } catch (error) {
              console.warn("Error fetching agent data:", error);
            }
            return "Unknown Agent";
          })
        );
  
        // Resolve arsenal references to their names
        const arsenalNames = await Promise.all(
          (data.arsenal || []).map(async (arsenalRef: DocumentReference) => {
            try {
              const arsenalDoc = await getDoc(arsenalRef);
              if (arsenalDoc.exists()) {
                const arsenalData = arsenalDoc.data();
                return arsenalData.name || "Unnamed Arsenal";
              }
            } catch (error) {
              console.warn("Error fetching arsenal data:", error);
            }
            return "Unknown Arsenal";
          })
        );
  
        // Return the event data with resolved names
        return {
          id: docSnapshot.id,
          agentNames,
          arsenalNames,
          agents: data.agents || [],
          arsenal: data.arsenal || [],
          contactNumber: data.contactNumber || "N/A",
          contactPerson: data.contactPerson || "Unknown",
          dateAdded: data.dateAdded || new Timestamp(0, 0),
          eventDate: data.eventDate || "",
          eventName: data.eventName || "Unnamed Event",
          location: data.location || "Unknown Location",
          package: data.package || "No Package",
          layout: data.layout || "No Layout",
          notes: data.notes || "",
          isArchive: data.isArchive || false,
        };
      });
  
      // Resolve all events and filter archived ones
      const resolvedEvents = await Promise.all(eventPromises);
      const filteredEvents = resolvedEvents.filter((event) => !event.isArchive);
  
      // Update state variables
      setEvents(filteredEvents);
  
      console.log(filteredEvents); // Debugging log for events
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };
  

  useEffect(() => {
    fetchEvents();
  }, []);

  // Handle adding a new event
  const handleAddEvent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  
    // Creating the event data with only eventName and placeholders for other fields
    const newEvent = {
      eventName: newEventName || "Untitled Event", // Use input or a default value
      location: "Unknown Location", // Placeholder
      agents: [], // Empty array for agents
      arsenal: [], // Empty array for arsenal
      contactNumber: "N/A", // Placeholder
      contactPerson: "N/A", // Placeholder
      package: "N/A", // Placeholder
      callTime: Timestamp.now(), // Default to now
      eventDate: "", // Placeholder event date
      dateAdded: "", // Current timestamp
      isArchive: false, // Default isArchive value
    };
  
    try {
      // Add the new event to Firestore
      const docRef = await addDoc(collection(firestoreDB, "events"), newEvent);

      // Get the ID of the newly created document
      const newEventId = docRef.id;

      console.log("New Event ID:", newEventId);

      // Redirect to the newly created event's page
      router.push(`/dashboard/mission-control/${newEventId}`);

      // Add to realtimeDB
      const eventRef = ref(realtimeDB, `/dashboard/mission-control/${newEventId}`);
      await set(eventRef, {
        info: {
          name: newEvent.eventName,
          createdAt: Timestamp.now(),
        },
        messages: {},
        participants: {},
      });
  
      // Fetch the updated events list (optional if you're updating state elsewhere)
      fetchEvents();
  
      // Redirect to the events list or the event details page
      router.push(`/events/${newEventId}`);
    } catch (error) {
      console.error("Error adding event:", error);
    } finally {
      // Close the dialog after adding the event
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="min-full h-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4">Mission Control</h1>

      <Card className="flex flex-col w-full h-full">
        <CardContent className="flex-1 flex p-6 gap-6 overflow-hidden">
          <ScrollArea className="w-full max-h-[80vh] rounded-md border">
            <div className="p-4 space-y-4 ">
              {events.length > 0 ? (
                events.map((event) => (
                  <EventCard
                    key={event.id}
                    id={event.id || ""}
                    date={""}
                    eventName={event.eventName}
                    location={event.location || "Unknown Location"}
                    agents={event.agentNames || []}
                    status={randomStatus}
                  />
                ))
              ) : (
                <p>No events available</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="flex-none flex justify-end">
          {/* Trigger for opening the AlertDialog */}
          <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogTrigger className="flex items-center p-2 bg-blue-500 text-white rounded-md">
              <Plus className="mr-2" /> Add Event
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Add New Event</AlertDialogTitle>
              </AlertDialogHeader>

              {/* Event Form */}
              <form onSubmit={handleAddEvent}>
                <label className="block mb-4">Event Name</label>
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="w-full p-2 border rounded-md mb-4"
                  placeholder="Enter event name"
                  required
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction type="submit">Add</AlertDialogAction>
                </AlertDialogFooter>
              </form>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
