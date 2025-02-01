'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { firestoreDB, realtimeDB } from '@/firebase/init-firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ref, update } from 'firebase/database';
import { AgentData } from '@/firebase/collection-types'; // Assuming this is where AgentData is defined
import { CircleHelp, Eye, EyeOff } from 'lucide-react';
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
import { Button } from '@/components/ui/button';


export default function ProfilePage() {
  const { session } = useSession();

  // State to manage the agent's data
  const [profile, setProfile] = useState<AgentData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [birthday, setBirthday] = useState("");
  const [contactNumber, setContactNumber] = useState("")

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.id) return;

      try {
        const userDocRef = doc(firestoreDB, 'agents', session.id);
        const agentSnapshot = await getDoc(userDocRef);

        if (agentSnapshot.exists()) {
          const userData = agentSnapshot.data() as AgentData;
          setProfile(userData);
          setBirthday(userData.birthday);
          setContactNumber(userData.contactNumber);
        } else {
          console.error('No user found!');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [session, shouldRefetch]);

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prevState) => !prevState);
  };

  const toggleConfirmPasswordVisibility = () => {
    setIsConfirmPasswordVisible((prevState) => !prevState);
  };


  // Handle inputs
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

  const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digit characters
    if (value.length <= 11) {
      setContactNumber(value); 
      handleInputChange(e, field as keyof AgentData);
    }
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

      const dataRef = ref(realtimeDB, `agents/${session.id}`)

      update(dataRef, {
        name: `${profile?.firstName} ${profile?.lastName}`,
        position: profile?.position,
        avatar: profile?.avatar,
      })

      // Clear password fields
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
      const newDate = e.target.value
  
      if (field === "birthday") {
        setProfile({
          ...profile!,
          birthday: newDate
        });
        setBirthday(newDate);
      }
    };

  return (
    <div className="min-full h-full w-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4">
        {isEditing ? 'Profile / Edit' : 'Profile'}
      </h1>

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

            {/* First Name Field */}
            <div>
                      <label className="block mb-1">First Name</label>
                      <input
                        type="text"
                        className="border p-2 w-full"
                        value={profile?.firstName || ""}
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
                        value={profile?.lastName || ""}
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
                        value={profile?.email || ""}
                        disabled={true}
                        onChange={(e) => handleInputChange(e, 'email')}
                      />
                    </div>

                    {/* Position Field */}
                    <div className="mb-4 w-full">
                      <label className="block mb-1">Position</label>
                      <input
                        type="text"
                        className="border p-2 w-full"
                        value={profile?.position || ""}
                        onChange={(e) => handleInputChange(e, 'position')}
                        disabled={true}
                      />
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
                        value={contactNumber}
                        disabled={!isEditing}
                        onChange={(e) => handleContactNumberChange(e, 'contactNumber')}
                      />
                    </div>

                    {/* Date Hired Field */}
                    <div className="md:order-8">
                      <label className="block mb-1">Date Hired</label>
                      <input
                        type="date"
                        className="border p-2 w-full"
                        value={profile?.dateHired || ""}
                        disabled={true}
                      />
                    </div>

                    {/* Address Field */}
                    <div className="mb-4 w-full col-span-2 ">
                      <label className="block mb-2 capitalize">Address</label>
                      <input
                        type="text"
                        value={profile?.address || ""}
                        disabled={!isEditing}
                        className="w-full p-2 border rounded-md"
                        onChange={(e) => handleInputChange(e, 'address')}
                      />
                    </div>

                    {/* Role Field */}
                    <div className="mb-4 w-full md:order-8">
                      <label className="block mb-1">Role</label>
                      <input
                        type="text"
                        className="border p-2 w-full"
                        disabled={true}
                        value={profile?.role || ""}  // Ensure it reflects the boolean state as 'true' or 'false'
                        onChange={(e) => handleInputChange(e, 'role')}
                      />
                    </div>
                  </div>

          {/* Password */}
          {isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 w-full">
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
          )}
        </CardContent>
        <CardFooter className='self-end mt-auto'>
          {isEditing ? (
            <div>
              <AlertDialog>
                <AlertDialogTrigger className="bg-zinc-700 text-white border outline-white h-9 font-medium gap-2 px-4 py-2 rounded-md text-sm mr-4">
                  Cancel
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Edit Profile</AlertDialogTitle>
                  </AlertDialogHeader>
                  Are you sure you want to discard the changes?
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelChanges}>Discard</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger className="bg-white text-zinc-900 border outline-white h-9 font-medium gap-2 px-4 py-2 rounded-md text-sm mr-4">
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
            </div>
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
