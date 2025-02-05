'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from "@/contexts/SessionContext";
import { useRouter, useSearchParams } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { CircleHelp, Eye, EyeOff } from 'lucide-react';
import crypto from "crypto";

// Firebase Imports
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
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

export default function OTP() {
  const router = useRouter();
  
  const searchParams = useSearchParams();
  const data1 = searchParams.get("data1");
  const data2 = searchParams.get("data2");

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  

  const { session, setSession } = useSession();

  // Redirect if session exists
  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);


  // Function to handle login logic
  const handleOTP = async () => {
    try {
      setError(null);

      const userRef = doc(firestoreDB, "agents", data1 || "");
      const userSnap = await getDoc(userRef);

      const mailRef = doc(firestoreDB, "mail", data2 || "");
      const mailSnap = await getDoc(mailRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        console.log(userData)

        if (mailSnap.data()!.code === otp) {
          // Save the session data
          setSession({
            id: userSnap.id,
            email: userData.email,
            role: userData.role,
          });

          router.push("/dashboard");
        } else {
          setError("Incorrect OTP. Please try again.");
        }
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
        <CardHeader className="flex">
          <CardTitle className="font-semibold text-2xl">OTP Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <form>
            <div className="space-y-4">
              <h3>
                Hi <strong>Name Here</strong> !
              </h3>
              <p>
                To verify your identity, we've sent a one-time password (OTP) to name@email.com
              </p>
              <div>
                <label htmlFor="otp" className="block text-sm font-medium">
                </label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter OTP Code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="button" onClick={handleOTP} className="w-full">
                Verify
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
