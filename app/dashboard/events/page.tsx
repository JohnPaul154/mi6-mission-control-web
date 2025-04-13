'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventCard } from "@/components/event-card";
import { Plus, Search } from "lucide-react";
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
import { set, ref, get } from "firebase/database";
import { useSession } from "@/contexts/SessionContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sendNotification } from "@/lib/sendNotification";

interface Agent {
  name: string;
  token: string;
}


export default function EventsPage() {
  const router = useRouter();

  const { session } = useSession();
  const isAdmin = session!.role === "admin";

  const [events, setEvents] = useState<EventData[]>([]); // State for events
  const [newEventName, setNewEventName] = useState("");
  const [eventDate, setEventDate] = useState<string>("");
  const [error, setError] = useState<string | null>(null); // State for form errors
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [refetch, setRefetch] = useState(true);

  const eventOptions = ["Wedding", "Christmas Party", "Debut", "Birthday"];
 
  const triggerUpdate = () => {
    setIsDialogOpen(!isDialogOpen); // Toggle dialog state
  };

  // Fetch the event data and ensure the references are resolved before rendering
  const fetchEvents = async () => {
    try {
      console.log(new Date().toLocaleDateString());

      // Initial query to fetch events (no client-side search filtering yet)
      let q = query(
        collection(firestoreDB, "events"),
        where("isArchive", "==", false)
      );

      // Fetch only those assigned to the user if not admin
      if (session!.role !== "admin") {
        q = query(q, where("agents", "array-contains", doc(firestoreDB, "agents", session!.id)));
      }

      // Fetch the events from Firestore without client-side filtering for now
      const querySnapshot = await getDocs(q);
      const eventsData: EventData[] = [];

      // Fetch all event documents
      const eventPromises = querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data() as Partial<EventData>;

        // Resolve agent references to their actual data
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
          agentsAccepted: data.agentsAccepted || [],
          agentsDeclined: data.agentsDeclined || [],
          arsenal: data.arsenal || [],
          contactNumber: data.contactNumber || "",
          contactPerson: data.contactPerson || "",
          dateAdded: data.dateAdded || new Timestamp(0, 0),
          eventDate: data.eventDate || "",
          eventName: data.eventName || "Unnamed Event",
          location: data.location || "",
          package: data.package || "",
          layout: data.layout || "",
          sdCardCount: data.sdCardCount || 0,
          batteryCount: data.batteryCount || 0,
          notes: data.notes || "",
          hqt: data.hqt || "",
          aop: data.aop || "",
          collection: data.collection || "",
          isArchive: data.isArchive || false,
        };
      });

      // Resolve all events
      const resolvedEvents = await Promise.all(eventPromises);

      // Client-side filtering based on the search query
      const filteredEvents = resolvedEvents.filter((event) => {
        if (search && search.trim() !== "") {
          // Make both eventName and search query lowercase for case-insensitive comparison
          const lowerCaseSearch = search.trim().toLowerCase();
          return event.eventName.toLowerCase().includes(lowerCaseSearch);
        }
        return true;  // Return all if there's no search query
      });

      // Update the state with the filtered events
      setEvents(filteredEvents);

      console.log(filteredEvents); // Debugging log for filtered events
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };


  useEffect(() => {
    fetchEvents();
  }, [isDialogOpen, refetch]);

  const searchEvent = () => {
    setRefetch(!refetch);
  };

  const sendPushNotification = async (eventName: string, date: string) => {
    try {
      // get all users TOKENS in realtimeDB
      const agentsRef = ref(realtimeDB, "/agents/");

      const snapshot = await get(agentsRef);

      if (snapshot.exists()) {
        const agentsData: Record<string, Agent> = snapshot.val();
        const filteredAgents = Object.entries(agentsData) 
          .filter(([_, agent]) => agent.token)
          .map(([id, agent]) => ({
            id,
            name: agent.name,
            token: agent.token,
        }));
  
        for(let i = 0; i < filteredAgents.length; i++) {
          const agentToken = filteredAgents[i].token;
          const docRef = doc(firestoreDB, "agents", filteredAgents[i].id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            if(userData.isSuspended === false) {
              await sendNotification(agentToken, "New Event", `${eventName} - ${date}`);
            }
          }
        }

        return filteredAgents;
      } else {
        return [];
      }

    } catch (error) {
      //console.error(`Error sending push notification to agent ${agentId}:`, error);
    }
  };

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
      agents: [],
      agentsAccepted: [],
      agentsDeclined: [],
      arsenal: [],
      contactNumber: "",
      contactPerson: "",
      dateAdded: Timestamp.now(),
      eventDate: eventDate,
      eventName: newEventName,
      location: "",
      package: "",
      layout: "",
      sdCardCount: 0,
      batteryCount: 0,
      notes: "",
      hqt: "",
      aop: "",
      collection: "",
      isArchive: false,
    };

    try {
      // Add the new event to Firestore
      const eventDocRef = await addDoc(collection(firestoreDB, "events"), newEvent);
      const newEventId = eventDocRef.id;

      // Add the new review to Firestore baesd on the eventRef
      const newReview = {
        eventId: eventDocRef,
        rating: 0,
        review: "",
        report: ""
      }

      const reviewDocRef = await addDoc(collection(firestoreDB, "reviews"), newReview);

      // Add to realtimeDB
      const eventRef = ref(realtimeDB, `/chats/${newEventId}`);
      await set(eventRef, {
        info: {
          checklist: {
            arrivalHQ: { completed: false, timestamp: 0 },
            onTheWayToEvent: { completed: false, timestamp: 0 },
            arrivalEvent: { completed: false, timestamp: 0 },
            setupDone: { completed: false, timestamp: 0 },
            missionComplete: { completed: false, timestamp: 0 },
            cleanup: { completed: false, timestamp: 0 },
            onTheWayToHQ: { completed: false, timestamp: 0 },
            returnHQ: { completed: false, timestamp: 0 },
          },
          name: newEvent.eventName,
          notes: "",
          status: "good",
          createdAt: Timestamp.now(),
        },
        messages: {},
      });

      const eventCustRef = ref(realtimeDB, `/chats/${newEventId}-CST`);
      await set(eventCustRef, {
        info: {
          checklist: {
            arrivalHQ: { completed: false, timestamp: 0 },
            onTheWayToEvent: { completed: false, timestamp: 0 },
            arrivalEvent: { completed: false, timestamp: 0 },
            setupDone: { completed: false, timestamp: 0 },
            missionComplete: { completed: false, timestamp: 0 },
            cleanup: { completed: false, timestamp: 0 },
            onTheWayToHQ: { completed: false, timestamp: 0 },
            returnHQ: { completed: false, timestamp: 0 },
          },
          name: newEvent.eventName,
          notes: "",
          status: "good",
          createdAt: Timestamp.now(),
        },
        messages: {},
      });

      // Redirect to the newly created event's page
      router.push(`/dashboard/events/${newEventId}?edit=true`);

      fetchEvents();

      const formattedDate = new Date(eventDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      
      await sendPushNotification(newEventName, formattedDate);
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
        <form className="flex gap-3 p-6 pb-0" onSubmit={(e) => { e.preventDefault(); searchEvent(); }}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for event..."
            className="flex-1"
          />
          <Button type="submit">
            <Search />
          </Button>
        </form>

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
                    status={""}
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
                  <AlertDialogCancel onClick={() => { setEventDate(""); setNewEventName(""); setError("") }}>Cancel</AlertDialogCancel>
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
