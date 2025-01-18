'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Edit, Archive } from "lucide-react";
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

// EventCard Props, including both date and time and a unique id
interface EventCardProps {
  id: string; // Unique identifier for the event
  date: string; // Date of the event
  eventName: string;
  location: string;
  agents: string[]; // List of agent names
  status: "good" | "alert" | "critical"; // Status with three levels
}

export function EventCard({
  id,
  date,
  eventName,
  location,
  agents,
  status,
}: EventCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false); // State to manage the dialog visibility
  const router = useRouter(); // useRouter hook for navigation

  // Define the status text and background color styles
  let statusText = "Status";
  let statusBgClass = "";

  switch (status) {
    case "good":
      statusBgClass = "bg-green-500";
      statusText = "Good";
      break;
    case "alert":
      statusBgClass = "bg-yellow-500";
      statusText = "Alert";
      break;
    case "critical":
      statusBgClass = "bg-red-500";
      statusText = "Critical";
      break;
  }

  // Handle Edit button click (navigate to the edit page with id as query)
  const handleEditClick = () => {
    router.push(`/dashboard/mission-control/${id}`); // Navigate with event id for editing
  };

  // Handle Archive button click (show the dialog)
  const handleArchiveClick = () => {
    setIsDialogOpen(true);
  };

  // Handle archiving the event (just a placeholder function for now)
  const handleConfirmArchive = () => {
    console.log(`Event with id ${id} archived!`);
    setIsDialogOpen(false); // Close the dialog after confirming
  };

  const handleEventClick = (id: string) => {
      // Navigate to the event details page
      router.push(`/dashboard/chat/${id}`);
    };

  return (
    <Card className="flex w-full max-w-full items-center p-4 shadow-md rounded-md">
      <CardContent className="w-full">
        <div
          key={id}
          onClick={() => handleEventClick(id || "")}
          className="flex flex-row w-full gap-6 pt-0 pb-0"
        >
          {/* Date Partition */}
          <div className="flex-none min-w-32 items-center flex justify-center">
            <div>{date}</div>
          </div>

          {/* Event Info Partition */}
          <div className="flex-1 flex flex-col">
            <p className="text-lg font-bold">Event: {eventName}</p>
            <p className="text-sm text-gray-500">Location: {location}</p>

            {/* Agents List */}
            <div className="flex gap-2 mt-2 flex-wrap">
              Team: 
              {agents.length > 0 ? (
                agents.map((agent, index) => (
                  <Badge key={index} className="bg-zinc-200 py-1 px-2 rounded-md">
                    {agent}
                  </Badge>
                ))
              ) : (
                <Badge key={"no-assigned"} className="bg-zinc-200 py-1 px-2 rounded-md">
                  No Agents Assigned
                </Badge>
              )}
            </div>
          </div>

          {/* Status Partition */}
          <div
            className={`flex items-center justify-center flex-none w-1/6 py-2 text-white font-medium rounded-md ${statusBgClass}`}
          >
            {statusText}
          </div>
      </div>
      </CardContent>

      {/* Control Partition (Edit, Archive) */}
      <CardFooter className="flex flex-col justify-end gap-4 p-2">
        {/* Edit Button */}
        <button
          onClick={handleEditClick}
          className="flex items-center p-2 hover:bg-zinc-500 rounded-md"
        >
          <Edit className="w-5 h-5" />
        </button>

        {/* Archive Button */}
        <AlertDialog>
          <AlertDialogTrigger className="flex items-center p-2 hover:bg-zinc-500 rounded-md">
            <Archive className="w-5 h-5" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Archive</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="py-2">
              Are you sure you want to archive this event?
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDialogOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmArchive}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
