'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Edit, Archive, Trash, ArchiveRestore } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardFooter
} from "@/components/ui/card";

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

import { firestoreDB, realtimeDB } from "@/firebase/init-firebase";
import { updateDoc, doc, deleteDoc, query, collection, where, getDocs } from "firebase/firestore";
import { remove, ref, onValue } from "firebase/database";

interface EventCardProps {
  id: string;
  date: string;
  eventName: string;
  location: string;
  agents: string[];
  status: string;
  role: string;
  isArchive: boolean;
  onUpdate?: () => void;
}

export function EventCard({
  id,
  date,
  eventName,
  location,
  agents,
  role,
  isArchive,
  onUpdate,
}: EventCardProps & { onUpdate: () => void }) {

  // Global parameters
  const router = useRouter();
  const isAdmin = role === "admin";
  let statusBgClass = "";

  const[status, setStatus] = useState("");

  // Switch for status
  switch (status) {
    case "good":
      statusBgClass = "bg-green-500";
      break;
    case "alert":
      statusBgClass = "bg-orange-500";
      break;
    case "critical":
      statusBgClass = "bg-red-500";
      break;
  }

  // Fetch status realtime
  useEffect(() => {
    const statusRef = ref(realtimeDB, `chats/${id}/info/status`);

    // Listen for changes
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const value = snapshot.val();
      if (value) {
        setStatus(value);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Button Handlers
  const handleEditClick = () => {
    router.push(`/dashboard/events/${id}`);
  };

  const handleArchive = async () => {
    try {
      const docRef = doc(firestoreDB, "events", id);
      await updateDoc(docRef, {
        isArchive: true,
      });
      onUpdate();
      console.log("Field updated successfully!");
    } catch (error) {
      console.error("Error updating field:", error);
    }
  };

  const handleRestore = async () => {
    try {
      const docRef = doc(firestoreDB, "events", id);
      await updateDoc(docRef, {
        isArchive: false,
      });
      onUpdate();
      console.log("Field updated successfully!");
    } catch (error) {
      console.error("Error updating field:", error);
    }
  }

  const handleDelete = async () => {
    try {
      const docRef = doc(firestoreDB, "events", id);
      await deleteDoc(docRef);
      const q = query(collection(firestoreDB, "reviews"), where("eventId", "==", docRef));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });
      onUpdate();
      const dataRef = ref(realtimeDB, `chats/${id}`); // Replace with your data path
      remove(dataRef)
      console.log("Event deleted successfully!");
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  }

  // Go to chat
  const handleEventClick = (id: string) => {
    router.push(`/dashboard/chat/${id}`); // Navigate to chat if it's not archived
  };

  return (
    <Card className="flex w-full max-w-full items-center p-4 shadow-md rounded-md hover:bg-neutral-200 cursor-pointer">
      <CardContent className="w-full p-0">
        <div
          key={id}
          onClick={() => handleEventClick(id || "")}
          className="flex flex-row w-full"
        >
          {/* Date Partition */}
          <div className="flex-none min-w-32 items-center flex justify-center">
            <div>{date || "No Date"}</div>
          </div>

          {/* Event Info Partition */}
          <div className="flex-1 flex flex-col pl-4">
            <p className="text-lg font-bold">Event: {eventName}</p>
            <p className="text-sm text-gray-500">Location: {location}</p>

            {/* Agents List */}
            <div className="flex gap-2 mt-2 flex-wrap">
              Team:
              {agents.length > 0 ? (
                agents.map((agent, index) => (
                  <Badge key={index} className="bg-zinc-400 py-1 px-2 rounded-md">
                    {agent}
                  </Badge>
                ))
              ) : (
                <Badge key={"no-assigned"} className="bg-zinc-400 py-1 px-2 rounded-md">
                  No Agents Assigned
                </Badge>
              )}
            </div>
          </div>

          {/* Status Partition */}
          {!isArchive && (
            <div
              className={`flex items-center justify-center flex-none w-1/6 py-2 text-white font-medium rounded-md ${statusBgClass}`}
            >
              {status ? status.charAt(0).toUpperCase() + status.substr(1).toLowerCase() : ''}
            </div>
          )}
        </div>
      </CardContent>

      {/* Control Partition Edit|Archive (only for admin) */}
      {isAdmin && (
        <CardFooter className="flex flex-col justify-end gap-4 p-2">
          {isArchive ? (
            // If it is archived, show "Return" and "Delete" buttons
            <>
              <button
                onClick={handleEditClick}
                className="flex items-center p-2 hover:bg-zinc-500 rounded-md"
              >
                <Edit className="w-5 h-5" />
              </button>

              <AlertDialog>
                <AlertDialogTrigger className="flex items-center p-2 hover:bg-zinc-500 rounded-md">
                  <Trash className="w-5 h-5" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Event</AlertDialogTitle>
                  </AlertDialogHeader>
                  <div className="py-2">
                    <p className="text-red-500 font-semibold">This is irreversable!</p>
                    <p>Are you sure you want to permanently delete this event?</p>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            // If not archived, show "Edit" and "Archive" buttons
            <>
              <button
                onClick={handleEditClick}
                className="flex items-center p-2 hover:bg-zinc-500 rounded-md"
              >
                <Edit className="w-5 h-5" />
              </button>

              <AlertDialog>
                <AlertDialogTrigger className="flex items-center p-2 hover:bg-zinc-500 rounded-md">
                  <Archive className="w-5 h-5" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive Event</AlertDialogTitle>
                  </AlertDialogHeader>
                  <div className="py-2">
                    Are you sure you want to archive this event?
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleArchive}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
