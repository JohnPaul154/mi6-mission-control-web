'use client'

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventCard } from "@/components/event-card";
import { collection, getDocs, getDoc, addDoc, updateDoc, doc, deleteDoc, Timestamp, DocumentReference, query, where } from "firebase/firestore";
import { firestoreDB, realtimeDB } from "@/firebase/init-firebase";
import { AgentData, EventData } from "@/firebase/collection-types";
import { set, ref, remove } from "firebase/database";
import { useSession } from "@/contexts/SessionContext";
import { Trash, ArchiveRestore, Search } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


interface AgentCardProps {
  name: string;
  id: string;
  onUpdate?: () => void;
}

const AgentCard = ({ name, id, onUpdate }: AgentCardProps & { onUpdate: () => void }) => {
  const handleDelete = async () => {
    try {
      const docRef = doc(firestoreDB, "agents", id);
      await deleteDoc(docRef);
      onUpdate();
      console.log("Event deleted successfully!");
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const handleRestore = async () => {
    try {
      const docRef = doc(firestoreDB, "agents", id || "");
      await updateDoc(docRef, {
        isArchive: false
      });

      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const agent = docSnap.data() as AgentData;

        const dataRef = ref(realtimeDB, `agents/${id}`);
        await set(dataRef, {
          status: "offline",
          lastSeen: null,
          position: agent.position,
          name: `${agent.firstName} ${agent.lastName}`,
          email: agent.email,
          avatar: agent.avatar
        });

      } else {
        console.log("No such document!");
        return null;
      }

      onUpdate();
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  return (
    <Card className="w-full rounded-2xl shadow-lg border flex justify-between">
      <CardContent className="p-6 self-center">
        <div className="text-lg font-semibold">{name}</div>
        <div className="text-sm text-zinc-500 mt-1">ID: {id}</div>
      </CardContent>
      <CardFooter className="flex flex-col justify-end gap-4 py-6 px-4">
        <AlertDialog>
          <AlertDialogTrigger className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white">
            <ArchiveRestore className="w-5 h-5" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restore Agent</AlertDialogTitle>
            </AlertDialogHeader>
            <p>Are you sure you want to restore {name}?</p>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRestore}>
                Restore
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger className="flex items-center p-2 hover:bg-zinc-500 rounded-md">
            <Trash className="w-5 h-5" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="py-2">
              <p className="text-red-500 font-semibold">This is irreversable!</p>
              <p>Are you sure you want to permanently delete {name}?</p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
};


export default function ArchivePage() {

  // Global parameters
  const { session } = useSession()
  const isAdmin = session!.role === "admin";

  // Event states
  const [events, setEvents] = useState<EventData[]>([]);
  const [trigger, setTrigger] = useState(false);
  const [selectedTab, setSelectedTab] = useState("events");
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [searchEvent, setSearchEvent] = useState("");
  const [refetchEvent, setRefetchEvent] = useState(true);
  const [searchAgent, setSearchAgent] = useState("");
  const [refetchAgent, setRefetchAgent] = useState(true);

  // Trigger when event cards do an action
  const triggerUpdate = () => {
    setTrigger((prev) => !prev);
  };

  // Random status for placeholder
  const statuses: ("good" | "alert" | "critical")[] = ["good", "alert", "critical"];
  const randomStatus: "good" | "alert" | "critical" = statuses[Math.floor(Math.random() * statuses.length)];

  // Fetch the event data and ensure the references are resolved before rendering
  const fetchEvents = async () => {
    try {
      let q = query(
        collection(firestoreDB, "events"),
        where("isArchive", "==", true)
      );

      // Fetch only those assigned to the user if not admin
      if (session!.role !== "admin") {
        q = query(q, where("agents", "array-contains", session!.id));
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
          notes: data.notes || "",
          hqt: data.hqt || "",
          aop: data.aop || "",
          isArchive: data.isArchive || false,
        };
      });

      // Resolve all events and filter archived ones
      const resolvedEvents = await Promise.all(eventPromises);

      // Client-side filtering based on the search query
      const filteredEvents = resolvedEvents.filter((event) => {
        if (searchEvent && searchEvent.trim() !== "") {
          // Make both eventName and search query lowercase for case-insensitive comparison
          const lowerCaseSearch = searchEvent.trim().toLowerCase();
          return event.eventName.toLowerCase().includes(lowerCaseSearch);
        }
        return true;  // Return all if there's no search query
      });

      // Update state variables
      setEvents(filteredEvents as EventData[]);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const fetchAgents = async () => {
    try {
      let q = query(
        collection(firestoreDB, "agents"),
        where("isArchive", "==", true)
      );

      const querySnapshot = await getDocs(q);

      // Map the Firestore documents to an array of agents
      const agents = querySnapshot.docs.map((doc) => ({
        id: doc.id, // Include the document ID
        ...doc.data() as AgentData, // Include the document fields
      }));

      // Client-side filtering based on the search query
      const filteredAgents = agents.filter((agent) => {
        if (searchAgent && searchAgent.trim() !== "") {
          // Make both search query, firstName, and lastName lowercase for case-insensitive comparison
          const lowerCaseSearch = searchAgent.trim().toLowerCase();
          return (
            agent.firstName.toLowerCase().includes(lowerCaseSearch) ||
            agent.lastName.toLowerCase().includes(lowerCaseSearch)
          );
        }
        return true;  // Return all if there's no search query
      });

      console.log(filteredAgents)

      // Set the agents using setAgents
      setAgents(filteredAgents);
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchAgents();
  }, [trigger]);

  useEffect(() => {
    fetchEvents();
  }, [refetchEvent])

  useEffect(() => {
    fetchAgents();
  }, [refetchAgent])

  const searchEvents = () => {
    setRefetchEvent(!refetchEvent)
  }

  const searchAgents = () => {
    setRefetchAgent(!refetchAgent)
  }

  return (
    <div className="min-full h-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4">Archive</h1>

      <Card className="flex flex-col w-full h-full">
        <CardContent className="flex-1 flex p-6 gap-6 overflow-hidden">

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="grid w-full">
            <div className="flex flex-col">
              {/* Type Selector */}
              <TabsList className={`flex-none ${isAdmin ? "grid grid-cols-2" : ""}`}>
                <TabsTrigger value="events" className="w-full">Events</TabsTrigger>
                {isAdmin && (<TabsTrigger value="agents">Agents</TabsTrigger>)}
              </TabsList>

              <TabsContent value="events" className="mt-6">
                <form className="flex gap-3 pb-6 pt-0" onSubmit={(e) => { e.preventDefault(); searchEvents(); }}>
                  <Input
                    value={searchEvent}
                    onChange={(e) => setSearchEvent(e.target.value)}
                    placeholder="Search for event..."
                    className="flex-1"
                  />
                  <Button type="submit">
                    <Search />
                  </Button>
                </form>

                {/* Event List */}
                <ScrollArea className="w-full rounded-md border">
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
                      <p>No archived events</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="agents" className="mt-6">
                <form className="flex gap-3 pb-6 pt-0" onSubmit={(e) => { e.preventDefault(); searchAgents(); }}>
                  <Input
                    value={searchAgent}
                    onChange={(e) => setSearchAgent(e.target.value)}
                    placeholder="Search for agent..."
                    className="flex-1"
                  />
                  <Button type="submit">
                    <Search />
                  </Button>
                </form>
                <ScrollArea className="w-full rounded-md border">
                  <div className="p-4 space-y-4">
                    {agents.length > 0 ? (
                      agents.map((agent) => (
                        <AgentCard
                          key={agent.id}
                          name={`${agent.firstName} ${agent.lastName}`}
                          id={agent.id || ""}
                          onUpdate={triggerUpdate}
                        />
                      ))
                    ) : (
                      <p>No archived agents</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
