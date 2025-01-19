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
import { Plus, Trash2, Pencil, Eye, EyeOff, CircleHelp } from "lucide-react"; // Import Plus icon from Lucide
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

  // Add state for new agent details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Additional states for editing profile
  const [profile, setProfile] = useState<AgentData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [passwordMismatch, setPasswordMismatch] = useState<boolean>(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prevState) => !prevState);
  };

  const toggleConfirmPasswordVisibility = () => {
    setIsConfirmPasswordVisible((prevState) => !prevState);
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
        isActive: true,
        isEmployed: true,
        password: generatePassword(),
        position: "Agent",
        role: "agent",
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

  const handleIsActiveChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const isEmployed = (e.target.value === 'true'); // Convert the string to boolean

    if (selectedAgent) {
      setSelectedAgent({
        ...selectedAgent,
        isEmployed,
      });
    }

    console.log(selectedAgent?.isActive)
  };

  const handleCancelChanges = () => {
    setPasswordMismatch(false);
    setPassword('');
    setConfirmPassword('');
    setIsEditing(false)
    setShouldRefetch(!shouldRefetch)
  }

  const handleSaveChanges = async () => {
    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    try {
      const userDocRef = doc(firestoreDB, 'agents', selectedAgent!.id || "");
      const updateData: Partial<AgentData> = { ...selectedAgent };

      if (password) {
        updateData.password = password;
      }

      await updateDoc(userDocRef, updateData);

      const dataRef = ref(realtimeDB, `agents/${selectedAgent!.id}`)
      update(dataRef, {
        name: `${selectedAgent?.firstName} ${selectedAgent?.lastName}`,
        position: selectedAgent?.position,
        avatar: selectedAgent?.avatar,
      })

      // Clear password fields
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating profile:', error);
    }

    setShouldRefetch(!shouldRefetch)
    fetchAgentDetails(selectedAgent!.id || "");
    setIsEditing(false);
    // Clear the password fields
    setPassword("");
    setConfirmPassword("");
  };

  const handleDeleteAgent = async () => {
    try {
      const docRef = doc(firestoreDB, "agents", selectedAgent!.id || "");
      await deleteDoc(docRef);
      const dataRef = ref(realtimeDB, `agents/${selectedAgent!.id}`); // Replace with your data path
      remove(dataRef)
      setSelectedAgent(null);
      setIsEditing(false);
      setShouldRefetch(!shouldRefetch)
      console.log("Event deleted successfully!");
    } catch (error) {
      console.error("Error deleting event:", error);
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

  return (
    <div className="min-full h-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4 max-h-[3%]">Agent List</h1>

      <Card className="flex flex-col w-full h-full max-h-[96%]">
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
                    status={"online"}
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
                      <Trash2 className="h-4 w-4" />Delete Agent
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Agent</AlertDialogTitle>
                      </AlertDialogHeader>
                      <div className="py-2">
                        <p className="text-red-500 font-semibold">This is irreversable!</p>
                        <p>Are you sure you want to permanently delete this agent?</p>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAgent}>
                          Delete
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

                    {/* Profile Fields */}
                    {['firstName', 'lastName', 'email', 'position'].map((field) => (
                      <div key={field} className="mb-4 w-full">
                        <label className="block mb-2 capitalize">{field}</label>
                        <input
                          type="text"
                          value={selectedAgent ? (selectedAgent[field as keyof AgentData] as string) : ''}
                          onChange={(e) => handleInputChange(e, field as keyof AgentData)}
                          disabled={!isEditing || ['email'].includes(field)}
                          className="w-full p-2 border rounded-md"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Password */}
                  {isAdmin && (
                    isEditing && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 w-full">

                        <div className="mb-4 w-full">
                          <label className="block mb-1">Role</label>
                          <select
                            className="border p-2 w-full"
                            value={selectedAgent.role}  // Ensure it reflects the boolean state as 'true' or 'false'
                            onChange={(e) => handleInputChange(e, 'role')}
                          >
                            <option hidden>Select role</option>
                            <option value="agent">agent</option>
                            <option value="admin">admin</option>
                          </select>
                        </div>

                        <div className="mb-4 w-full">
                          <label className="block mb-1">Employment Status</label>
                          <select
                            className="border p-2 w-full"
                            value={selectedAgent.isEmployed ? 'true' : 'false'}  // Ensure it reflects the boolean state as 'true' or 'false'
                            onChange={handleIsActiveChange}
                          >
                            <option hidden>Select employment status</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </div>

                        <div className="mb-4 w-full">
                          <div className="flex relative group">
                            <label className="block mb-2 mr-2">Password</label>
                            <CircleHelp className="w-5 h-6" />
                            <div className="hidden group-hover:block bg-gray-200 text-zinc-700 text-xs rounded-md p-2 ml-2 mb-4 flex flex-row">
                              Put new password if you want to replace your current password, leave it empty if not.
                            </div>
                          </div>

                          <div className="relative">
                            <input
                              type={isPasswordVisible ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full p-2 border rounded-md"
                            />
                            <button
                              type="button"
                              onClick={togglePasswordVisibility}
                              className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500"
                            >
                              {isPasswordVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div className="mb-6 w-full">
                          <label className="block mb-2">Confirm Password</label>
                          <div className="relative">
                            <input
                              type={isConfirmPasswordVisible ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full p-2 border rounded-md"
                            />
                            <button
                              type="button"
                              onClick={toggleConfirmPasswordVisibility}
                              className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500"
                            >
                              {isConfirmPasswordVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {passwordMismatch && <p className="text-red-500 text-sm mt-2">Passwords do not match!</p>}
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
                          <AlertDialogTrigger className="bg-white text-zinc-900 border h-9 font-medium gap-2 px-4 py-2 rounded-md text-sm mr-4">
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
