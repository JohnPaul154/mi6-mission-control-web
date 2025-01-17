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
import { Plus, Trash2 } from "lucide-react"; // Import Plus icon from Lucide
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"; // Import AlertDialog components

import { getDocs, collection, getDoc, doc, addDoc, query, where } from "firebase/firestore";
import { firestoreDB } from "@/firebase/init-firebase"; // Make sure to import your firestore instance
import { AgentData } from "@/firebase/collection-types";

type Profile = {
  imageSrc: string;
  name: string;
  position: string;
  status: boolean;
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
  const [profiles, setProfiles] = useState<AgentData[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null); // New state for selected agent

  const fetchAgents = async () => {
    try {
      const querySnapshot = await getDocs(collection(firestoreDB, "agents"));
      const agentData: AgentData[] = [];
  
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data() as AgentData;
  
        // Push the agent data
        agentData.push({
          id: docSnapshot.id, // Add the document ID to each agent's data
          avatar: data.avatar || "https://via.placeholder.com/150", // Default avatar URL if missing
          email: data.email || "No Email Provided",
          firstName: data.firstName || "Unknown",
          isActive: data.isActive || false,
          isEmployed: data.isEmployed || false,
          lastName: data.lastName || "Unknown",
          password: data.password || "", // Ensure password is retrieved (use cautiously)
          position: data.position || "Unknown Position",
          role: data.role || "Unknown Role",
        });
      }
  
      setProfiles(agentData)
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  const fetchAgentDetails = async (id: string) => {
    try {
      const docRef = doc(firestoreDB, "agents", id); // Reference to the specific agent
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setSelectedAgent(docSnap.data() as AgentData); // Update selected agent state
      } else {
        console.log("No such agent!");
      }
    } catch (error) {
      console.error("Error fetching agent details:", error);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // Add state for new agent details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Dialog open state

  // Additional states for editing profile
  const [avatar, setAvatar] = useState<string>("");
  const [position, setPosition] = useState<string>("Unknown");
  const [isEditing, setIsEditing] = useState(false);
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [passwordMismatch, setPasswordMismatch] = useState<boolean>(false);

  const openAddAgent = () => {
    // Placeholder function for adding an agent (e.g., save the data to your profiles)
    const newAgentId = String(Object.keys(profiles).length + 1); // Example ID logic
    const newProfile: Profile = {
      imageSrc: "https://via.placeholder.com/150", // Default image for new agent
      name: `${firstName} ${lastName}`,
      position: "Unknown", // Default position
      status: true, // Default status
    };
    setIsDialogOpen(false); // Close the dialog after adding
    // Clear inputs
    setFirstName("");
    setLastName("");
    setEmail("");
  };

  const handleAddAgent = async () => {
    try {
      // Step 1: Check if the email already exists in Firestore
      const agentsRef = collection(firestoreDB, "agents");
      const q = query(agentsRef, where("email", "==", email));
  
      const querySnapshot = await getDocs(q);
      
      // Step 2: If email exists, alert the user
      if (!querySnapshot.empty) {
        alert("An agent with this email already exists!");
        return;
      }
  
      // Step 3: Create the new agent object
      const newAgent: AgentData = {
        avatar: "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp", // Default avatar URL if missing
        email: email,
        firstName: firstName,
        isActive: true, // Default active status
        isEmployed: true, // Default employed status
        lastName: lastName,
        password: generatePassword(), // Placeholder password field, use cautiously
        position: "Unknown", // Default position
        role: "agent", // Default role
      };
  
      // Step 4: Add the new agent to Firestore
      await addDoc(collection(firestoreDB, "agents"), newAgent);
      
      // Step 5: Reset form fields after adding the agent
      setFirstName("");
      setLastName("");
      setEmail("");
      setIsDialogOpen(false); // Close the dialog after adding
  
    } catch (error) {
      console.error("Error adding agent:", error);
    }
  };

  const handleSaveChanges = () => {
    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    // Save changes logic (e.g., update the agent profile in Firestore)
    setIsEditing(false);
    // Clear the password fields
    setPassword("");
    setConfirmPassword("");
  };

  const handleavatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-full h-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4">Agent List</h1>

      <Card className="flex flex-col w-full h-full">
        <CardContent className="flex p-6 h-full gap-6">
          <ScrollArea className="min-w-[300px] max-w-[400px] rounded-md border">
            <div className="p-4">
              {/* Agent List */}
              {profiles.map((profile) => (
                <div key={profile.id} className="cursor-pointer pt-2 pb-2" onClick={() => fetchAgentDetails(profile.id ?? 'default-id')}>
                  <ProfileCard
                    imageSrc={profile.avatar}
                    name={`${profile.firstName} ${profile.lastName}`}
                    position={profile.position || ""}
                    status={profile.isActive}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="min-full h-full w-full flex flex-1 flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-semibold">Agent File</h2>
              <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogTrigger className="flex items-center p-2 bg-blue-500 text-white rounded-md">
                  <Plus className="mr-2" /> Add Agent
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Add New Agent</AlertDialogTitle>
                  </AlertDialogHeader>

                  <form onSubmit={(e) => { e.preventDefault(); openAddAgent(); }}>
                    <label className="block mb-4">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full p-2 border rounded-md mb-4"
                      placeholder="Enter first name"
                      required
                    />

                    <label className="block mb-4">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full p-2 border rounded-md mb-4"
                      placeholder="Enter last name"
                      required
                    />

                    <label className="block mb-4">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-2 border rounded-md mb-4"
                      placeholder="Enter email"
                      required
                    />

                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction type="submit" onClick={(e) => {
                          e.preventDefault(); // Prevent form submission
                          handleAddAgent(); // Call your handler function
                        }}>
                        Add Agent
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </form>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {selectedAgent ? (
              <Card className="flex flex-col flex-1 rounded-md border">
                <CardContent className="flex flex-col flex-1 p-6">
                  {/* Avatar (Profile Picture) */}
                  <div className="mb-6 flex flex-col">
                    <div
                      onClick={() => {
                        const fileInput = document.getElementById("avatarInput") as HTMLInputElement | null;
                        if (fileInput) {
                          fileInput.click();
                        }
                      }}
                      className="cursor-pointer w-40 h-40 mb-4 rounded-full overflow-hidden border-2 border-gray-300"
                    >
                      <img
                        src={selectedAgent.avatar || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp"}  // Default to Gravatar if empty string
                        alt="Profile"
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

                  {/* First Name */}
                  <div className="mb-4 w-full max-w-xs">
                    <label className="block mb-2">First Name</label>
                    <input
                      type="text"
                      value={selectedAgent.firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={!isEditing}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>

                  {/* Last Name */}
                  <div className="mb-4 w-full max-w-xs">
                    <label className="block mb-2">Last Name</label>
                    <input
                      type="text"
                      value={selectedAgent.lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={!isEditing}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>

                  {/* Email (not editable) */}
                  <div className="mb-4 w-full max-w-xs">
                    <label className="block mb-2">Email</label>
                    <input
                      type="email"
                      value={selectedAgent.email}
                      disabled={true}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>

                  {/* Position */}
                  <div className="mb-4 w-full max-w-xs">
                    <label className="block mb-2">Position</label>
                    <input
                      type="text"
                      value={selectedAgent.position}
                      onChange={(e) => setPosition(e.target.value)}
                      disabled={!isEditing}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>

                  {/* Password */}
                  {isEditing && (
                    <>
                      <div className="mb-4 w-full max-w-xs">
                        <label className="block mb-2">Password</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full p-2 border rounded-md"
                        />
                      </div>
                      <div className="mb-4 w-full max-w-xs">
                        <label className="block mb-2">Confirm Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full p-2 border rounded-md"
                        />
                      </div>
                    </>
                  )}
                </CardContent>

                <CardFooter className="flex gap-4 justify-end">
                  {/* Buttons */}
                  <div className="flex justify-between">
                    {isEditing ? (
                      <>
                        <button
                          className="px-4 py-2 bg-red-500 text-white rounded-md"
                          onClick={() => setIsEditing(false)} // Cancel editing
                        >
                          Cancel
                        </button>
                        <button
                          className="px-4 py-2 bg-green-500 text-white rounded-md ml-4"
                          onClick={handleSaveChanges}
                        >
                          Save Changes
                        </button>
                      </>
                    ) : (
                      <button
                        className="px-4 py-2 bg-blue-500 text-white rounded-md"
                        onClick={() => setIsEditing(true)} // Start editing
                      >
                        Edit Agent
                      </button>
                    )}
                  </div>
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
