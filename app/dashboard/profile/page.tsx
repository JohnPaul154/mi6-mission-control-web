'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { firestoreDB } from '@/firebase/init-firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { AgentData } from '@/firebase/collection-types'; // Assuming this is where AgentData is defined
import { CircleHelp } from 'lucide-react';
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


export default function ProfilePage() {
  const { session } = useSession();

  // State to manage the agent's data
  const [profile, setProfile] = useState<AgentData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.id) return;

      try {
        const userDocRef = doc(firestoreDB, 'agents', session.id);
        const agentSnapshot = await getDoc(userDocRef);

        if (agentSnapshot.exists()) {
          const userData = agentSnapshot.data() as AgentData;
          setProfile(userData);
        } else {
          console.error('No user found!');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [session]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof AgentData
  ) => {
    if (profile) {
      setProfile({
        ...profile,
        [field]: e.target.value,
      });
    }
  };

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

  const handleSaveChanges = async () => {
    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    setPasswordMismatch(false);
    setIsEditing(false);

    if (!session?.id || !profile) {
      console.error('Session or profile data not found. Cannot update profile.');
      return;
    }

    try {
      const userDocRef = doc(firestoreDB, 'agents', session.id);
      const updateData: Partial<AgentData> = { ...profile };

      if (password) {
        updateData.password = password;
      }

      await updateDoc(userDocRef, updateData);

      // Clear password fields
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  return (
    <div className="min-full h-full w-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4">
        {isEditing ? 'Profile / Edit' : 'Profile'}
      </h1>

      <Card className="w-full h-full flex flex-col">
        <CardContent className="flex flex-col flex-1 p-6">
          {/* Avatar (Profile Picture) */}
          <div className="mb-6 flex flex-col">
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
                    : profile?.avatar
                }
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

          {/* Profile Fields */}
          {['firstName', 'lastName', 'position', 'role', 'email'].map((field) => (
            <div key={field} className="mb-4 w-full max-w-xs">
              <label className="block mb-2 capitalize">{field}</label>
              <input
                type="text"
                value={profile ? (profile[field as keyof AgentData] as string) : ''}
                onChange={(e) => handleInputChange(e, field as keyof AgentData)}
                disabled={!isEditing || ['email', 'role', 'position'].includes(field)}
                className="w-full p-2 border rounded-md"
              />
            </div>
          ))}

          {/* Password */}
          {isEditing && (
            <div>
              <div className="mb-4 w-full max-w-xs">

                <div className='flex relative group'>
                  <label className="block mb-2 mr-2">Password </label>
                  <CircleHelp className='w-5 h-6 ' />
                  <div className="hidden group-hover:block bg-gray-200 text-zinc-700 text-xs rounded-md p-2 ml-2 mb-4 flex flex-row">
                    Put new password if you want to replace your current password, leave it empty if not.
                  </div>
                </div>

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
            </div>
          )}
        </CardContent>
        <CardFooter>
          {isEditing ? (
            <AlertDialog>
              <AlertDialogTrigger className="p-2 bg-red-500 text-white rounded-md">
                  Save Changes
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Edit Profile</AlertDialogTitle>
                </AlertDialogHeader>
                  Are you sure you want to save these changes?
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSaveChanges}>Save</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <button onClick={() => setIsEditing(true)} className="p-2 bg-zinc-500 text-white rounded-md">
              Edit Profile
            </button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
