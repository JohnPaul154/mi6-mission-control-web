'use client'

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventCard } from "@/components/event-card";
import { collection, getDocs, getDoc, addDoc, updateDoc, doc, deleteDoc, Timestamp, DocumentReference, query, where } from "firebase/firestore";
import { firestoreDB, realtimeDB } from "@/firebase/init-firebase";
import { AgentData, ReviewData, EventData } from "@/firebase/collection-types";
import { set, ref, remove } from "firebase/database";
import { useSession } from "@/contexts/SessionContext";
import { Trash, ArchiveRestore, Search } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import StarRating from "@/components/star-rating";
import { stringify } from "querystring";

type ReviewWithEventData = ReviewData & {
  eventId2?: string;
  eventName?: string;
  eventDate?: string;
  agents?: string[];
};

interface ReviewCardProps {
  id: string;
  name: string;
  rating: number;
  review: string;
  date: string;
  agents: string[];
  onUpdate?: () => void;
}

const ReviewCard = ({ id, name, rating, review, date, agents, onUpdate }: ReviewCardProps & { onUpdate: () => void }) => {
  const router = useRouter();

  return (
    <Card className="w-full rounded-2xl shadow-lg border flex justify-between hover:bg-zinc-900 cursor-pointer"  onClick={()=>{router.push(`/customer/${id}`)}}>
      <CardContent className="p-6 self-center">
        <div className="text-lg font-semibold">{name}</div>
        <div className="text-sm text-zinc-500 mt-1 mb-4">{date}</div>
        
        <StarRating rating={rating || 5}/>

        {review}

        <div className="text-sm mt-2 text-zinc-500">Agents: {agents.join(", ")}</div>
      </CardContent>
    </Card>
  );
};


export default function ReviewsPage() {

  // Global parameters
  const { session } = useSession()
  const isAdmin = session!.role === "admin";

  // Review states
  const [reviews, setReviews] = useState<ReviewWithEventData[]>([]);
  const [trigger, setTrigger] = useState(false);
  const [selectedTab, setSelectedTab] = useState("reviews");
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [searchReview, setSearchReview] = useState("");
  const [refetchReview, setRefetchReview] = useState(true);
  const [searchEvent, setSearchEvent] = useState("");
  const [refetchAgent, setRefetchAgent] = useState(true);

  // Trigger when review cards do an action
  const triggerUpdate = () => {
    setTrigger((prev) => !prev);
  };

  // Random status for placeholder
  const statuses: ("good" | "alert" | "critical")[] = ["good", "alert", "critical"];
  const randomStatus: "good" | "alert" | "critical" = statuses[Math.floor(Math.random() * statuses.length)];

  // Fetch the review data and ensure the references are resolved before rendering
  const fetchReviews = async () => {
    try {
      let q = query(
        collection(firestoreDB, "reviews"),
        where("rating", ">", 0)
      );
  
      const querySnapshot = await getDocs(q);
      const reviewsData: ReviewWithEventData[] = [];
  
      for (const doc of querySnapshot.docs) {
        const review = doc.data() as ReviewData;
  
        let eventName: string | undefined = undefined;
        let eventDate: string | undefined = undefined;
        let eventId2: string | undefined = undefined;
        let agents: string[] = [];
  
        if (review.eventId instanceof DocumentReference) {
          const eventDoc = await getDoc(review.eventId);
          if (eventDoc.exists()) {
            const event = eventDoc.data() as EventData;
            eventName = event.eventName;
            eventDate = event.eventDate;
            eventId2 = eventDoc.id;
  
            if (Array.isArray(event.agents)) {
              const agentNamePromises = event.agents.map(async (agentRef: DocumentReference) => {
                const agentDoc = await getDoc(agentRef);
                if (agentDoc.exists()) {
                  const agent = agentDoc.data();
                  const fullName = `${agent.firstName ?? ""} ${agent.lastName ?? ""}`.trim();
                  return fullName;
                }
                return null;
              });
  
              const resolvedNames = await Promise.all(agentNamePromises);
              agents = resolvedNames.filter((name): name is string => !!name); // remove nulls
            }
          }
        }
  
        reviewsData.push({
          id: doc.id,
          ...review,
          eventId2,
          eventName,
          eventDate,
          agents,
        });
      }
  
      // ✅ Sort by date (newest first)
      reviewsData.sort((a, b) => {
        if (!a.eventDate) return 1;
        if (!b.eventDate) return -1;
        return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
      });
  
      // Filter after sorting
      const lowerCaseSearch = searchReview?.trim().toLowerCase();
      const filteredReviews = reviewsData.filter((review) => {
        if (lowerCaseSearch && lowerCaseSearch !== "") {
          return review.eventName?.toLowerCase().includes(lowerCaseSearch);
        }
        return true;
      });
  
      setReviews(filteredReviews);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };
  
  useEffect(() => {
    fetchReviews();
  }, [trigger]);

  useEffect(() => {
    fetchReviews();
  }, [refetchReview])


  const searchReviews = () => {
    setRefetchReview(!refetchReview)
  }

  return (
    <div className="min-full h-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4">Reviews</h1>

      <Card className="flex flex-col w-full h-full">
        <CardContent className="flex-1 flex p-6 gap-6 overflow-hidden">

          <Tabs value="agents" className="grid w-full">
            <div className="flex flex-col">

              <TabsContent value="agents" className="mt-6">
                <form className="flex gap-3 pb-6 pt-0" onSubmit={(e) => { e.preventDefault(); searchReviews(); }}>
                  <Input
                    value={searchReview}
                    onChange={(e) => setSearchReview(e.target.value)}
                    placeholder="Search for review..."
                    className="flex-1"
                  />
                  <Button type="submit">
                    <Search />
                  </Button>
                </form>
                <ScrollArea className="w-full rounded-md border h-[82vh]">
                  <div className="p-4 space-y-4">
                    {reviews.length > 0 ? (
                      reviews.map((review) => (
                        <ReviewCard
                          key={review.id}
                          name={review.eventName || ""}
                          id={review.eventId2 || ""}
                          rating={review.rating}
                          review={review.review}
                          date={review.eventDate || ""}
                          agents={review.agents || []}
                          onUpdate={triggerUpdate}
                        />
                      ))
                    ) : (
                      <p>No Reviews</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
