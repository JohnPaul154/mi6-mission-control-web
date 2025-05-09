'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventCard } from "@/components/event-card";
import { Plus, Search, CalendarDays, Bell } from "lucide-react";
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
import { set, ref, get, onValue, serverTimestamp } from "firebase/database";
import { useSession } from "@/contexts/SessionContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sendNotification } from "@/lib/sendNotification";
import { formatDistanceToNow } from "date-fns";

function getRelativeDate(date: string | number | Date | Timestamp ): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "Invalid date";
  }
}

interface Agent {
  name: string;
  token: string;
}

interface Notif {
  id?: string;
  dateSent: Timestamp;
  eventName: string;
  eventId: string;
  notifMsg: string;
}

type NotifCardProps = {
  id: string;
  dateSent: string;
  eventName: string;
  eventId: string;
  notifMsg: string;
};

export default function NotificationsPage() {
  const router = useRouter();

  const { session } = useSession();
  const isAdmin = session!.role === "admin";

  const [events, setEvents] = useState<EventData[]>([]); // State for events
  const [notifications, setNotifications] = useState<Notif[]>([]); // State for notifications
  const [newEventName, setNewEventName] = useState("");
  const [eventDate, setEventDate] = useState<string>("");
  const [error, setError] = useState<string | null>(null); // State for form errors
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [refetch, setRefetch] = useState(true);

  const eventOptions = ["Wedding", "Christmas Party", "Debut", "Birthday"];

  
  function NotifCard({ id, dateSent, eventName, eventId, notifMsg }: NotifCardProps) {
    return (
      <Card key={id} className="w-full mx-auto shadow-md rounded-2xl p-4 cursor-pointer hover:bg-muted" onClick={()=>{router.push(`/dashboard/events/${eventId}`);}}>
        <CardContent className="space-y-2">
          

          <div className="flex items-center gap-2 font-semibold text-lg">
            <Bell className="w-5 h-5 text-primary" />
            <span>{eventName}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>{dateSent}</span>
          </div>

          <p className="text-sm">{notifMsg}</p>
        </CardContent>
      </Card>
    );
  }
 
  const triggerUpdate = () => {
    setIsDialogOpen(!isDialogOpen); // Toggle dialog state
  };

  // Fetch the event data and ensure the references are resolved before rendering
  const fetchNotifications = async () => {
    try {
      console.log(new Date().toLocaleDateString());

      const dataRef = ref(realtimeDB, "notifications");

      const unsubscribe = onValue(dataRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const itemsArray = Object.entries(data).map(([id, value]: [string, any]) => ({
            id,
            ...value,
          }));
          setNotifications(itemsArray);
        } else {
          setNotifications([]);
        }
      });

      return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching events:", error);
      }
  };

  useEffect(() => {
    fetchNotifications();
  }, [isDialogOpen, refetch]);

  return (
    <div className="min-full h-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4 max-h-[3%]">Notifications</h1>

      <Card className="flex flex-col w-full h-full max-h-[96%]">
        {/* <form className="flex gap-3 p-6 pb-0" onSubmit={(e) => { e.preventDefault(); searchEvent(); }}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for event..."
            className="flex-1"
          />
          <Button type="submit">
            <Search />
          </Button>
        </form> */}

        <CardContent className="flex-1 flex p-6 gap-6 overflow-hidden">
          {/* Event List */}
          <ScrollArea className="w-full max-h-[90vh] rounded-md border">
            <div className="p-4 space-y-4 ">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <NotifCard
                    key={notif.id}
                    id={notif.id || ""}
                    dateSent={getRelativeDate(notif.dateSent)}
                    eventName={notif.eventName || ""}
                    eventId={notif.eventId || ""}
                    notifMsg={notif.notifMsg || ""}
                  />
                ))
              ) : (
                <p>No notifications yet</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
