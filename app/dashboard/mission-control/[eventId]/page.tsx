'use client';

import { useState, useEffect } from "react";
import { useParams } from 'next/navigation';
import { getDoc, doc, Timestamp, DocumentReference, updateDoc } from "firebase/firestore";
import { firestoreDB } from "@/firebase/init-firebase"; // Adjust path if necessary
import { EventData, AgentData, ArsenalData } from "@/firebase/collection-types";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area";

export default function EventPage() {

  // Parameters (in the url)
  const params = useParams();
  const { eventId } = params as { eventId: string };

  // States
  const [event, setEvent] = useState<EventData | null>(null);
  const [eventDate, setEventDate] = useState<string>("");
  const [isEditable, setIsEditable] = useState(false);

  // Function that loads everytime you get to this screen
  useEffect(() => {
    if (eventId) {
      const fetchEvent = async () => {
        try {
          const docRef = doc(firestoreDB, "events", eventId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as EventData;

            console.log(data)

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



            // Update state with resolved data
            setEventDate(data.eventDate)

            setEvent({
              id: docSnap.id || "Unknown ID", // Firestore document ID
              ...data, // Spread all other properties from data
              agentNames: agentNames,
              arsenalNames: arsenalNames
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    field: string
  ) => {
    setEvent({
      ...event,
      [field]: e.target.value, // Change value based on each textbox
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    // Update state
    setEvent({
      ...event,
      eventDate: newDate, // Store the date to event data
    });
    setEventDate(newDate); // Update the eventDate state with the formatted string
  };

  const handleSaveChanges = async () => {
    if (event && event.id) {
      try {
        const docRef = doc(firestoreDB, "events", event.id);
        await updateDoc(docRef, {
          eventName: event.eventName,
          location: event.location,
          layout: event.layout,
          package: event.package,
          contactPerson: event.contactPerson,
          contactNumber: event.contactNumber,
          eventDate: event.eventDate,
          notes: event.notes,
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

          {/* Details Card */}
          <Card className="flex flex-col mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-6">Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Event Name Field */}
                <div>
                  <label className="block mb-1">Event Name</label>
                  <input
                    type="text"
                    className="border p-2 w-full"
                    value={event.eventName}
                    disabled={!isEditable}
                    onChange={(e) => handleInputChange(e, 'eventName')}
                    placeholder="Enter event name"
                  />
                </div>

                {/* Location Field */}
                <div>
                  <label className="block mb-1">Location</label>
                  <input
                    type="text"
                    className="border p-2 w-full"
                    value={event.location}
                    disabled={!isEditable}
                    onChange={(e) => handleInputChange(e, 'location')}
                    placeholder="Enter location"
                  />
                </div>

                {/* Layout Field */}
                <div>
                  <label className="block mb-1">Layout</label>
                  {isEditable ? (
                    <select
                      className="border p-2 w-full"
                      value={event.layout}
                      disabled={!isEditable}
                      onChange={(e) => handleInputChange(e, 'layout')}
                    >
                      <option value="4R Thin Frame">4R Thin Frame</option>
                      <option value="4R Standard">4R Standard</option>
                      <option value="4R Landscape">4R Landscape</option>
                      <option value="Film Strip">Film Strip</option>
                      <option value="Dedication">Dedication</option>
                      <option value="2 Shot LandScape">2 Shot LandScape</option>
                      <option value="Polaroid Landscape">Polaroid Landscape</option>
                      <option value="Polaroid portait">Polaroid portait</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="border p-2 w-full"
                      value={event.layout}
                      disabled={!isEditable}
                    />
                  )}
                </div>

                {/* Package Field */}
                <div>
                  <label className="block mb-1">Package</label>
                  {isEditable ? (
                    <select
                      className="border p-2 w-full"
                      value={event.package}
                      onChange={(e) => handleInputChange(e, 'package')}
                    >
                      <option value="Package 1">Agent Package</option>
                      <option value="Package 2">Director Package</option>
                      <option value="Package 3">Governor's Packege</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="border p-2 w-full"
                      value={event.package}
                      disabled={!isEditable}
                    />
                  )}
                </div>

                {/* Contact Person Field */}
                <div>
                  <label className="block mb-1">Contact Person</label>
                  <input
                    type="text"
                    className="border p-2 w-full"
                    value={event.contactNumber}
                    disabled={!isEditable}
                    onChange={(e) => handleInputChange(e, 'contactNumber')}
                    placeholder="Enter contact person"
                  />
                </div>

                {/* Contact Number Field */}
                <div>
                  <label className="block mb-1">Contact Number</label>
                  <input
                    type="text"
                    className="border p-2 w-full"
                    value={event.contactPerson}
                    disabled={!isEditable}
                    onChange={(e) => handleInputChange(e, 'contactPerson')}
                    placeholder="Enter contact number"
                  />
                </div>

                {/* Date Field */}
                <div>
                  <label className="block mb-1">Date</label>
                  <input
                    type="date"
                    className="border p-2 w-full"
                    value={eventDate}
                    disabled={!isEditable}
                    onChange={handleDateChange}
                  />
                </div>

                {/* Contact Notes Field */}
                <div>
                  <label className="block mb-1">Notes:</label>
                  <input
                    type="text"
                    className="border p-2 w-full"
                    value={event.notes} // Convert to 'YYYY-MM-DD' format
                    disabled={!isEditable}
                    onChange={(e) => handleInputChange(e, 'notes')}
                  />
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Agents Card */}
          <Card className="flex flex-col mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Agents</h2>
              <ScrollArea className="h-60 w-full rounded-md border">
                <div className="p-4 space-y-4">
                  {event.agentNames && event.agentNames.length > 0 ? (
                    event.agentNames.map((agent, index) => (
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
                        <Separator className="mt-4"/>
                      </div>
                    ))
                  ) : (
                    <p>No agents available</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Arsenal Card */}
          <Card className="flex flex-col mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Arsenal</h2>
              <ScrollArea className="h-60 w-full rounded-md border">
                <div className="p-4 space-y-4">
                  {event.arsenalNames && event.arsenalNames.length > 0 ? (
                    event.arsenalNames.map((item, index) => (
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
                        <Separator className="mt-4"/>
                      </div>
                    ))
                  ) : (
                    <p>No arsenal items available</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Control Button */}
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
