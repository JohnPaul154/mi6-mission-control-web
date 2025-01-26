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
import { Plus, Trash2, Pencil, Eye, EyeOff, CircleHelp, Archive } from "lucide-react"; // Import Plus icon from Lucide
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"; // Import AlertDialog components

import { getDocs, collection, getDoc, doc, addDoc, query, where, updateDoc, deleteDoc } from "firebase/firestore";
import { get, ref, remove, set, update } from "firebase/database";
import { firestoreDB, realtimeDB } from "@/firebase/init-firebase"; // Make sure to import your firestore instance
import { AgentData } from "@/firebase/collection-types";
import { useSession } from "@/contexts/SessionContext";

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
        });

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

      if (docSnap.exists()) {
        setIsEditing(false);
        setSelectedAgent({ id, ...docSnap.data() } as AgentData);
        setBirthday(docSnap.data().birthday || "");
        setDateHired(docSnap.data().dateHired || "")
        setPassword(docSnap.data().password);
      } else {
        console.log("No such agent!");
      }
    } catch (error) {
      console.error("Error fetching agent details:", error);
    }
  };

  useEffect(() => {
    const fetchAgents = async () => {
      const agentsData = await getAllAgents();
      setAgents(agentsData as AgentDataMini[]); // Setting the agents state after the data is fetched
    };

    fetchAgents();
  }, [shouldRefetch]);

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
        password: generatePassword(),
        isNew: true,
        isArchive: false,
      };

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
        avatar: newAgent.avatar
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
    setIsEditing(false)
    setShouldRefetch(!shouldRefetch)
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
      const docRef = doc(firestoreDB, "agents", selectedAgent!.id || "");
      await updateDoc(docRef, {
        password: generatePassword()
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
    }
  };

  return (
    <div className="min-full h-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4 max-h-[3%]">Agent List</h1>

      <Card className="flex flex-col w-full">
        <CardContent className="flex p-6 h-full gap-6">
          <ScrollArea className="min-w-[300px] max-w-[400px] rounded-md border">
            <div className="p-4">
              {/* Agent List */}
              {agents.map((agent) => (
                <div key={agent.id} className="cursor-pointer pt-2 pb-2" onClick={() => fetchAgentDetails(agent.id ?? 'default-id')}>
                  <ProfileCard
                    avatar={agent.avatar}
                    name={agent.name}
                    position={agent.position || "Unassigned"}
                  />
                </div>
              ))}
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
                    <AlertDialogTrigger className="flex items-center bg-blue-200 text-zinc-900 border  h-9 font-medium gap-2 px-4 py-2 rounded-md text-sm ml-4">
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

                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleAddAgent}>
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
                        type="text"
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
                      <button onClick={() => setIsEditing(true)} className="p-2 bg-zinc-500 text-white rounded-md">
                        Edit Profile
                      </button>
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
        </CardContent>
      </Card>
    </div>
  );
}
