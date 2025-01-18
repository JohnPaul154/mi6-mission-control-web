'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Logout() {
  const router = useRouter();
  const { clearSession } = useSession();
  const [isClearing, setIsClearing] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      clearSession();
      setIsClearing(false); // Update state after clearing session
      router.replace("/"); // Redirect to the login page
    }, 3000); // Delay of 3 seconds

    return () => clearTimeout(timer); // Clean up timer if component unmounts
  }, [clearSession, router]);

  return (
    <div className="min-h-screen w-full p-6 flex flex-1 flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold mb-6">
        {isClearing ? "Logging Out" : "Redirecting..."}
      </h1>

      {/* Vertical Layout for Cards with Padding */}
      <div className="space-y-6 w-full max-w-xl">
        {/* Mission Card */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Notice</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              {isClearing
                ? "You are logging out of the web application."
                : "Thank you for using our application."}
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
