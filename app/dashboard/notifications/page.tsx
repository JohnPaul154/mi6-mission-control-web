'use client'

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell } from "lucide-react";
import { ref, onValue } from "firebase/database";
import { useSession } from "@/contexts/SessionContext";
import { firestoreDB, realtimeDB } from "@/firebase/init-firebase";
import { formatDistanceToNow } from "date-fns";

interface Notif {
  id?: string;
  dateSent: string | number | Date;
  eventName: string;
  eventId: string;
  notifMsg: string;
}

function getRelativeDate(date: string | number | Date): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "Invalid date";
  }
}

function NotifCard({ id, dateSent, eventName, notifMsg, isNew }: Notif & { isNew: boolean }) {
  return (
    <Card key={id} className="w-full mx-auto shadow-md rounded-2xl p-4 cursor-pointer hover:bg-muted">
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <Bell className="w-5 h-5 text-primary" />
            <span>{eventName}</span>
          </div>
          {isNew && (
            <span className="text-xs text-white bg-red-500 px-2 py-0.5 rounded-full">
              New
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span>{getRelativeDate(dateSent)}</span>
        </div>
        <p className="text-sm">{notifMsg}</p>
      </CardContent>
    </Card>
  );
}

export default function NotificationsPage() {
  const { session } = useSession();
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [seenNotifIds, setSeenNotifIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const dataRef = ref(realtimeDB, "notifications");
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let itemsArray = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value,
        }));

        // ✅ Sort by dateSent (newest first)
        itemsArray.sort((a, b) => new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime());

        // Update seen notifications
        setSeenNotifIds((prev) => {
          const updated = new Set(prev);
          itemsArray.forEach((notif) => {
            if (!updated.has(notif.id)) {
              updated.add(notif.id);
            }
          });
          return updated;
        });

        setNotifications(itemsArray);
      } else {
        setNotifications([]);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-full h-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4">Notifications</h1>
      <Card className="flex flex-col w-full h-full">
        <CardContent className="flex-1 p-6 gap-6 overflow-hidden">
          <ScrollArea className="w-full max-h-[90vh] rounded-md border">
            <div className="p-4 space-y-4">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <NotifCard
                    key={notif.id}
                    {...notif}
                    isNew={!seenNotifIds.has(notif.id!)} // Show "New" if unseen
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
