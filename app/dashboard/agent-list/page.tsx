'use client'

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProfileCard } from "@/components/profile-card";
import { Plus, Trash2, Pencil, Eye, EyeOff, CircleHelp, Archive, Search, CircleAlert } from "lucide-react"; // Import Plus icon from Lucide
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"; // Import AlertDialog components

import { getDocs, collection, getDoc, doc, addDoc, query, where, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { get, ref, remove, set, update } from "firebase/database";
import { firestoreDB, realtimeDB } from "@/firebase/init-firebase"; // Make sure to import your firestore instance
import { AgentData } from "@/firebase/collection-types";
import { useSession } from "@/contexts/SessionContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import StarRating from "@/components/star-rating";

type AgentDataMini = {
  id: string;
  avatar: string;
  email: string;
  name: string;
  position: string;
  status: string;
};

const generatePassword = (length: number = 8) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};

export default function AgentListPage() {

  const { session } = useSession()
  const isAdmin = session!.role === "admin";

  const [agents, setAgents] = useState<AgentDataMini[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [search, setSearch] = useState("");
  const [agentRating, setAgentRating] = useState(0);

  // Add state for new agent details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Additional states for editing profile
  const [profile, setProfile] = useState<AgentData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [password, setPassword] = useState<string>("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [birthday, setBirthday] = useState("");
  const [dateHired, setDateHired] = useState("");
  const [suspensionEndDate, setSuspensionEndDate] = useState("");

  // Fetch agents when the component mounts
  const getAllAgents = async (): Promise<any[]> => {
    try {
      // Reference to the /agents path
      const agentsRef = ref(realtimeDB, "agents");

      // Get the snapshot of the /agents path
      const snapshot = await get(agentsRef);

      if (snapshot.exists()) {
        const agentsData = snapshot.val();
        // Convert the object into an array of agents
        const agents = Object.entries(agentsData).map(([id, data]) => {
          if (data && typeof data === "object") {
            return { id, ...data };
          } else {
            console.warn(`Invalid data for agent ${id}:`, data);
            return { id }; // Return only the ID if the data is invalid
          }
        })
          .filter(agent => agent.id !== "system");

        console.log("Agents retrieved successfully:", agents);
        return agents;
      } else {
        console.log("No agents found.");
        return [];
      }
    } catch (error) {
      console.error("Error retrieving agents:", error);
      return [];
    }
  };

  const fetchAgentDetails = async (id: string) => {
    try {
      const docRef = doc(firestoreDB, "agents", id); // Reference to the specific agent
      const docSnap = await getDoc(docRef);

      const ratingRef = ref(realtimeDB, `agents/${id}`); // Adjust the path as needed
      const snapshot = await get(ratingRef);

      if (docSnap.exists() && snapshot.exists()) {
        setIsEditing(false);
        setSelectedAgent({ id, ...docSnap.data() } as AgentData);
        setBirthday(docSnap.data().birthday || "");
        setDateHired(docSnap.data().dateHired || "");
        setSuspensionEndDate(docSnap.data().suspensionEndDate || "");
        setPassword(docSnap.data().password);
        setAgentRating(snapshot.val().rating/snapshot.val().ratingCount || 0)
      } else {
        console.log("No such agent!");
      }
    } catch (error) {
      console.error("Error fetching agent details:", error);
    }
  };

  useEffect(() => {
    const fetchAgents = async () => {
      const agentsData = (await getAllAgents() as AgentDataMini[]).filter(item => !item.hasOwnProperty("system"));

      const filteredAgents = agentsData.filter((agent: AgentDataMini) => {
        if (search && search.trim() !== "") {
          // Make both search query and each part of the fullName lowercase for case-insensitive comparison
          const lowerCaseSearch = search.trim().toLowerCase();

          // Split the fullName into individual parts (e.g. "John Michael Smith" becomes ["John", "Michael", "Smith"])
          const nameParts = agent.name.split(" ").map(part => part.toLowerCase());

          // Check if any part of the full name matches the search query
          return nameParts.some(namePart => namePart.includes(lowerCaseSearch));
        }
        return true;  // Return all if there's no search query
      });

      setAgents(filteredAgents as AgentDataMini[]); // Setting the agents state after the data is fetched
    };

    fetchAgents();
  }, [shouldRefetch]);

  const searchAgent = () => {
    setShouldRefetch(!shouldRefetch)
  }

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prevState) => !prevState);
  };

  const handleAddAgent = async () => {
    try {
      const agentsRef = collection(firestoreDB, "agents");
      const q = query(agentsRef, where("email", "==", email));

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        alert("An agent with this email already exists!");
        return;
      }

      const new_password = generatePassword()

      const newAgent: AgentData = {
        avatar: "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp", // Default avatar URL if missing
        email: email,
        firstName: firstName,
        lastName: lastName,
        position: "Operator",
        address: "",
        birthday: "",
        contactNumber: "",
        dateHired: "",
        role: "agent",
        password: new_password,
        isNew: true,
        isArchive: false,
        isSuspended: false,
        suspensionEndDate: "",
      };

      // send mail to new user
      const message = {
        subject: `Welcome ${firstName} to MI6 Mission Control`,
        text: `Hello ${firstName} ${lastName}, your password for MI6 Mission Control is: ${new_password}.`,
        html: `
                <p>Hello <strong>${firstName} ${lastName}</strong>,</p>
                <p>We welcome you to MI6 Photoman, here are your credentials</p>
                <p>Email: <strong>${email}</strong>.</p>
                <p>Password: <strong>${new_password}</strong>.</p>
                <p><em>This is an automated email. Please do not reply.</em></p>
              `
      };

      // Add the email request to Firestore
      const mailRef = await addDoc(collection(firestoreDB, "mail"), {
        to: [email],
        message: message,
        timestamp: serverTimestamp()
      });

      // Add to firestore
      const newUser = await addDoc(collection(firestoreDB, "agents"), newAgent);

      // Add to realtime database
      const agentStatusRef = ref(realtimeDB, `agents/${newUser.id}`);
      await set(agentStatusRef, {
        status: "offline",
        lastSeen: null,
        position: newAgent.position,
        name: `${newAgent.firstName} ${newAgent.lastName}`,
        email: newAgent.email,
        avatar: newAgent.avatar,
        rating: 0,
        ratingCount: 0
      });

      // Step 5: Reset form fields after adding the agent
      setFirstName("");
      setLastName("");
      setEmail("");
      setShouldRefetch(prev => !prev);
    } catch (error) {
      console.error("Error adding agent:", error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    field: keyof AgentData
  ) => {
    if (selectedAgent) {
      setSelectedAgent({
        ...selectedAgent,
        [field]: e.target.value,
      });
    }
  };

  const handleCancelChanges = () => {
    setPassword('');
    setIsEditing(false);
    setShouldRefetch(!shouldRefetch);
  }

  const handleSaveChanges = async () => {
    try {
      const userDocRef = doc(firestoreDB, 'agents', selectedAgent!.id || "");
      const { id, ...updateData } = selectedAgent!;

      await updateDoc(userDocRef, updateData);

      const dataRef = ref(realtimeDB, `agents/${selectedAgent!.id}`)
      update(dataRef, {
        name: `${selectedAgent?.firstName} ${selectedAgent?.lastName}`,
        position: selectedAgent?.position,
        avatar: selectedAgent?.avatar,
      })

      // Clear password fields
      setPassword('');
    } catch (error) {
      console.error('Error updating profile:', error);
    }

    setShouldRefetch(!shouldRefetch)
    fetchAgentDetails(selectedAgent!.id || "");
    setIsEditing(false);
    // Clear the password fields
    setPassword("");
  };

  const handleResetPassword = async () => {
    try {
      const new_password = generatePassword()

      const message = {
        subject: 'Your New Password for MI6 Mission Control',
        text: `Hello ${selectedAgent!.firstName} ${selectedAgent!.lastName}, your new password for MI6 Mission Control is: ${new_password}.`,
        html: `
                <p>Hello <strong>${selectedAgent!.firstName} ${selectedAgent!.lastName}</strong>,</p>
                <p>Your New Password: <strong>${new_password}</strong>.</p>
                <p><em>This is an automated email. Please do not reply.</em></p>
              `
      };

      // Add the email request to Firestore
      const mailRef = await addDoc(collection(firestoreDB, "mail"), {
        to: [selectedAgent!.email],
        message: message,
        timestamp: serverTimestamp()
      });

      const docRef = doc(firestoreDB, "agents", selectedAgent!.id || "");
      await updateDoc(docRef, {
        password: new_password
      });
      setShouldRefetch(!shouldRefetch);
      fetchAgentDetails(selectedAgent!.id || "");

    } catch (error) {
      console.error("Error deleting event:", error);
    }
  }

  const handleDeleteAgent = async () => {
    try {
      const docRef = doc(firestoreDB, "agents", selectedAgent!.id || "");
      await deleteDoc(docRef);
      const dataRef = ref(realtimeDB, `agents/${selectedAgent!.id}`);
      remove(dataRef)
      setSelectedAgent(null);
      setIsEditing(false);
      setShouldRefetch(!shouldRefetch)
      console.log("Event deleted successfully!");
    } catch (error) {
      console.error("Error deleting agent:", error);
    }
  }

  const handleArchiveAgent = async () => {
    try {
      const docRef = doc(firestoreDB, "agents", selectedAgent!.id || "");
      await updateDoc(docRef, {
        isArchive: true
      });
      const dataRef = ref(realtimeDB, `agents/${selectedAgent!.id}`);
      remove(dataRef)
      setShouldRefetch(!shouldRefetch);
      fetchAgentDetails(selectedAgent!.id || "");
    } catch (error) {
      console.error("Error deleting agent:", error);
    }
  }

  const handleSuspendAgent = async () => {
    try {
      const docRef = doc(firestoreDB, "agents", selectedAgent!.id || "");
      await updateDoc(docRef, {
        isSuspended: true,
        suspensionEndDate: suspensionEndDate
      });
      setShouldRefetch(!shouldRefetch);
      fetchAgentDetails(selectedAgent!.id || "");
    } catch (error) {
      console.error("Error suspending agent:", error);
    }
  }

  const handleUnsuspendAgent = async () => {
    try {
      const docRef = doc(firestoreDB, "agents", selectedAgent!.id || "");
      await updateDoc(docRef, {
        isSuspended: false,
        suspensionEndDate: ""
      });
      setShouldRefetch(!shouldRefetch);
      fetchAgentDetails(selectedAgent!.id || "");
    } catch (error) {
      console.error("Error unsuspending agent:", error);
    }
  }

  const handleavatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (profile) {
          setProfile({ ...profile, avatar: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getSuspensionDays = (suspensionEndDate: string | null): number => {
    if (!suspensionEndDate) return 0;

    const today = new Date();
    const endDate = new Date(suspensionEndDate);

    const diffInMs = endDate.getTime() - today.getTime();
    return Math.ceil(diffInMs / (1000 * 60 * 60 * 24)); // Convert ms to days
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const newDate = e.target.value

    if (field === "birthday") {
      setSelectedAgent({
        ...selectedAgent!,
        birthday: newDate
      });
      setBirthday(newDate);
    } else if (field === "dateHired") {
      setSelectedAgent({
        ...selectedAgent!,
        dateHired: newDate
      });
      setDateHired(newDate);
    } else if (field === "suspensionEndDate") {
      setSelectedAgent({
        ...selectedAgent!,
        suspensionEndDate: newDate
      });
      setSuspensionEndDate(newDate);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <div className="min-full h-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4 max-h-[3%]">Agent List</h1>

      <Card className="flex flex-col w-full ">
        <CardContent className="flex h-full flex-col">
          <form className="flex gap-3 py-6 pb-0" onSubmit={(e) => { e.preventDefault(); searchAgent(); }}>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for agent..."
              className="flex-1"
            />
            <Button type="submit">
              <Search />
            </Button>
          </form>
          <div className="flex py-6 h-full gap-6 ">
            <ScrollArea className="min-w-[400px] min-h-[80vh] max-w-[400px] max-h-[100vh] rounded-md border">
              <div className="p-4">
                {/* Agent List */}
                {agents.length === 0 ? (
                  <div className="text-center">No agents found</div> // Message when no agents
                ) : (
                  agents.map((agent) => (
                    <div key={agent.id} className="cursor-pointer pt-2 pb-2" onClick={() => fetchAgentDetails(agent.id ?? 'default-id')}>
                      <ProfileCard
                        avatar={agent.avatar}
                        name={agent.name}
                        position={agent.position || "Unassigned"}
                      />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="min-full h-full w-full flex flex-1 flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-semibold">Agent File</h2>

                {isAdmin && (
                  isEditing ? (
                    <AlertDialog>
                      <AlertDialogTrigger className="flex items-center bg-red-500 text-white border h-9 font-medium gap-2 px-4 py-2 rounded-md text-sm ml-4">
                        <Archive className="h-4 w-4" />Archive Agent
                      </AlertDialogTrigger>

                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Archive Agent</AlertDialogTitle>
                        </AlertDialogHeader>
                        <div className="py-2">
                          <p>Are you sure you want to archive this agent?</p>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction onClick={handleArchiveAgent}>
                            Archive
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger className="flex items-center bg-blue-200 text-zinc-900 border  h-9 font-medium gap-2 px-4 py-2 rounded-md text-sm ml-4"
                        onClick={() => { setFirstName(""); setLastName(""); setEmail("") }}
                      >
                        <Plus className="h-4 w-4" />Add Agent
                      </AlertDialogTrigger>

                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Add New Agent</AlertDialogTitle>
                        </AlertDialogHeader>
                        <label className="block">First Name</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full p-2 border rounded-md"
                          placeholder="Enter first name"
                          required
                        />

                        <label className="block">Last Name</label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full p-2 border rounded-md"
                          placeholder="Enter last name"
                          required
                        />

                        <label className="block">Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full p-2 border rounded-md"
                          placeholder="Enter email"
                          required
                        />
                        {email && !isValidEmail(email) && (
                          <p className="text-red-500 text-xs pt-0 mt-0">Please enter a valid email address.</p>
                        )}

                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction onClick={handleAddAgent} disabled={!(firstName && lastName && email && isValidEmail(email))}>
                            Add Agent
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )
                )}

              </div>

              {selectedAgent ? (
                <Card className="w-full h-full flex flex-col">
                  <CardContent className="p-6 ">
                    {/^\d{4}-\d{2}-\d{2}$/.test(suspensionEndDate) && selectedAgent.isSuspended && (
                      <div className="w-full p-4 border border-red-500 text-red-400 rounded-md mb-4 flex">
                        <CircleAlert className="mr-2" /> This agent is suspend till {suspensionEndDate}
                      </div>
                    )}
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 w-full'>
                      {/* Avatar (Profile Picture) */}
                      <div className="sm:col-span-2 mb-6 flex flex-col items-center">
                        <div
                          onClick={() => {
                            const fileInput = document.getElementById('avatarInput') as HTMLInputElement | null;
                            if (fileInput) {
                              fileInput.click();
                            }
                          }}
                          className="cursor-pointer w-40 h-40 mb-4 rounded-full overflow-hidden border-2 border-gray-300"
                        >
                          <img
                            src={
                              profile?.avatar === ''
                                ? 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp'
                                : selectedAgent?.avatar
                            }
                            alt="selectedAgent"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <input
                          type="file"
                          id="avatarInput"
                          accept="image/*"
                          className="hidden"
                          onChange={handleavatarChange}
                        />
                      </div>

                      <div className="sm:col-span-2 mb-6 flex flex-col items-center">
                        <StarRating rating={agentRating} />
                      </div>

                      {/* First Name Field */}
                      <div>
                        <label className="block mb-1">First Name</label>
                        <input
                          type="text"
                          className="border p-2 w-full"
                          value={selectedAgent.firstName || ""}
                          disabled={!isEditing}
                          onChange={(e) => handleInputChange(e, 'firstName')}
                        />
                      </div>

                      {/* Last Name Field */}
                      <div>
                        <label className="block mb-1">Last Name</label>
                        <input
                          type="text"
                          className="border p-2 w-full"
                          value={selectedAgent.lastName || ""}
                          disabled={!isEditing}
                          onChange={(e) => handleInputChange(e, 'lastName')}
                        />
                      </div>

                      {/* Email Field */}
                      <div>
                        <label className="block mb-1">Email</label>
                        <input
                          type="email"
                          className="border p-2 w-full"
                          value={selectedAgent.email || ""}
                          disabled={!isEditing}
                          onChange={(e) => handleInputChange(e, 'email')}
                        />
                      </div>

                      {/* Position Field */}
                      <div className="mb-4 w-full">
                        <label className="block mb-1">Position</label>
                        <select
                          className="border p-2 w-full"
                          value={selectedAgent.position || ""}
                          onChange={(e) => handleInputChange(e, 'position')}
                          disabled={!isEditing}
                        >
                          <option hidden>Select position</option>
                          <option value="Admin">Admin</option>
                          <option value="Operator">Operator</option>
                          <option value="Shooter">Shooter</option>
                          <option value="Specialist">Specialist</option>
                        </select>
                      </div>

                      {/* Birthday Field */}
                      <div className="md:order-8">
                        <label className="block mb-1">Birthday</label>
                        <input
                          type="date"
                          className="border p-2 w-full"
                          value={birthday || ""}
                          disabled={!isEditing}
                          onChange={(e) => { handleDateChange(e, "birthday") }}
                        />
                      </div>

                      {/* Contact Number Field */}
                      <div className="md:order-8">
                        <label className="block mb-1">Contact Number</label>
                        <input
                          type="text"
                          className="border p-2 w-full"
                          value={selectedAgent.contactNumber || ""}
                          disabled={!isEditing}
                          onChange={(e) => handleInputChange(e, 'contactNumber')}
                        />
                      </div>

                      {/* Date Hired Field */}
                      <div className="md:order-8">
                        <label className="block mb-1">Date Hired</label>
                        <input
                          type="date"
                          className="border p-2 w-full"
                          value={dateHired || ""}
                          disabled={!isEditing}
                          onChange={(e) => { handleDateChange(e, "dateHired") }}
                        />
                      </div>

                      {/* Address Field */}
                      <div className="mb-4 w-full col-span-2 ">
                        <label className="block mb-2 capitalize">Address</label>
                        <input
                          type="text"
                          value={selectedAgent.address || ""}
                          disabled={!isEditing}
                          className="w-full p-2 border rounded-md"
                          onChange={(e) => handleInputChange(e, 'address')}
                        />
                      </div>

                      {/* Role Field */}
                      <div className="mb-4 w-full md:order-8">
                        <label className="block mb-1">Role</label>
                        <select
                          className="border p-2 w-full"
                          disabled={!isEditing}
                          value={selectedAgent.role || ""}  // Ensure it reflects the boolean state as 'true' or 'false'
                          onChange={(e) => handleInputChange(e, 'role')}
                        >
                          <option hidden>Select role</option>
                          <option value="agent">agent</option>
                          <option value="admin">admin</option>
                        </select>
                      </div>
                    </div>

                    {/* Password Field */}
                    {isAdmin && (
                      isEditing && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 w-full">

                          <div className="mb-4 w-full col-span-2 flex flex-row">
                            <div className="w-full relative"> {/* Added 'relative' to this container */}
                              <label className="block mb-2">Password</label>
                              <div className="w-full">
                                <input
                                  type={isPasswordVisible ? 'text' : 'password'}
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  className="w-full p-2 border rounded-md"
                                />
                                <button
                                  type="button"
                                  onClick={togglePasswordVisibility}
                                  className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 mt-4"
                                >
                                  {isPasswordVisible ? (
                                    <EyeOff className="w-5 h-5" />
                                  ) : (
                                    <Eye className="w-5 h-5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <AlertDialog>
                              <AlertDialogTrigger className="bg-white text-zinc-900 border h-11 w-[33%] font-medium rounded-md text-sm ml-4 self-end">
                                Reset Password
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reset Password</AlertDialogTitle>
                                </AlertDialogHeader>
                                Are you sure you want to reset the password of {selectedAgent.firstName} {selectedAgent.lastName}
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleResetPassword}>Reset</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>

                        </div>
                      )
                    )}
                  </CardContent>
                  <CardFooter className='self-end mt-auto'>
                    {isAdmin && (
                      isEditing ? (
                        <div>
                          {/* Edit | Save */}
                          <AlertDialog>
                            <AlertDialogTrigger className="bg-zinc-700 text-white border h-9 font-medium gap-2 px-4 py-2 rounded-md text-sm mr-4">
                              Cancel
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Edit Agent</AlertDialogTitle>
                              </AlertDialogHeader>
                              Are you sure you want to discard the changes?
                              <AlertDialogFooter>
                                <AlertDialogCancel>No</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancelChanges}>Yes</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger className="bg-white text-zinc-900 border h-9 font-medium gap-2 px-4 py-2 rounded-md text-sm">
                              Save Changes
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Edit Agent</AlertDialogTitle>
                              </AlertDialogHeader>
                              Are you sure you want to save these changes?
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleSaveChanges}>Save</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ) : (
                        <div>
                          {selectedAgent.isSuspended ? (
                            <AlertDialog>
                              <AlertDialogTrigger className="bg-red-600 text-white border h-10 font-medium gap-2 px-3 py-2 rounded-md text-sm mr-4">
                                Unsuspend
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Unsuspend Agent</AlertDialogTitle>
                                </AlertDialogHeader>
                                <p>
                                  Are you sure you want to unsuspend this agent?
                                </p>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleUnsuspendAgent} className="bg-red-600 text-white hover:bg-red-500">Confirm</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger className="bg-red-600 text-white border h-10 font-medium gap-2 px-3 py-2 rounded-md text-sm mr-4">
                                Suspend
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Suspend Agent</AlertDialogTitle>
                                </AlertDialogHeader>
                                <label className="block mb-1">Date of Event</label>
                                <input
                                  type="date"
                                  className="border p-2 w-full"
                                  value={selectedAgent.suspensionEndDate || ""}
                                  onChange={(e) => { handleDateChange(e, "suspensionEndDate") }}
                                  min={new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })}
                                />

                                {/^\d{4}-\d{2}-\d{2}$/.test(suspensionEndDate) ? (
                                  <p>
                                    Are you sure you want to suspend this agent for <span className=" font-bold">{getSuspensionDays(suspensionEndDate)} days</span>?
                                  </p>
                                ) : (
                                  <p className="text-zinc-400">
                                    Please select a date
                                  </p>
                                )}
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleSuspendAgent} className="bg-red-600 text-white hover:bg-red-500">Confirm</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {/* Edit | Save */}

                          <Button onClick={() => setIsEditing(true)} className="p-2 h-10 bg-zinc-500 text-white rounded-md">
                            Edit Profile
                          </Button>
                        </div>

                      )
                    )}
                  </CardFooter>
                </Card>
              ) : (
                <div className="flex items-center justify-center h-full text-xl text-gray-500">
                  Please select an agent
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
