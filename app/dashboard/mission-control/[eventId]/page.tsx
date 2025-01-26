'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from 'next/navigation';
import { getDoc, doc, Timestamp, DocumentReference, updateDoc, getDocs, collection } from "firebase/firestore";
import { firestoreDB, realtimeDB } from "@/firebase/init-firebase";
import { set, ref, remove } from "firebase/database";
import { EventData, AgentData, ArsenalData } from "@/firebase/collection-types";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Undo2, Edit, Save, Plus } from "lucide-react";
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

export default function EventPage() {

  // Add temp add/edit, should not be saved when click save

  // Parameters (in the url)
  const router = useRouter();
  const params = useParams();
  const { eventId } = params as { eventId: string };

  // Global states
  const [event, setEvent] = useState<EventData | null>(null);
  const [shouldRefetch, setShouldRefetch] = useState(false);

  // Detail states
  const [eventDate, setEventDate] = useState<string>("");
  const [isEditable, setIsEditable] = useState(false);

  // Agent states
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [availableAgents, setAvailableAgents] = useState<AgentData[]>([]);

  // Arsenal states
  const [availableCamera, setAvailableCamera] = useState<ArsenalData[]>([]);
  const [availableLaptop, setAvailableLaptop] = useState<ArsenalData[]>([]);
  const [availablePrinter, setAvailablePrinter] = useState<ArsenalData[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedArsenal, setSelectedArsenal] = useState<ArsenalData | null>(null);

  // Function that loads everytime you get to this screen
  useEffect(() => {
    if (eventId) {

      // Fetch event details and fill fields
      const fetchEvent = async () => {
        try {
          const docRef = doc(firestoreDB, "events", eventId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as EventData;

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
              agentNames: agentNames,
              arsenalNames: arsenalNames,
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
  }, [eventId, shouldRefetch]);

  if (!event) return <div>Loading...</div>;

  const handleEditClick = () => {
    setIsEditable(!isEditable); // Toggle edit mode
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
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
          location: event.location || "",
          layout: event.layout || "",
          package: event.package || "",
          contactPerson: event.contactPerson || "",
          contactNumber: event.contactNumber || "",
          eventDate: event.eventDate || "",
          hqt: event.hqt || "",
          aop: event.aop || "",
          notes: event.notes || "",
        });
        console.log("Event data updated successfully!");
        setIsEditable(false); // Exit edit mode after saving
      } catch (error) {
        console.error("Error saving event data:", error);
      }
    }
  };

  const handleCancelChanges = () => {
    setShouldRefetch(!shouldRefetch)
    setIsEditable(false);
  };

  // Fetch all agents for assigning
  const fetchAllAvailableAgents = async () => {
    try {
      const agentsCollectionRef = collection(firestoreDB, 'agents');
      const querySnapshot = await getDocs(agentsCollectionRef);

      // Extract the data from the documents
      const agents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AgentData[];

      // Filter to extract unassigned agents
      const eventAgentIds = event?.agents.map((agentRef: DocumentReference) => agentRef.id) || [];
      const filteredAgents = agents.filter(agent => !eventAgentIds.includes(agent.id || ""));

      setAvailableAgents(filteredAgents)
      console.log("Filtered Agents", filteredAgents)
    } catch (error) {
      console.error("Error fetching agents: ", error);
    }
  };

  // Fetch all arsenal for assigning

  const fetchAllAvailableArsenal = async () => {
    try {
      const arsenalCollectionRef = collection(firestoreDB, 'arsenal');
      const querySnapshot = await getDocs(arsenalCollectionRef);

      // Extract the data from the documents
      const arsenal = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ArsenalData[];

      // Filter to extract unassigned agents
      const eventArsenalIds = event?.arsenal.map((agentRef: DocumentReference) => agentRef.id) || [];
      const filteredArsenal = arsenal.filter(arsenal => !eventArsenalIds.includes(arsenal.id || ""));

      // Further filter the arsenal based on their types
      const cameras = filteredArsenal.filter(arsenal => arsenal.type === "camera");
      const laptops = filteredArsenal.filter(arsenal => arsenal.type === "laptop");
      const printers = filteredArsenal.filter(arsenal => arsenal.type === "printer");

      // Assign the filtered data to the respective state variables
      setAvailableCamera(cameras);
      setAvailableLaptop(laptops);
      setAvailablePrinter(printers);

      console.log("Filtered Arsenal - Cameras:", cameras);
      console.log("Filtered Arsenal - Laptops:", laptops);
      console.log("Filtered Arsenal - Printers:", printers);
    } catch (error) {
      console.error("Error fetching agents: ", error);
    }
  };

  // Function for handling adding agent
  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedAgentId = e.target.value;
    const selected = availableAgents.find(agent => agent.id === selectedAgentId);
    setSelectedAgent(selected || null);
  };

  const handleAddAgent = async () => {
    if (selectedAgent && selectedAgent.id) {
      // Only proceed if selectedAgent is not null and id exists
      const agentRef = doc(firestoreDB, "agents", selectedAgent.id);

      // Update the Firestore event document after state update
      if (event && event?.id) {
        try {
          const docRef = doc(firestoreDB, "events", event.id);
          await updateDoc(docRef, {
            agents: [...(event?.agents || []), agentRef],
          });
          setShouldRefetch(prev => !prev);
          console.log("Event updated with new agent!");
        } catch (error) {
          console.error("Error saving agent to event:", error);
        }
      }
    } else {
      console.error("Selected agent is invalid or missing ID");
    }
  };

  const handleRemoveAgent = async (agentRefToRemove: DocumentReference) => {
    if (!event || !event.id) {
      console.error("Event or event ID is missing.");
      return;
    }

    try {
      // Filter out the document reference to be removed
      const updatedAgents = (event.agents || []).filter(
        (agentRef) => agentRef.path !== agentRefToRemove.path
      );

      // Update Firestore
      const docRef = doc(firestoreDB, "events", event.id);
      await updateDoc(docRef, {
        agents: updatedAgents
      });

      setShouldRefetch(prev => !prev);

      console.log("Agent removed successfully!");
    } catch (error) {
      console.error("Error removing agent:", error);
    }
  }

  // Function for handling adding arsenal
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setSelectedType(selected);
    setSelectedArsenal(null); // Clear the selected arsenal when type changes
  };

  const handleArsenalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedArsenalId = e.target.value;
    const selected = [...availableCamera, ...availableLaptop, ...availablePrinter].find(
      (arsenal) => arsenal.id === selectedArsenalId
    );
    setSelectedArsenal(selected || null);
  };

  const handleAddArsenal = async () => {
    if (selectedArsenal && selectedArsenal.id) {
      // Only proceed if selectedAgent is not null and id exists
      const arsenalRef = doc(firestoreDB, "arsenal", selectedArsenal.id);

      // Update the Firestore event document after state update
      if (event && event?.id) {
        try {
          const docRef = doc(firestoreDB, "events", event.id);
          await updateDoc(docRef, {
            arsenal: [...(event?.arsenal || []), arsenalRef],
          });
          setShouldRefetch(prev => !prev);
          console.log("Event updated with new agent!");
        } catch (error) {
          console.error("Error saving arsenal to event:", error);
        }
      }
    } else {
      console.error("Selected arsenal is invalid or missing ID");
    }
  }

  const handleRemoveArsenal = async (arsenalRefToRemove: DocumentReference) => {
    if (!event || !event.id) {
      console.error("Event or event ID is missing.");
      return;
    }

    try {
      // Filter out the document reference to be removed
      const updatedArsenal = (event.agents || []).filter(
        (agentRef) => agentRef.path !== arsenalRefToRemove.path
      );

      // Update Firestore
      const docRef = doc(firestoreDB, "events", event.id);
      await updateDoc(docRef, {
        arsenal: updatedArsenal
      });

      setShouldRefetch(prev => !prev);

      console.log("Arsenal removed successfully!");
    } catch (error) {
      console.error("Error removing arsenal:", error);
    }
  }

  return (
    <div className="min-full flex p-4 flex-1 flex-col">
      {/* Header */}
      <h1 className="text-3xl font-semibold mb-4 ml-4">
        Mission Control
        <span className="text-3xl text-zinc-700"> / </span>
        {event.eventName}
      </h1>

      {/* Main Content */}
      <Card className="flex flex-col">
        <CardContent className="flex flex-col p-6 gap-6">

          {/* Details Card */}
          <Card className="flex flex-col mb-6">
            <CardContent className="p-6">
              <div className="flex justify-between mb-4">
                <h2 className="text-xl font-semibold">Details</h2>

                {/* Control Buttons */}
                <div className="flex">

                  {isEditable ?
                    <AlertDialog>
                      <AlertDialogTrigger className="text-white pl-4">
                        <Undo2 className="h-8 w-8" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Edit Event Details</AlertDialogTitle>
                        </AlertDialogHeader>
                        Are you sure you want to discard these changes?
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCancelChanges}>Discard</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    :
                    <button onClick={handleEditClick}>
                      <Edit />
                    </button>
                  }

                  {isEditable && (
                    <AlertDialog>
                      <AlertDialogTrigger className="text-white pl-4">
                        <Save />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Edit Event Details</AlertDialogTitle>
                        </AlertDialogHeader>
                        Are you sure you want to save these changes?
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSaveChanges}>Save</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Event Name Field */}
                <div className="md:order-1">
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
                <div className="md:order-2">
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
                <div className="md:order-3">
                  <label className="block mb-1">Layout</label>
                  {isEditable ? (
                    <select
                      className="border p-2 w-full"
                      value={event.layout || ""}
                      disabled={!isEditable}
                      onChange={(e) => handleInputChange(e, 'layout')}
                    >
                      <option hidden>Select a layout</option>
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
                <div className="md:order-4">
                  <label className="block mb-1">Package</label>
                  {isEditable ? (
                    <select
                      className="border p-2 w-full"
                      value={event.package || ""}
                      onChange={(e) => handleInputChange(e, 'package')}
                    >
                      <option hidden>Select a package</option>
                      <option value="Agent Package">Agent Package</option>
                      <option value="Director Package">Director Package</option>
                      <option value="Governor's Package">Governor's Package</option>
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

                {/* HQT Field */}
                <div className="md:order-5">
                  <label className="block mb-1">HQT</label>
                  <input
                    type="text"
                    className="border p-2 w-full"
                    value={event.hqt}
                    disabled={!isEditable}
                    onChange={(e) => handleInputChange(e, 'hqt')}
                    placeholder="Enter HQT"
                  />
                </div>

                {/* AOP Field */}
                <div className="md:order-5">
                  <label className="block mb-1">AOP</label>
                  <input
                    type="text"
                    className="border p-2 w-full"
                    value={event.aop}
                    disabled={!isEditable}
                    onChange={(e) => handleInputChange(e, 'aop')}
                    placeholder="Enter AOP"
                  />
                </div>

                {/* Contact Person Field */}
                <div className="md:order-5">
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
                <div className="md:order-7">
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
                <div className="md:order-8">
                  <label className="block mb-1">Date</label>
                  <input
                    type="date"
                    className="border p-2 w-full"
                    value={eventDate}
                    disabled={!isEditable}
                    onChange={handleDateChange}
                  />
                </div>

                {/* Notes Field */}
                <div className="md:order-6 md:col-span-1 md:row-span-3">
                  <label className="block mb-1">Notes:</label>
                  <textarea
                    className="border p-2 w-full h-full max-h-52"
                    value={event.notes} // Convert to 'YYYY-MM-DD' format
                    disabled={!isEditable}
                    onChange={(e) => handleInputChange(e, 'notes')}
                  ></textarea>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Agents Card */}
          <Card className="flex flex-col mb-6">
            <CardContent className="p-6">
              <div className="flex justify-between mb-4">
                <h2 className="text-xl font-semibold">Agents</h2>
                {/* Add Agent */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      onClick={fetchAllAvailableAgents}
                      className="text-white pl-4"
                    >
                      <Plus />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Assign Agent</AlertDialogTitle>
                    </AlertDialogHeader>
                    {/* Select Agent */}
                    <label className="block mb-4">Select Agent</label>
                    <select
                      value={selectedAgent?.id || ""}
                      onChange={handleAgentChange}
                      className="w-full p-2 border rounded-md mb-4"
                    >
                      <option value="" disabled hidden>Select an agent</option>
                      {availableAgents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.firstName} {agent.lastName}
                        </option>
                      ))}
                    </select>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleAddAgent}>Add</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <ScrollArea className="h-60 w-full rounded-md border">
                <div className="p-4 space-y-4">
                  {event.agents && event.agentNames && event.agents.length > 0 && event.agentNames.length > 0 ? (
                    event.agents.map((agentRef, index) => (
                      <div key={agentRef.id}>
                        <div className="flex justify-between items-center">
                          <p>{event.agentNames![index] || "Unkown Agent"}</p>
                          <AlertDialog>
                            <AlertDialogTrigger className="text-red-500">
                              <X/>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Agent</AlertDialogTitle>
                              </AlertDialogHeader>
                              Are you sure you want to remove this agent from this event?
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveAgent(agentRef)}>Remove</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        <Separator className="mt-4" />
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
              <div className="flex justify-between mb-4">
                <h2 className="text-xl font-semibold">Arsenal</h2>
                {/* Add Arsenal */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      onClick={fetchAllAvailableArsenal}
                      className="text-white pl-4"
                    >
                      <Plus />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Add Arsenal</AlertDialogTitle>
                    </AlertDialogHeader>
                    {/* Select Arsenal Type */}
                    <label className="block mb-4">Select Arsenal Type</label>
                    <select
                      value={selectedType || ""}
                      onChange={handleTypeChange}
                      className="w-full p-2 border rounded-md mb-4"
                    >
                      <option value="" disabled hidden>Select type</option>
                      <option value="Camera">Camera</option>
                      <option value="Laptop">Laptop</option>
                      <option value="Printer">Printer</option>
                    </select>

                    {/* Select Arsenal based on type */}
                    <label className="block mb-4">Select Arsenal</label>
                    <select
                      value={selectedArsenal?.id || ""}
                      onChange={handleArsenalChange}
                      className="w-full p-2 border rounded-md mb-4"
                      disabled={!selectedType} // Disable if no type is selected
                    >
                      <option value="" disabled hidden>Select an arsenal</option>
                      {selectedType === "Camera" &&
                        availableCamera.map((camera) => (
                          <option key={camera.id} value={camera.id}>
                            {camera.name}
                          </option>
                        ))}
                      {selectedType === "Laptop" &&
                        availableLaptop.map((laptop) => (
                          <option key={laptop.id} value={laptop.id}>
                            {laptop.name}
                          </option>
                        ))}
                      {selectedType === "Printer" &&
                        availablePrinter.map((printer) => (
                          <option key={printer.id} value={printer.id}>
                            {printer.name}
                          </option>
                        ))}
                    </select>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleAddArsenal}>Add</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <ScrollArea className="h-60 w-full rounded-md border">
                <div className="p-4 space-y-4">
                  {event.arsenal && event.arsenalNames && event.arsenal.length > 0 && event.arsenalNames.length > 0 ? (
                    event.arsenal.map((arsenalRef, index) => (
                      <div key={arsenalRef.id}>
                        <div className="flex justify-between items-center">
                          <p>{event.arsenalNames![index] || "Unkown Arsenal"}</p>
                          <AlertDialog>
                            <AlertDialogTrigger className="text-red-500">
                              <X/>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Arsenal</AlertDialogTitle>
                              </AlertDialogHeader>
                              Are you sure you want to remove this arsenal from this event?
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveArsenal(arsenalRef)}>Remove</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        <Separator className="mt-4" />
                      </div>
                    ))
                  ) : (
                    <p>No arsenal available</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
