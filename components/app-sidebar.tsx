'use client';

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "@/contexts/SessionContext";
import { firestoreDB, realtimeDB } from '@/firebase/init-firebase';
import { doc, getDoc } from "firebase/firestore";
import { ref, onValue } from "firebase/database";

import { 
  Home, 
  GlobeLock,
  MessagesSquare,
  Users,
  Camera,
  Archive,
  UserPen,
  LogOut
} from "lucide-react";

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
} from "@/components/ui/sidebar";

import { ProfileCard } from "@/components/profile-card";


// Menu items.
const main = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Mission Control", url: "/dashboard/mission-control", icon: GlobeLock },
  { title: "Mi6: Chat Room", url: "/dashboard/mi6-chat-room", icon: MessagesSquare },
  { title: "Agents List", url: "/dashboard/agent-list", icon: Users },
  { title: "Aresenal", url: "/dashboard/arsenal", icon: Camera },
  { title: "Archive", url: "/dashboard/archive", icon: Archive },
];

const footer = [
  { title: "Profile", url: "/dashboard/profile", icon: UserPen },
  { title: "Sign Out", url: "/logout", icon: LogOut }, // Updated URL to logout page
];

export function AppSidebar() {
  const router = useRouter();
  const currentPath = usePathname();
  const { session } = useSession();
  const [profile, setProfile] = useState({
    name: "", 
    position: "", 
    avatar: "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp",
  });

  // Fetch user profile data from Firestore
  useEffect(() => {
    if (session?.id) {
      const userRef = ref(realtimeDB, `agents/${session.id}`); // Reference to /agents/{id}
  
      // Set up real-time listener
      const unsubscribe = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setProfile({
            name: userData.name,
            position: userData.position,
            avatar: userData.avatar || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp",
          });
        } else {
          console.log("No such user document!");
        }
      });
  
      // Cleanup the listener when component unmounts
      return () => unsubscribe();
    }
  }, [session]);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <ProfileCard 
          avatar={profile.avatar} 
          name={profile.name} 
          position={profile.position}
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
                      onClick={() => router.push(item.url)}
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
                  onClick={() => router.push(item.url)}
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
