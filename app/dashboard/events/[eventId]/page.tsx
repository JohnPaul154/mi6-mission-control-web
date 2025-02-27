'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getDoc, doc, deleteDoc, Timestamp, DocumentReference, updateDoc, getDocs, collection ,query, where } from "firebase/firestore";
import { firestoreDB, realtimeDB } from "@/firebase/init-firebase";
import { set, ref, remove, get, getDatabase } from "firebase/database";
import { EventData, AgentData, ArsenalData, ReviewData } from "@/firebase/collection-types";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner"
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
import { sendNotification } from "@/lib/sendNotification";
import { Button } from "@/components/ui/button";
import StarRating from "@/components/star-rating";


export default function EventPage() {

  // Add temp add/edit, should not be saved when click save

  // Parameters (in the url)
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { eventId } = params as { eventId: string };

  // Global states
  const [event, setEvent] = useState<EventData | null>(null);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [review, setReview] = useState<ReviewData | null>(null);

  // Detail states
  const [eventDate, setEventDate] = useState<string>("");
  const [collections, setCollections] = useState<string>("");
  const [isEditable, setIsEditable] = useState(searchParams.get("edit") === "true");

  // Agent states
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [availableAgents, setAvailableAgents] = useState<AgentData[]>([]);
  const [addAgentError, setAddAgentError] = useState<string>("");

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
            setCollections(data.collection);

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

      const eventRef = doc(firestoreDB, "events", eventId);

      // Fetch event details and fill fields
      const fetchReview = async () => {
        try {
          const q = query(collection(firestoreDB, "reviews"), where("eventId", "==", eventRef));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0]; // Get the first matching document
            const data = docSnap.data() as ReviewData;

            setReview({
              id: docSnap.id,
              ...data, // Spread all other properties from data
            });
          } else {
            console.error("Review not found for eventId:", eventId);
          }
        } catch (error) {
          console.error("Error fetching event data:", error);
        }
      };

      fetchReview();
      fetchEvent();
    }
  }, [eventId, shouldRefetch]);

  if (!event) return <div>Loading...</div>;

  const handleEditClick = () => {
    setIsEditable(!isEditable); // Toggle edit mode
  };

  const handleInputChange = (
    value: string,
    field: string
  ) => {

    setEvent({
      ...event,
      [field]: (field === 'sdCardCount' || field === 'batteryCount') ? parseInt(value) || 0 : value,
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
          sdCardCount: event.sdCardCount || 0,
          batteryCount: event.batteryCount || 0,
          notes: event.notes || "",
          agents: event.agents || [],
          arsenal: event.arsenal || [],
          collection: event.collection || ""
        });
        const statusRef = ref(realtimeDB, `chats/${event.id}/info/name`);
        set(statusRef, event.eventName);

        console.log("Event data updated successfully!");
        setIsEditable(false); // Exit edit mode after saving
        router.push("/dashboard/events");
      } catch (error) {
        console.error("Error saving event data:", error);
      }
    }
  };

  const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digit characters
    if (value.length <= 11) {
      handleInputChange(value, field); // Update state if length is <= 11
    }
  };

  const handleCollectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove non-digit characters
    value = new Intl.NumberFormat("en-US").format(Number(value)); // Format with commas
    setCollections(value); // Assuming you have state management
    handleInputChange(value, "collection");
  };

  const handleCancelChanges = () => {
    setShouldRefetch(!shouldRefetch)
    setIsEditable(false);
  };

  // Fetch all agents for assigning
  const fetchAllAvailableAgents = async () => {
    try {
      if (!event) {
        console.error("Event is undefined");
        return;
      }

      // Fetch agents accepted for the event
      const docSnapshots = await Promise.all(
        (event.agentsAccepted || []).map(ref => getDoc(ref))
      );

      const agents: AgentData[] = docSnapshots
        .filter(snapshot => snapshot.exists()) // Ensure only existing docs are processed
        .map(snapshot => ({
          id: snapshot.id,
          ...snapshot.data()
        }) as AgentData); // Type assertion

      console.log("Fetched Agents:", agents);

      // Extract IDs of assigned agents
      const eventAgentIds: string[] = (event.agents || []).map(
        (agentRef: DocumentReference) => agentRef.id
      );

      // Filter out assigned agents
      const unassignedAgents: AgentData[] = agents.filter(
        agent => !eventAgentIds.includes(agent.id || "")
      );

      setAvailableAgents(unassignedAgents);
      console.log("Unassigned Agents:", unassignedAgents);
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

      // Filter to extract unassigned arsenals
      const eventArsenalIds = event?.arsenal.map((arsenalRef: DocumentReference) => arsenalRef.id) || [];
      const filteredArsenal = arsenal.filter(arsenal => !eventArsenalIds.includes(arsenal.id || ""));

      // Further filter the arsenal based on their types
      const cameras = filteredArsenal.filter(arsenal => arsenal.type === "camera");
      const laptops = filteredArsenal.filter(arsenal => arsenal.type === "laptop");
      const printers = filteredArsenal.filter(arsenal => arsenal.type === "printer");

      // Assign the filtered data to the respective state variables
      setSelectedType(null);
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
    if (!selectedAgent || !selectedAgent.id) {
      console.error("Selected agent is invalid or missing ID");
      return;
    }

    if (!event || !event.id || !event.eventDate) {
      console.error("Event is invalid or missing required details");
      return;
    }

    try {
      const agentRef = doc(firestoreDB, "agents", selectedAgent.id);

      // **Step 1: Fetch all events where this agent is assigned**
      const eventsSnapshot = await getDocs(collection(firestoreDB, "events"));
      const agentEvents = eventsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as EventData)) // Extract event data
        .filter(eventData =>
          eventData.agents?.some((ref: DocumentReference) => ref.id === selectedAgent.id)
        ); // Check if agent is assigned

      // **Step 2: Check if any event has the same date**
      const isAlreadyAssigned = agentEvents.some(
        assignedEvent => assignedEvent.eventDate === event.eventDate
      );

      if (isAlreadyAssigned) {
        console.warn("Agent is already assigned to another event on this date.");
        toast("Agent is already assigned to another event on this date.")
        return;
      }

      // **Step 3: Update event state**
      setEvent((prevEvent) => {
        if (!prevEvent) return null;

        return {
          ...prevEvent,
          agents: [...(prevEvent.agents || []), agentRef], // Ensure agents array exists
          agentNames: [...(prevEvent.agentNames || []), `${selectedAgent.firstName} ${selectedAgent.lastName}`],
        };
      });

      // **Step 4: Send push notification**
      sendPushNotification(selectedAgent.id);

      console.log("Event updated with new agent!");

    } catch (error) {
      console.error("Error adding agent to event:", error);
    }
  };

  const handleRemoveAgent = async (agentRefToRemove: DocumentReference, agentNameToRemove: string) => {
    if (!event || !event.id) {
      console.error("Event or event ID is missing.");
      return;
    }

    try {
      // Filter out the document reference to be removed
      setEvent((prevEvent) => {
        if (!prevEvent) return null; // Ensure event is not null

        return {
          ...prevEvent,
          agents: prevEvent.agents?.filter((agent) => agent !== agentRefToRemove) || [],
          agentNames: prevEvent.agentNames?.filter((agentName) => agentName !== agentNameToRemove) || [],
        };
      });
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
    if (!selectedArsenal || !selectedArsenal.id) {
      console.error("Selected arsenal is invalid or missing ID");
      return;
    }

    if (!event || !event.id || !event.eventDate) {
      console.error("Event is invalid or missing required details");
      return;
    }

    try {
      const arsenalRef = doc(firestoreDB, "arsenal", selectedArsenal.id);

      // **Step 1: Fetch all events where this arsenal is assigned**
      const eventsSnapshot = await getDocs(collection(firestoreDB, "events"));
      const arsenalEvents = eventsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as EventData)) // Extract event data
        .filter(eventData =>
          eventData.arsenal?.some((ref: DocumentReference) => ref.id === selectedArsenal.id)
        ); // Check if arsenal is assigned

      // **Step 2: Check if any event has the same date**
      const isAlreadyAssigned = arsenalEvents.some(
        assignedEvent => assignedEvent.eventDate === event.eventDate
      );

      if (isAlreadyAssigned) {
        console.warn("Arsenal is already assigned to another event on this date.");
        toast("Arsenal is already assigned to another event on this date.");
        return;
      }

      // **Step 3: Update event state**
      setEvent((prevEvent) => {
        if (!prevEvent) return null;

        return {
          ...prevEvent,
          arsenal: [...(prevEvent.arsenal || []), arsenalRef], // Ensure arsenal array exists
          arsenalNames: [...(prevEvent.arsenalNames || []), selectedArsenal.name],
        };
      });

      console.log("Event updated with new arsenal!");

    } catch (error) {
      console.error("Error adding arsenal to event:", error);
    }

    setSelectedArsenal(null);
  };

  const handleRemoveArsenal = async (arsenalRefToRemove: DocumentReference, arsenalNameToRemove: string) => {
    if (!event || !event.id) {
      console.error("Event or event ID is missing.");
      return;
    }

    try {
      setEvent((prevEvent) => {
        if (!prevEvent) return null; // Ensure event is not null

        console.log(arsenalNameToRemove);

        return {
          ...prevEvent,
          arsenal: prevEvent.arsenal?.filter((arsenal) => arsenal !== arsenalRefToRemove) || [],
          arsenalNames: prevEvent.arsenalNames?.filter((arsenalName) => arsenalName !== arsenalNameToRemove) || [],
        };
      });
      console.log("Arsenal removed successfully!");
    } catch (error) {
      console.error("Error removing arsenal:", error);
    }
  }

  const handleArchive = async () => {
    try {
      const docRef = doc(firestoreDB, "events", event.id!);
      await updateDoc(docRef, {
        isArchive: true,
      });
      router.push("/dashboard/archive");
      console.log("Field updated successfully!");
    } catch (error) {
      console.error("Error updating field:", error);
    }
  };

  const handleRestore = async () => {
    try {
      const docRef = doc(firestoreDB, "events", event.id!);
      await updateDoc(docRef, {
        isArchive: false,
      });
      router.push("/dashboard/events");
      console.log("Field updated successfully!");
    } catch (error) {
      console.error("Error updating field:", error);
    }
  }

  const handleDelete = async () => {
    try {
      const docRef = doc(firestoreDB, "events", event.id!);
      await deleteDoc(docRef);
      const dataRef = ref(realtimeDB, `chats/${event.id}`); // Replace with your data path
      remove(dataRef)
      router.push("/dashboard/archive");
      console.log("Event deleted successfully!");
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  }

  // Push Notification
  const sendPushNotification = async (agentId: string) => {
    if (!agentId) {
      console.error("Agent ID is required.");
      return;
    }

    try {
      const agentTokenRef = ref(realtimeDB, `agents/${agentId}/token`);
      const tokenSnapshot = await get(agentTokenRef);

      if (!tokenSnapshot.exists()) {
        console.log(`No token found for agent with ID: ${agentId}`);
        return;
      }

      const agentToken = tokenSnapshot.val();

      // Send Push Notification (assuming you have a stored Expo push token)
      await sendNotification(agentToken, event.eventName, `You are part of an event at ${event.location} on ${event.eventDate}.`);

      console.log(`Push notification sent to agent ${agentId}`);

      return { id: agentId, token: agentToken };
    } catch (error) {
      console.error(`Error sending push notification to agent ${agentId}:`, error);
    }
  };

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
                    <button onClick={handleEditClick} hidden={event.isArchive}>
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
                    onChange={(e) => handleInputChange(e.target.value, 'eventName')}
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
                    onChange={(e) => handleInputChange(e.target.value, 'location')}
                    placeholder="Enter location"
                  />
                </div>

                {/* Layout Field */}
                <div className="md:order-3">
                  <label className="block mb-1">Layout</label>
                  {isEditable ? (
                    <select
                      className="border p-2 w-full"
                      value={
                        ["4R Thin Frame", "4R Standard", "4R Landscape", "Film Strip", "Dedication", "2 Shot LandScape", "Polaroid Landscape"].includes(event.layout)
                          ? event.layout
                          : "Other"
                      }
                      disabled={!isEditable}
                      onChange={(e) => handleInputChange(e.target.value, 'layout')}
                    >
                      <option hidden>Select a layout</option>
                      <option value="4R Thin Frame">4R Thin Frame</option>
                      <option value="4R Standard">4R Standard</option>
                      <option value="4R Landscape">4R Landscape</option>
                      <option value="Film Strip">Film Strip</option>
                      <option value="Dedication">Dedication</option>
                      <option value="2 Shot LandScape">2 Shot LandScape</option>
                      <option value="Polaroid Landscape">Polaroid Landscape</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="border p-2 w-full"
                      value={event.layout}
                      disabled={!isEditable}
                    />
                  )}

                  {(!["4R Thin Frame", "4R Standard", "4R Landscape", "Film Strip", "Dedication", "2 Shot LandScape", "Polaroid Landscape"].includes(event.layout) || event.layout === "Other") && isEditable && (
                    <input
                      type="text"
                      className="border p-2 w-full mt-2"
                      value={event.layout !== "Other" ? event.layout : ""}
                      onChange={(e) => handleInputChange(e.target.value, 'layout')}
                      placeholder="Enter custom layout"
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
                      onChange={(e) => handleInputChange(e.target.value, 'package')}
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

                {/* Number of SD Card */}
                <div className="md:order-5">
                  <label className="block mb-1">Number of SD Card</label>
                  {isEditable ? (
                    <div className="flex items-center space-x-2">
                      {/* Minus Button */}
                      <button
                        type="button"
                        className="border p-2 rounded-md bg-white text-stone-900 font-bold hover:bg-gray-200 w-1/6"
                        onClick={() => {
                          if (event.sdCardCount > 0) {
                            handleInputChange((event.sdCardCount - 1).toString(), 'sdCardCount');
                          }
                        }}
                      >
                        -
                      </button>

                      {/* Input Field */}
                      <input
                        type="text" // Use type="text" to avoid showing the number input controls
                        className="border w-full p-2 text-center"
                        value={event.sdCardCount?.toString() || ""} // Ensure the value is a string
                        onChange={(e) => {
                          const value = e.target.value;

                          // Allow deleting value (empty input) or valid numbers within range 0-10
                          if (value === "" || (!isNaN(parseInt(value, 10)) && parseInt(value, 10) >= 0 && parseInt(value, 10) <= 10)) {
                            handleInputChange(value, 'sdCardCount');
                          }
                        }}
                      />

                      {/* Plus Button */}
                      <button
                        type="button"
                        className="border p-2 rounded-md bg-white text-stone-900 font-bold hover:bg-gray-200 w-1/6"
                        onClick={() => {
                          if (event.sdCardCount < 10) {
                            handleInputChange((event.sdCardCount + 1).toString(), 'sdCardCount');
                          }
                        }}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      className="border p-2 w-full"
                      value={event.sdCardCount?.toString() || ""}
                      disabled={!isEditable}
                    />
                  )}
                </div>

                {/*Number of Battery*/}
                <div className="md:order-6">
                  <label className="block mb-1">Number of Battery</label>
                  {isEditable ? (
                    <div className="flex items-center space-x-2">
                      {/* Minus Button */}
                      <button
                        type="button"
                        className="border p-2 rounded-md bg-white text-stone-900 font-bold hover:bg-gray-200 w-1/6"
                        onClick={() => {
                          if (event.batteryCount > 0) {
                            handleInputChange((event.batteryCount - 1).toString(), 'batteryCount');
                          }
                        }}
                      >
                        -
                      </button>

                      {/* Input Field */}
                      <input
                        type="text" // Use type="text" to avoid showing the number input controls
                        className="border w-full p-2 text-center"
                        value={event.batteryCount?.toString() || ""} // Ensure the value is a string
                        onChange={(e) => {
                          const value = e.target.value;

                          // Allow deleting value (empty input) or valid numbers within range 0-10
                          if (value === "" || (!isNaN(parseInt(value, 10)) && parseInt(value, 10) >= 0 && parseInt(value, 10) <= 10)) {
                            handleInputChange(value, 'batteryCount');
                          }
                        }}
                      />

                      {/* Plus Button */}
                      <button
                        type="button"
                        className="border p-2 rounded-md bg-white text-stone-900 font-bold hover:bg-gray-200 w-1/6"
                        onClick={() => {
                          if (event.batteryCount < 10) {
                            handleInputChange((event.batteryCount + 1).toString(), 'batteryCount');
                          }
                        }}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      className="border p-2 w-full"
                      value={event.batteryCount?.toString() || ""}
                      disabled={!isEditable}
                    />
                  )}
                </div>

                {/* HQT Field */}
                <div className="md:order-7">
                  <label className="block mb-1">HQT</label>
                  <input
                    type="time"
                    className="border p-2 w-full"
                    value={event.hqt}
                    disabled={!isEditable}
                    onChange={(e) => handleInputChange(e.target.value, 'hqt')}
                    placeholder="Enter HQT"
                  />
                </div>

                {/* AOP Field */}
                <div className="md:order-8">
                  <label className="block mb-1">AOP</label>
                  <input
                    type="time"
                    className="border p-2 w-full"
                    value={event.aop}
                    disabled={!isEditable}
                    onChange={(e) => handleInputChange(e.target.value, 'aop')}
                    placeholder="Enter AOP"
                  />
                </div>

                {/* Contact Person Field */}
                <div className="md:order-9">
                  <label className="block mb-1">Contact Person</label>
                  <input
                    type="text"
                    className="border p-2 w-full"
                    value={event.contactPerson}
                    disabled={!isEditable}
                    onChange={(e) => handleInputChange(e.target.value, 'contactPerson')}
                    placeholder="Enter contact person"
                  />
                </div>

                {/* Contact Number Field */}
                <div className="md:order-10">
                  <label className="block mb-1">Contact Number</label>
                  <input
                    type="text"
                    className="border p-2 w-full"
                    value={event.contactNumber}
                    disabled={!isEditable}
                    onChange={(e) => handleContactNumberChange(e, 'contactNumber')}
                    placeholder="Enter contact number"
                  />
                </div>

                {/* Date of Event Field */}
                <div className="md:order-11">
                  <label className="block mb-1">Date of Event</label>
                  <input
                    type="date"
                    className="border p-2 w-full"
                    value={eventDate}
                    disabled={!isEditable}
                    onChange={handleDateChange}
                  />
                </div>

                {/* Collections Field */}
                <div className="md:order-12 relative">
                  <label className="block mb-1">Collections</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="border p-2 w-full pr-10"
                      value={collections}
                      disabled={!isEditable}
                      onChange={handleCollectionChange}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      PHP
                    </span>
                  </div>
                </div>

                {/* Notes Field */}
                <div className="md:order-last md:col-span-2 md:row-span-3">
                  <label className="block mb-1">Notes:</label>
                  <textarea
                    className="border p-2 w-full"
                    value={event.notes} // Convert to 'YYYY-MM-DD' format
                    disabled={!isEditable}
                    onChange={(e) => handleInputChange(e.target.value, 'notes')}
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
                      className={`text-white pl-4 ${isEditable ? "" : "hidden"}`}
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
                      <option value="" disabled hidden>{availableAgents.length != 0 ? "Select an agent" : "No Agents Available"}</option>
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
                          <p>{event.agentNames![index] || "Unknown Agent"}</p>
                          <AlertDialog>
                            <AlertDialogTrigger className="text-red-500" hidden={event.isArchive || !isEditable}>
                              <X />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Agent</AlertDialogTitle>
                              </AlertDialogHeader>
                              Are you sure you want to remove this agent from this event?
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveAgent(agentRef, event.agentNames![index])}>Remove</AlertDialogAction>
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
                      className={`text-white pl-4 ${isEditable ? "" : "hidden"}`}
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
                          <p>{event.arsenalNames![index] || "Unknown Arsenal"}</p>
                          <AlertDialog>
                            <AlertDialogTrigger className="text-red-500" hidden={event.isArchive || !isEditable}>
                              <X />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Arsenal</AlertDialogTitle>
                              </AlertDialogHeader>
                              Are you sure you want to remove this arsenal from this event?
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveArsenal(arsenalRef, event.arsenalNames![index])}>Remove</AlertDialogAction>
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

          {/*  */}
          <div className="flex mb-6 gap-6">
            <Card className="w-full">
              <CardContent className="p-6 flex flex-col justify-center">
                <div className="flex justify-between mb-4">
                  <h2 className="text-xl font-semibold">Report</h2>
                </div>
                <textarea className="border w-full h-[14rem] p-2 resize-none" disabled={true} value={review?.report} />
                <div className="flex mt-4 space-x-2 w-full">
                  <Button className="w-full" onClick={() => { router.push(`/dashboard/events/${eventId}/report`) }}>See Full Report</Button>
                </div>
              </CardContent>
            </Card>
            <Card className="w-full">
              <CardContent className="p-6 flex flex-col justify-center">
                <div className="flex justify-between mb-4">
                  <h2 className="text-xl font-semibold">Review</h2>
                </div>
                <div className="flex mb-4 justify-center">
                  {/* Star Rating */}
                  <StarRating rating={review?.rating || 0}></StarRating>
                </div>
                <textarea className="border w-full h-[10rem] p-2 resize-none" disabled={true} value={review?.review} />
                <div className="flex mt-4 space-x-2 w-full ">
                  <Button className="w-full" onClick={() => { router.push(`/dashboard/events/${eventId}/review`) }}>{true ? "Get Review" : "See Full Review"}</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <CardFooter className="p-0 mt-[-2rem] w-full">
            {event.isArchive ? (
              <div className="flex mt-4 space-x-2 w-full">
                {/* Button 1 */}
                <Button className="w-1/2" onClick={handleRestore}>Restore</Button>

                {/* Button 2 */}
                <Button className="bg-gray-600 text-white w-1/2" onClick={handleDelete}>Delete</Button>
              </div>
            ) : (
              <div className="flex mt-4 space-x-2 w-full">
                {/* Button 1 */}
                <Button className="w-full" onClick={handleArchive}>Archive</Button>
              </div>
            )}
          </CardFooter>
        </CardContent>
      </Card>
    </div>
  );
}
