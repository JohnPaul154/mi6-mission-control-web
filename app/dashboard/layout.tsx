'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session } = useSession(); // Get session data

    // If there is no session, you can redirect to the login page
    const router = useRouter();
    
    useEffect(() => {
      if (!session) {
        router.push("/access-denied"); // Perform the redirection after rendering
      }
    }, [session, router]);

  return (
    <SidebarProvider className="w-screen h-screen">
      <AppSidebar />
      <div className="flex items-center h-100 w-6 bg-zinc-900">
        <SidebarTrigger />
      </div>
      <main className="w-full h-full">
        {children}
      </main>
    </SidebarProvider>
    
  );
}