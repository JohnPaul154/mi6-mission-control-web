'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'

import { collection, getDocs, getDoc, addDoc, Timestamp, DocumentReference, query, where, doc } from "firebase/firestore";
import { firestoreDB, realtimeDB } from "@/firebase/init-firebase";
import { AgentData, EventData } from "@/firebase/collection-types";
import { MessageCircle, Info, Archive } from "lucide-react";

import { get, onValue, ref, set } from "firebase/database";
import { useSession } from "@/contexts/SessionContext";



interface ParsedEventData {
  id: string;
  title: string;
  start: string;
  location: string;
  agentNames: string[];
  isArchive: boolean;
  end: string;
  allDay: boolean;
}


// Functional Component for Event Content
const RenderEventContent = ({ eventInfo }: { eventInfo: any }) => {
  const id = eventInfo.event.id;
  const [status, setStatus] = useState("");

  let statusBgClass = "";

  switch (status) {
    case "good":
      statusBgClass = "bg-green-600";
      break;
    case "alert":
      statusBgClass = "bg-orange-600";
      break;
    case "critical":
      statusBgClass = "bg-red-600";
      break;
    default:
      statusBgClass = "bg-slate-600";
      break;
  }

  // Fetch status in real-time from Firebase
  useEffect(() => {
    const statusRef = ref(realtimeDB, `chats/${id}/info/status`);

    // Listen for changes
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const value = snapshot.val();
      if (value) {
        setStatus(value);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [id]);

  const handleStatusChange = (newStatus: string) => {
    const statusRef = ref(realtimeDB, `chats/${id}/info/status`);
    set(statusRef, newStatus);
    setStatus(newStatus);
  };

  return (
    <div className={`relative group p-2 m-1 rounded-md text-wrap ${eventInfo.event.extendedProps.isArchive ? "bg-slate-800" : statusBgClass}`}>
      <strong>Event: {eventInfo.event.title}</strong>
      <p>Location: {eventInfo.event.extendedProps.location}</p>
      <p>Agents: {(eventInfo.event.extendedProps.agentNames || []).join(", ") || "No Agents Assigned"}</p>

      {/* Buttons with Icons */}
      <div className="flex mt-4 space-x-2">

        {/* Chat Button */}
        <a
          href={`/dashboard/chat/${id}`}
          className="flex items-center justify-center w-1/2 py-1 bg-white text-stone-900 rounded-md hover:bg-[#eeeeee] transition"
        >
          <MessageCircle className="w-5 h-5 mr-2"/> Chat
        </a>

        {/* More Info Button */}
        <a
          href={`/dashboard/events/${id}`}
          className="flex items-center justify-center w-1/2 py-1 bg-black text-white rounded-md hover:bg-stone-800 transition"
        >
          <Info className="w-5 h-5 mr-2"/> Info
        </a>

      </div>
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();

  const { session } = useSession()
  const isAdmin = session!.role === "admin";

  const [events, setEvents] = useState<EventData[]>([]); // State for events
  const [parsedEvents, setParsedEvents] = useState<ParsedEventData[]>([]);

  // Fetch the event data and ensure the references are resolved before rendering
  const fetchEvents = async () => {
    try {
      let q = query(
        collection(firestoreDB, "events")
      );

      console.log(session!.id)

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
          notes: data.notes || "",
          hqt: data.hqt || "",
          aop: data.aop || "",
          isArchive: data.isArchive || false,
        };
      });

      // Resolve all events and filter archived ones
      const resolvedEvents = await Promise.all(eventPromises);

      // Update state variables
      setEvents(resolvedEvents as EventData[]);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    // Only map and set parsedEvents after events are fetched
    if (events.length > 0) {
      const extractedEvents = events.map(event => ({
        id: event.id,
        title: event.eventName,
        location: event.location,
        agentNames: event.agentNames,
        isArchive: event.isArchive,
        start: event.eventDate,
      })) as ParsedEventData[];

      setParsedEvents(extractedEvents);
      console.log(extractedEvents)
    }
  }, [events]);

  return (
    <div className="w-full p-6">
      <FullCalendar
        plugins={[dayGridPlugin]}
        selectable={true}
        initialView='dayGridMonth'
        weekends={true}
        events={parsedEvents}
        eventContent={(eventInfo) => <RenderEventContent eventInfo={eventInfo} />}
        height={"89vh"}
        eventBackgroundColor="#00000000"
        eventBorderColor="#00000000"
       
      />
      <div className="flex gap-4 p-4 my-4 flex-auto justify-between border rounded-md">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-green-600" />
        <span className="text-white text-sm">Good</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-orange-600" />
        <span className="text-white text-sm">Alert</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-red-600" />
        <span className="text-white text-sm">Critical</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-slate-600" />
        <span className="text-white text-sm">Archived</span>
      </div>
      </div>
    </div>
  );
}