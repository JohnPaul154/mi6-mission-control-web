'use client'

import React, { useState, useEffect } from "react";
import { useSession } from "@/context/SessionContext";  // Assuming you have a session context
import { firestoreDB } from '@/firebase/initFirebase';  // Firebase import
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

// Define the shape of session data, assuming it has `id`, `firstName`, `lastName`, `position`, `avatar`, and `email`
interface Session {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  avatar: string;
  email: string; // Adding email field
}

export default function ProfilePage() {
  const { session } = useSession(); // Assuming your session context provides the session
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [password, setPassword] = useState(""); // Handle password appropriately
  const [avatar, setavatar] = useState(""); // Keep avatar as a string, initially empty
  const [email, setEmail] = useState(""); // Email field (not editable)
  const [isEditing, setIsEditing] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {

      if (!session?.id) return;

      try {
        // Fetch the user profile from Firestore using the user's ID
        const userDocRef = doc(firestoreDB, "agents", session.id);
        const agent = await getDoc(userDocRef);

        console.log(agent)

        if (agent.exists()) {
          console.log(agent)
          const userData = agent.data();
          setFirstName(userData.firstName);
          setLastName(userData.lastName);
          setPosition(userData.position);
          // Set avatar to either user data or default to Gravatar if it's an empty string
          setavatar(userData.avatar || ""); // If avatar is empty, it will fallback
          setEmail(userData.email); // Email from Firestore
        } else {
          console.log("No user found!");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, [session]);

  // Handle profile picture change
  const handleavatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setavatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }
    setPasswordMismatch(false);
    setIsEditing(false);

    if (!session?.id) {
      console.error("Session not found. Cannot update profile.");
      return; // Stop execution if session is not available
    }
  
    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    setPasswordMismatch(false);
    setIsEditing(false);

    setPassword("");
    setConfirmPassword("");
  
    // Update Firebase with new profile information
    try {
      const userDocRef = doc(firestoreDB, "agents", session.id); // Use the UID from the session to identify the user document

      const updateData: { [key: string]: any } = {
        firstName,
        lastName,
        position,
        avatar,
      };

      // Only include the password if it's not empty
      if (password) {
        updateData.password = password;
      }

      await updateDoc(userDocRef, updateData);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  return (
    <div className="min-full h-full w-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4">{isEditing ? "Profile / Edit" : "Profile"}</h1>

      <Card className="w-full h-full flex flex-col">
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
                src={avatar === "" ? "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp" : avatar}  // Default to Gravatar if empty string
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
              value={firstName}
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
              value={lastName}
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
              value={email}
              disabled={true}
              className="w-full p-2 border rounded-md "
            />
          </div>

          {/* Position */}
          <div className="mb-4 w-full max-w-xs">
            <label className="block mb-2">Position</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              disabled={true}
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
              onClick={() => setIsEditing(true)} // Switch to edit mode
              className="p-2 bg-zinc-500 text-white rounded-md"
            >
              Edit Profile
            </button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
