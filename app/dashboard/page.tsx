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

import { collection, getDocs, getDoc, addDoc, Timestamp, DocumentReference, query, where, doc } from "firebase/firestore";
import { firestoreDB, realtimeDB } from "@/firebase/init-firebase";
import { AgentData, EventData } from "@/firebase/collection-types";

import { set, ref } from "firebase/database";
import { useSession } from "@/contexts/SessionContext";


interface ParsedEventData {
  title: string;
  start: string;
  location: string;
  end: string;
  allDay: boolean;
}


function renderEventContent(eventInfo:any) {
  return (
    <div>
      <strong>{eventInfo.event.title}</strong>
      <p>{eventInfo.event.location}</p>
    </div>
  )
}

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
          collection(firestoreDB, "events"),
          where("isArchive", "==", false)
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
        setEvents(resolvedEvents);
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
          title: event.eventName,
          location: event.location,
          start: event.eventDate,
        })) as ParsedEventData[];
  
        setParsedEvents(extractedEvents);
        console.log(extractedEvents)
      }
    }, [events]);

  return (
    <div className="min-h-[80%] w-full p-6">
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView='dayGridMonth'
        weekends={true}
        events={parsedEvents}
        eventContent={renderEventContent}
        height={"90vh"}
      />
    </div>
  );
}
