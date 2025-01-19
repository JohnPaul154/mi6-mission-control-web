'use client'

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventCard } from "@/components/event-card";
import { collection, getDocs, getDoc, addDoc, Timestamp, DocumentReference, query, where } from "firebase/firestore";
import { firestoreDB, realtimeDB } from "@/firebase/init-firebase";
import { AgentData, EventData } from "@/firebase/collection-types";
import { set, ref } from "firebase/database";
import { useSession } from "@/contexts/SessionContext";

export default function ArchivePage() {

  // Global parameters
  const { session } = useSession()
  const isAdmin = session!.role === "admin";

  // Event states
  const [events, setEvents] = useState<EventData[]>([]);
  const [trigger, setTrigger] = useState(false);

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
  }, [trigger]);

  return (
    <div className="min-full h-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4">Archive</h1>

      <Card className="flex flex-col w-full h-full">
        <CardContent className="flex-1 flex p-6 gap-6 overflow-hidden">
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
        </CardContent>
      </Card>
    </div>
  );
}
