'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from "@/contexts/SessionContext";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { CircleHelp, Eye, EyeOff } from 'lucide-react';
import crypto from "crypto";

// Firebase Imports
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

// Components Imports
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { firestoreDB } from '@/firebase/init-firebase';

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const { session, setSession } = useSession();

  // Redirect if session exists
  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prevState) => !prevState);
  };

  const handleLogin = async () => {
    try {
      setError(null);

      const userRef = collection(firestoreDB, "agents");
      const q = query(userRef, where("email", "==", email), where("isArchive", "==", false));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        querySnapshot.forEach(async (doc) => {  // Use async function inside forEach to ensure proper await
          const userData = doc.data();

          if (userData.isSuspended) {
            setError(`Account is suspended till ${userData.suspensionEndDate}`);
            return
          }

          if (userData.password === password) {
            const otp = generateOTP();

            const message = {
              subject: 'Your OTP Code for MI6 Mission Control',
              text: `Hello ${userData.firstName} ${userData.lastName}, your OTP code for MI6 Mission Control is: ${otp}. It is valid for 5 minutes.`,
              html: `
                <p>Hello <strong>${userData.firstName} ${userData.lastName}</strong>,</p>
                <p>Your OTP code is: <strong>${otp}</strong>. It is valid for 5 minutes.</p>
                <p><em>This is an automated email. Please do not reply.</em></p>
              `
            };

            // Add the email request to Firestore
            const docRef = await addDoc(collection(firestoreDB, "mail"), {
              to: [userData.email],
              message: message,
              code: otp,
              timestamp: serverTimestamp()
            });

            // Redirect to the dashboard with encrypted data in the URL
            router.push(`/otp?data1=${doc.id}&data2=${docRef.id}`);

            // Optionally, you can also store session data if needed
            // setSession({
            //   id: docRef.id,
            //   email: userData.email,
            //   role: userData.role,
            // });

          } else {
            setError("Incorrect password. Please try again.");
          }

          console.log(userData);
        });
      } else {
        setError("User not found. Please check your email.");
      }
    } catch (err) {
      setError("An error occurred. Please try again later.");
      console.error("Login error:", err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md p-6">
        <CardHeader className="flex items-center">
          <img src="logo.png" alt="icon" className="w-24 h-24 mb-6" />
          <CardTitle className="font-semibold">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={isPasswordVisible ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder='Enter your password'
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
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="button" onClick={handleLogin} className="w-full">
                Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
