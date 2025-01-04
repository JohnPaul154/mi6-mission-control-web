'use client'

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "@/context/SessionContext"; // Import the hook
import { firestoreDB } from '@/firebase/initFirebase'; // Firebase import
import { doc, getDoc } from "firebase/firestore";

import { 
  Home, 
  GlobeLock,
  MessagesSquare,
  Users,
  Camera,
  Archive,
  UserPen,
  LogOut
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar"

import { ProfileCard } from "@/components/profile-card"

// Menu items.
const main = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Mission Control",
    url: "/dashboard/mission-control",
    icon: GlobeLock,
  },
  {
    title: "Mi6: Chat Room",
    url: "/dashboard/chat-room",
    icon: MessagesSquare,
  },
  {
    title: "Agents List",
    url: "/dashboard/agent-list",
    icon: Users,
  },
  {
    title: "Aresenal",
    url: "/dashboard/arsenal",
    icon: Camera,
  },
  {
    title: "Archive",
    url: "/dashboard/archive",
    icon: Archive,
  },
]

const footer = [
  {
    title: "Profile",
    url: "/dashboard/profile",
    icon: UserPen,
  },
  {
    title: "Sign Out",
    url: "/",
    icon: LogOut,
  }
]

export function AppSidebar() {
  const router = useRouter(); // Initialize the Next.js router
  const currentPath = usePathname();
  const { session, clearSession } = useSession(); // Get the session
  const [loggingOut, setLoggingOut] = useState(false); // State to track logout status
  const [profile, setProfile] = useState({
    name: "John Doe", 
    position: "Software Engineer", 
    profilePic: "https://github.com/shadcn.png"
  }); // Default profile data
  
  // Logout handler
  const handleLogout = () => {
    setLoggingOut(true); // Set loggingOut to true before clearing the session
    clearSession(); // Clear the session
  };

  // Fetch user profile data from Firestore
  useEffect(() => {
    if (session?.id) {
      const fetchProfileData = async () => {
        const userDocRef = doc(firestoreDB, "agents", session.id); // Assuming 'agents' is the collection
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setProfile({
            name: userData.firstName + " " + userData.lastName,
            position: userData.position,
            profilePic: userData.profilePic || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp", // Use gravatar if no profilePic
          });
        } else {
          console.log("No such user document!");
        }
      };

      fetchProfileData();
    }
  }, [session]); // Re-fetch when session changes

  // useEffect to handle redirect after logout
  useEffect(() => {
    if (loggingOut) {
      router.push("/"); // Redirect to the login page after session is cleared
    }
  }, [loggingOut, router]);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <ProfileCard 
          imageSrc={profile.profilePic} 
          name={profile.name} 
          position={profile.position} 
          status={true} 
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={() => router.push(item.url)} // Use router.push for navigation
                      className={`flex items-center ${currentPath === item.url ? 'bg-sidebar-accent' : ''}`}
                    >
                      <item.icon className="mr-2" />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {footer.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <button
                  onClick={item.title === "Sign Out" ? handleLogout : () => router.push(item.url)} // Check if Sign Out
                  className={`flex items-center ${currentPath === item.url ? 'bg-sidebar-accent' : ''}`}
                >
                  <item.icon className="mr-2" />
                  <span>{item.title}</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}