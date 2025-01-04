'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AccessDeniedPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page or another page after a delay or condition
    setTimeout(() => {
      router.push("/"); // Replace with your desired redirect path
    }, 3000); // 3 seconds delay before redirect
  }, [router]);

  return (
    <div className="min-h-screen w-full p-6 flex flex-1 flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold mb-6">Access Denied</h1>

      {/* Vertical Layout for Cards with Padding */}
      <div className="space-y-6 w-full max-w-xl">
        {/* Mission Card */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Notice</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              You have no access to this page. Please login again!
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
