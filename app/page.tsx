'use client'

import React, { useState } from 'react';
import { useSession } from "@/context/SessionContext"; // Import the hook
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";

// Firebase Imports

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";

// Components Imports
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"



import { firestoreDB } from '@/firebase/initFirebase';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { setSession } = useSession();

  // Function to handle login logic by directly comparing email and password in Firestore
  const handleLogin = async () => {
    try {
      setError(null);
  
      const userRef = collection(firestoreDB, "agents");
      const q = query(userRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
  
      if (!querySnapshot.empty) {
        querySnapshot.forEach((doc) => {
          const userData = doc.data();

          if (userData.password === password) {
            // Save the session data
            setSession({
              id: doc.id,
              email: userData.email,
              role: userData.role,
            });
  
            router.push("/dashboard");
          } else {
            setError("Incorrect password. Please try again.");
          }
        });
      } else {
        setError("User not found. Please check your email.");
      }
    } catch (err: any) {
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
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
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