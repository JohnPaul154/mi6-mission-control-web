'use client';

import React, { useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardFooter
} from "@/components/ui/card";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ProfileCard } from "@/components/profile-card";
import { Plus, Trash2 } from "lucide-react"; // Import Plus icon from Lucide

type Profile = {
  imageSrc: string;
  name: string;
  position: string;
  status: boolean;
};

type Profiles = {
  [key: string]: Profile;
};

export default function AgentListPage() {
  const [profiles, setProfiles] = useState<Profiles>({
    "1": {
      imageSrc: "https://github.com/shadcn.png",
      name: "John Doe",
      position: "Software Engineer",
      status: true,
    },
    "2": {
      imageSrc: "https://via.placeholder.com/150",
      name: "Jane Smith",
      position: "Project Manager",
      status: false,
    },
    "3": {
      imageSrc: "https://via.placeholder.com/150",
      name: "Sam Wilson",
      position: "Designer",
      status: true,
    },
  });

  const [firstName, setFirstName] = useState("John");
  const [lastName, setLastName] = useState("Doe");
  const [position, setPosition] = useState("Software Engineer");
  const [password, setPassword] = useState("default"); 
  const [profilePic, setProfilePic] = useState("https://github.com/shadcn.png"); 
  const [isEditing, setIsEditing] = useState(false); 
  const [confirmPassword, setConfirmPassword] = useState(""); 
  const [passwordMismatch, setPasswordMismatch] = useState(false); 
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null); // Track the selected agent

  const handleCardClick = (id: string) => {
    setSelectedAgent(id); // Set the selected agent ID
    const profile = profiles[id];
    if (profile) {
      setFirstName(profile.name.split(' ')[0]);
      setLastName(profile.name.split(' ')[1] || ""); // Assuming first and last name are separated by a space
      setPosition(profile.position);
      setProfilePic(profile.imageSrc);
    }
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result as string); 
      };
      reader.readAsDataURL(file); 
    }
  };

  const handleSaveChanges = () => {
    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }
    setPasswordMismatch(false);
    setIsEditing(false);
  };

  const handleAddAgent = () => {
    // Placeholder function for adding an agent
    alert("Add Agent button clicked");
  };

  return (
    <div className="min-full h-full w-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4">Agent List</h1>

      <Card className="w-full h-full">
        <CardContent className="flex p-6 h-full gap-6">
          <ScrollArea className="h-full w-[350px] rounded-md border">
            <div className="p-4">
              {Object.entries(profiles).map(([id, profile]) => (
                <div
                  key={id}
                  onClick={() => handleCardClick(id)}
                  className="cursor-pointer pt-2 pb-2"
                >
                  <ProfileCard
                    imageSrc={profile.imageSrc}
                    name={profile.name}
                    position={profile.position}
                    status={profile.status}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="min-full h-full w-full flex flex-1 flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-semibold">Agent File</h2>
              <button
                onClick={handleAddAgent}
                className="flex items-center p-2 bg-blue-500 text-white rounded-md"
              >
                <Plus className="w-5 h-5 mr-2" /> {/* Lucide Plus Icon */}
                Add Agent
              </button>
            </div>

            <Card className="flex flex-col flex-1 rounded-md border">
              <CardContent className="flex flex-col flex-1 p-6">
                <div className="mb-6 flex flex-col">
                  <div 
                    onClick={() => {
                      const fileInput = document.getElementById("profilePicInput") as HTMLInputElement | null;
                      if (fileInput) {
                        fileInput.click();
                      }
                    }} 
                    className="cursor-pointer w-40 h-40 mb-4 rounded-full overflow-hidden border-2 border-gray-300"
                  >
                    <img
                      src={profilePic}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <input
                    type="file"
                    id="profilePicInput"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePicChange}
                  />
                </div>

                <div className="mb-4 w-full max-w-xs">
                  <label className="block mb-2">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-2 border rounded-md"
                  />
                </div>

                <div className="mb-4 w-full max-w-xs">
                  <label className="block mb-2">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-2 border rounded-md"
                  />
                </div>

                <div className="mb-4 w-full max-w-xs">
                  <label className="block mb-2">Position</label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-2 border rounded-md"
                  />
                </div>

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

                    <div className="mb-6 w-full max-w-xs">
                      <label className="block mb-2">Confirm Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      />
                      {passwordMismatch && (
                        <p className="text-red-500 text-sm">Passwords do not match!</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>

              <CardFooter>
                {isEditing ? (
                  <button
                    onClick={handleSaveChanges}
                    className="p-2 bg-red-500 text-white rounded-md"
                  >
                    Save Changes
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)} 
                    className="p-2 bg-zinc-500 text-white rounded-md"
                  >
                    Edit Profile
                  </button>
                )}
              </CardFooter>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
