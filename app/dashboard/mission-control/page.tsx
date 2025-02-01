'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventCard } from "@/components/event-card";
import { Plus } from "lucide-react";
import { collection, getDoc, getDocs, addDoc, Timestamp, DocumentReference, query, where, doc } from "firebase/firestore";
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
import { useSession } from "@/contexts/SessionContext";

export default function MissionControlPage() {

  const router = useRouter();

  const { session } = useSession();
  const isAdmin = session!.role === "admin";

  const [events, setEvents] = useState<EventData[]>([]); // State for events
  const [newEventName, setNewEventName] = useState("");
  const [eventDate, setEventDate] = useState<string>("");
  const [error, setError] = useState<string | null>(null); // State for form errors
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const eventOptions = ["Wedding", "Christmas Party", "Debut", "Birthday"];
  const statuses: ("good" | "alert" | "critical")[] = ["good", "alert", "critical"];
  const randomStatus: "good" | "alert" | "critical" = statuses[Math.floor(Math.random() * statuses.length)];

  const triggerUpdate = () => {
    setIsDialogOpen(!isDialogOpen); // Toggle dialog state
  };

  // Fetch the event data and ensure the references are resolved before rendering
  const fetchEvents = async () => {
    try {
      let q = query(
        collection(firestoreDB, "events"),
        where("isArchive", "==", false)
      );

      // Fetch only those assigned to the user if not admin
      if (session!.role !== "admin") {
        q = query(q, where("agents", "array-contains", doc(firestoreDB, "agents", session!.id)));
      }

      const querySnapshot = await getDocs(q);
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
          contactNumber: data.contactNumber || "",
          contactPerson: data.contactPerson || "",
          dateAdded: data.dateAdded || new Timestamp(0, 0),
          eventDate: data.eventDate || "",
          eventName: data.eventName || "Unamed Event",
          location: data.location || "",
          package: data.package || "",
          layout: data.layout || "",
          sdCardCount: data.sdCardCount || 0,
          batteryCount: data.batteryCount || 0,
          notes: data.notes || "",
          hqt: data.hqt || "",
          aop: data.aop || "",
          isArchive: data.isArchive || false,
        };
      });

      // Resolve all events and filter archived ones
      const resolvedEvents = await Promise.all(eventPromises);

      // Update state variables
      setEvents(resolvedEvents);

      console.log(resolvedEvents); // Debugging log for events
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [isDialogOpen]);

  // Handle adding a new event
  const handleAddEvent = async () => {
    // Check if both fields are filled
    if (!newEventName || !eventDate) {
      setError("Both event name and date are required.");
      return;
    }

    // Clear any previous errors
    setEventDate("");
    setNewEventName("");
    setError(null);

    // Creating the event data with only eventName and placeholders for other fields
    const newEvent = {
      eventName: newEventName,
      location: eventDate,
      agents: [],
      arsenal: [],
      contactNumber: "",
      contactPerson: "",
      package: "",
      layout: "",
      eventDate: "",
      sdCardCount: 0,
      batteryCount: 0,
      hqt: "",
      aop: "",
      dateAdded: Timestamp.now(),
      isArchive: false,
    };

    try {
      // Add the new event to Firestore
      const docRef = await addDoc(collection(firestoreDB, "events"), newEvent);
      const newEventId = docRef.id;

      // Add to realtimeDB
      const eventRef = ref(realtimeDB, `/chats/${newEventId}`);
      await set(eventRef, {
        info: {
          name: newEvent.eventName,
          createdAt: Timestamp.now(),
        },
        messages: {},
      });

      // Redirect to the newly created event's page
      router.push(`/dashboard/mission-control/${newEventId}?edit=true`);

      fetchEvents();
    } catch (error) {
      console.error("Error adding event:", error);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setEventDate(newDate); // Update the eventDate state with the formatted string
  };

  return (
    <div className="min-full h-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4 max-h-[3%]">Mission Control</h1>

      <Card className="flex flex-col w-full h-full max-h-[96%]">
        <CardContent className="flex-1 flex p-6 gap-6 overflow-hidden">
          {/* Event List */}
          <ScrollArea className="w-full max-h-[85vh] rounded-md border">
            <div className="p-4 space-y-4 ">
              {events.length > 0 ? (
                events.map((event) => (
                  <EventCard
                    key={event.id}
                    id={event.id || ""}
                    date={event.eventDate}
                    eventName={event.eventName}
                    location={event.location || "Unknown Location"}
                    agents={event.agentNames || []}
                    status={randomStatus}
                    role={session!.role}
                    isArchive={event.isArchive}
                    onUpdate={triggerUpdate}
                  />
                ))
              ) : (
                <p>No events available</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        {/* Trigger for opening the AlertDialog (only for admin) */}
        {isAdmin && (
          <CardFooter className="flex-none flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger className="flex items-center bg-blue-200 text-zinc-900 border outline-white h-9 font-medium gap-2 px-4 py-2 rounded-md text-sm ml-4">
                <Plus className="w-4 h-4" />Add Event
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Add New Event</AlertDialogTitle>
                </AlertDialogHeader>

                {/* Event Name Input */}
                <div className="relative">
                  <label className="block mb-2">Event Name</label>
                  <input
                    type="text"
                    list="eventOptions"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="Enter or select an event name"
                    required
                  />
                  <datalist id="eventOptions">
                    {eventOptions
                      .filter((option) => option.toLowerCase().includes(newEventName.toLowerCase()))
                      .map((option) => (
                        <option key={option} value={option} />
                      ))}
                  </datalist>
                </div>

                {/* Event Date Input */}
                <div className="">
                  <label className="block mb-2">Event Date</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={handleDateChange}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>

                {/* Error message if fields are empty */}
                {error && <div className="text-red-500">{error}</div>}

                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => {setEventDate("");setNewEventName("");setError("")}}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAddEvent} disabled={!newEventName || !eventDate}>Create Event</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
