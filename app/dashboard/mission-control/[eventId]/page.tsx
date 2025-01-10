'use client';

import { useState, useEffect } from "react";
import { useParams } from 'next/navigation';
import { getDoc, doc, Timestamp, DocumentReference, updateDoc } from "firebase/firestore";
import { firestoreDB } from "@/firebase/init-firebase"; // Adjust path if necessary
import { EventData, AgentData, ArsenalData } from "@/firebase/collection-types";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@radix-ui/react-separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function EventPage() {
  const params = useParams();
  const { eventId } = params as { eventId: string }; // Explicitly typing the parameter
  const [event, setEvent] = useState<EventData | null>(null);
  const [agentList, setAgentList] = useState<string[]>([]); // State for agents
  const [arsenalList, setArsenalList] = useState<string[]>([]); // State for arsenal
  const [eventDate, setEventDate] = useState<string>(""); 
  const [isEditable, setIsEditable] = useState(false); // State for edit mode

  useEffect(() => {
    if (eventId) {
      const fetchEvent = async () => {
        try {
          const docRef = doc(firestoreDB, "events", eventId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as EventData;

            console.log(data)

            // Resolve event date
            data.eventDate && data.eventDate instanceof Timestamp
              ? setEventDate(data.eventDate.toDate().toLocaleDateString() || "")
              : setEventDate("Unknown Date");

            // Resolve agents
            const agentNames = await Promise.all(
              (data.agents || []).map(async (agentRef: DocumentReference) => {
                const agentDoc = await getDoc(agentRef);
                if (agentDoc.exists()) {
                  const agentData = agentDoc.data() as AgentData;
                  return `${agentData.firstName} ${agentData.lastName}`;
                }
                return "Unknown Agent";
              })
            );

            setAgentList(agentNames);

            // Resolve arsenal
            const arsenalNames = await Promise.all(
              (data.arsenal || []).map(async (itemRef: DocumentReference) => {
                const itemDoc = await getDoc(itemRef);
                if (itemDoc.exists()) {
                  const itemData = itemDoc.data() as ArsenalData;
                  return itemData.name || "Unnamed Arsenal";
                }
                return "Unknown Arsenal";
              })
            );

            setArsenalList(arsenalNames);

            // Update state with resolved data
            setEvent({
              id: docSnap.id || "Unknown ID", // Firestore document ID
              ...data, // Spread all other properties from data
            });
          } else {
            console.error("Event not found");
          }
        } catch (error) {
          console.error("Error fetching event data:", error);
        }
      };

      fetchEvent();
    }
  }, [eventId]);

  if (!event) return <div>Loading...</div>;

  const handleEditClick = () => {
    setIsEditable(!isEditable); // Toggle edit mode
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    setEvent({
      ...event,
      [field]: e.target.value
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setEvent({
      ...event,
      eventDate: new Timestamp(newDate.getTime() / 1000, 0)
    });
  };

  // Placeholder function for saving changes
  const handleSaveChanges = async () => {
    if (event && event.id) {
      try {
        const docRef = doc(firestoreDB, "events", event.id);
        await updateDoc(docRef, {
          eventName: event.eventName,
          location: event.location,
          package: event.package,
          contactNumber: event.contactNumber,
          contactPerson: event.contactPerson,
          eventDate: event.eventDate
        });

        console.log("Event data updated successfully!");
        setIsEditable(false); // Exit edit mode after saving
      } catch (error) {
        console.error("Error saving event data:", error);
      }
    }
  };

  return (
    <div className="min-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4">
        Mission Control
        <span className="text-3xl text-zinc-700"> / </span>
        {event.eventName}
      </h1>

      <Card className="flex flex-col">
        <CardContent className="flex flex-col p-6 gap-6">
          <Card className="flex flex-col mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-6">Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Event Name</label>
                  {isEditable ? (
                    <input
                      type="text"
                      className="border p-2 w-full"
                      value={event.eventName}
                      onChange={(e) => handleInputChange(e, 'eventName')}
                      placeholder="Enter event name"
                    />
                  ) : (
                    <p>{event.eventName}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-1">Location</label>
                  {isEditable ? (
                    <input
                      type="text"
                      className="border p-2 w-full"
                      value={event.location}
                      onChange={(e) => handleInputChange(e, 'location')}
                      placeholder="Enter location"
                    />
                  ) : (
                    <p>{event.location}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-1">Package</label>
                  {isEditable ? (
                    <input
                      type="text"
                      className="border p-2 w-full"
                      value={event.package}
                      onChange={(e) => handleInputChange(e, 'package')}
                      placeholder="Enter package"
                    />
                  ) : (
                    <p>{event.package}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-1">Date</label>
                  {isEditable ? (
                    <input
                      type="date"
                      className="border p-2 w-full"
                      value={eventDate}
                      onChange={handleDateChange}
                    />
                  ) : (
                    <p>{eventDate}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-1">Contact Person</label>
                  {isEditable ? (
                    <input
                      type="text"
                      className="border p-2 w-full"
                      value={event.contactNumber}
                      onChange={(e) => handleInputChange(e, 'contactNumber')}
                      placeholder="Enter contact person"
                    />
                  ) : (
                    <p>{event.contactNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-1">Contact Number</label>
                  {isEditable ? (
                    <input
                      type="text"
                      className="border p-2 w-full"
                      value={event.contactPerson}
                      onChange={(e) => handleInputChange(e, 'contactPerson')}
                      placeholder="Enter contact number"
                    />
                  ) : (
                    <p>{event.contactPerson}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Agents</h2>
              <ScrollArea className="h-60 w-full rounded-md border">
                <div className="p-4 space-y-4">
                  {agentList && agentList.length > 0 ? (
                    agentList.map((agent, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center">
                          <p>{agent}</p>
                          <button
                            type="button"
                            onClick={() => { /* Add your remove logic here */ }}
                            className="text-red-500"
                          >
                            Remove
                          </button>
                        </div>
                        <Separator/>
                      </div>
                    ))
                  ) : (
                    <p>No agents available</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="flex flex-col mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Arsenal</h2>
              <ScrollArea className="h-60 w-full rounded-md border">
                <div className="p-4 space-y-4">
                  {arsenalList && arsenalList.length > 0 ? (
                    arsenalList.map((item, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center">
                          <p>{item}</p>
                          <button
                            type="button"
                            onClick={() => { /* Add your remove logic here */ }}
                            className="text-red-500"
                          >
                            Remove
                          </button>
                        </div>
                        <Separator/>
                      </div>
                    ))
                  ) : (
                    <p>No arsenal items available</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="flex">
            <button
              onClick={handleEditClick}
              className="bg-blue-500 text-white py-2 px-4 rounded"
            >
              {isEditable ? "Cancel" : "Edit"}
            </button>
            {isEditable && (
              <button
                onClick={handleSaveChanges}
                className="bg-green-500 text-white py-2 px-4 rounded ml-4"
              >
                Save Changes
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
