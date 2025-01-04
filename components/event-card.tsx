import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Edit, Archive } from "lucide-react"; // Import Lucide Edit and Archive icons
import { Badge } from "@/components/ui/badge"; // Import Badge component

// Profile Card
interface EventCardProps {
  date: string; // Date of the event
  eventName: string;
  location: string;
  agents: string[]; // List of agent names
  status: "good" | "alert" | "critical"; // Status with three levels
}

export function EventCard({
  date,
  eventName,
  location,
  agents,
  status,
}: EventCardProps) {
  // Define the status text and background color styles
  let statusText = "Status";
  let statusBgClass = "";

  switch (status) {
    case "good":
      statusBgClass = "bg-green-500";
      break;
    case "alert":
      statusBgClass = "bg-red-500";
      break;
    case "critical":
      statusBgClass = "bg-yellow-500";
      break;
  }

  return (
    <Card className="flex w-full max-w-full items-center p-4 shadow-md rounded-md">
      <CardContent className="flex flex-row w-full gap-6 pt-0 pb-0">
        {/* Date Partition */}
        <div className="flex items-center flex-none text-sm text-zinc-500">{date}</div>

        {/* Event Info Partition */}
        <div className="flex-1 flex flex-col">
          <p className="text-lg font-bold">{eventName}</p>
          <p className="text-sm text-gray-500">{location}</p>

          {/* Agents List */}
          <div className="flex gap-2 mt-2 flex-wrap">
            {agents.map((agent, index) => (
              <Badge key={index} className="bg-zinc-200 py-1 px-2 rounded-md">
                {agent}
              </Badge>
            ))}
          </div>
        </div>

        {/* Status Partition (with background as a Card) */}
        <div
          className={`flex items-center justify-center flex-none w-1/6 py-2 text-white font-medium rounded-md ${statusBgClass}`}
        >
          {statusText}
        </div>
      </CardContent>

      {/* Control Partition (Edit, Archive) */}
      <CardFooter className="flex flex-col justify-end gap-4 p-2">
        <button className="flex items-center p-2 hover:bg-zinc-500 rounded-md">
          <Edit className="w-5 h-5" />
        </button>
        <button className="flex items-center p-2 hover:bg-zinc-500 rounded-md">
          <Archive className="w-5 h-5" />
        </button>
      </CardFooter>
    </Card>
  );
}
