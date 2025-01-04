'use client'

import { useState } from "react"; // Import useState
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import { EventCard } from "@/components/event-card"; // Import EventCard
import { Plus } from "lucide-react"; // Import Plus icon from lucide-react

// Define the Event type with specific allowed values for status
type Event = {
  date: string;
  name: string;
  location: string;
  agentList: string[];
  status: "good" | "alert" | "critical"; // Allow only these three statuses
};

// Sample events data
const initialEvents: Record<string, Event> = {
  "1": {
    date: "2025-01-01",
    name: "Mission Alpha",
    location: "Mars Base",
    agentList: ["John Doe", "Jane Smith"],
    status: "good",
  },
  "2": {
    date: "2025-02-15",
    name: "Mission Beta",
    location: "Moon Base",
    agentList: ["Sam Wilson", "Mark Lee"],
    status: "alert",
  },
  "3": {
    date: "2025-03-20",
    name: "Mission Gamma",
    location: "Space Station",
    agentList: ["Lucy Brown", "Chris Walker"],
    status: "critical",
  },
};

export default function MissionControlPage() {
  // Use useState to manage events, ensuring it's not undefined
  const [events, setEvents] = useState<Record<string, Event>>(initialEvents);

  // Placeholder function to add a new event (without implementation for now)
  const handleAddEvent = () => {
    console.log("Add Event functionality is currently not implemented.");
    // You can later implement logic here to add events
  };

  return (
    <div className="min-full h-full w-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4">Mission Control</h1>

      <Card className="flex flex-col w-full h-full">
        <CardContent className="flex p-6 h-full gap-6">
          {/* Scrollable Area in the CardContent */}
          <ScrollArea className="h-full w-full rounded-md border">
            <div className="p-4 space-y-4">
              {/* Safely checking if events exist and mapping */}
              {events &&
                Object.entries(events).map(([id, event]) => (
                  <EventCard
                    key={id}
                    date={event.date} // Show date
                    eventName={event.name} // Show event name
                    location={event.location} // Show location
                    agents={event.agentList} // Show agent list
                    status={event.status} // Show status (active, inactive, pending)
                  />
                ))}
            </div>
          </ScrollArea>
        </CardContent>

        {/* Add Button in CardFooter */}
        <CardFooter className="flex justify-end">
          <button
            onClick={handleAddEvent} // Trigger add event function
            className="flex items-center p-2 bg-blue-500 text-white rounded-md"
          >
            <Plus className="mr-2" /> Add Event
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
