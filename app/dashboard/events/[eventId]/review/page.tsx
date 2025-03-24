'use client';

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Import AlertDialog components
import StarRatingInput from "@/components/star-rating-input";
import { ReviewData } from "@/firebase/collection-types";
import { firestoreDB, realtimeDB } from "@/firebase/init-firebase";
import { doc, getDoc, query, collection, where, getDocs, updateDoc, DocumentReference  } from "firebase/firestore";
import { ref, update, get } from "firebase/database";

export default function Review() {
  const router = useRouter();
  const params = useParams();
  const { eventId } = params as { eventId: string };

  // Global states
  const [review, setReview] = useState<ReviewData | null>(null);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [agents, setAgents] = useState<DocumentReference[]>([]);

  const getAgentsFromEvent = async (eventId: string): Promise<DocumentReference[]> => {
    try {
      const eventRef = doc(firestoreDB, "events", eventId);
      const eventSnap = await getDoc(eventRef);
  
      if (eventSnap.exists()) {
        const eventData = eventSnap.data();
        const agentIds: string[] = eventData.agents || []; // Assuming `agents` is an array of IDs
  
        // Convert agent IDs to DocumentReference<AgentData> objects
        return eventData.agents
      } else {
        console.error("Event not found.");
        return [];
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
      return [];
    }
  };

  const updateRatingRealtimeDB = async (agentId: string, newRating: number) => {
    try {
      const ratingRef = ref(realtimeDB, `agents/${agentId}`); // Adjust the path as needed
      const snapshot = await get(ratingRef);
  
      if (snapshot.exists()) {
        const data = snapshot.val();
        const currentRating = data.rating || 0;
        const ratingCount = data.ratingCount || 0;
  
        // Calculate the new rating (assuming an average rating system)
        const updatedRating = currentRating + newRating;
        const updatedRatingCount = ratingCount + 1;
  
        // Update in Firebase
        await update(ratingRef, {
          rating: updatedRating,
          ratingCount: updatedRatingCount,
        });
  
        console.log("Rating updated successfully!");
      } else {
        console.error("Review not found.");
      }
    } catch (error) {
      console.error("Error updating rating:", error);
    }
  };

  useEffect(() => {
    if (eventId) {

      const eventRef = doc(firestoreDB, "events", eventId);

      // Fetch event details and fill fields
      const fetchReview = async () => {
        try {
          const q = query(collection(firestoreDB, "reviews"), where("eventId", "==", eventRef));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0]; // Get the first matching document
            const data = docSnap.data() as ReviewData;

            setReview({
              id: docSnap.id,
              ...data, // Spread all other properties from data
            });

            setRating(data.rating)

            const agentList: DocumentReference[] = await getAgentsFromEvent(eventId);

            setAgents(agentList)

          } else {
            console.error("Review not found for eventID:", eventId);
          }
        } catch (error) {
          console.error("Error fetching event data:", error);
        }
      };

      fetchReview();

    }
  }, [eventId, shouldRefetch]);

  const handleSaveChanges = async () => {
    if (review && review.id) {
      try {
        const docRef = doc(firestoreDB, "reviews", review.id);
        await updateDoc(docRef, {
          rating: rating,
          review: review.review
        });

        console.log("Review data updated successfully!");

        await Promise.all(agents.map(agentRef => 
          updateRatingRealtimeDB(agentRef.id, rating)
        ));

        router.back();
      } catch (error) {
        console.error("Error saving event data:", error);
      }
    }
  };

  return (
    <div className="min-h-screen w-full p-6 flex flex-1 flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold mb-6">
        Review
      </h1>

      {/* Vertical Layout for Cards with Padding */}
      <div className="space-y-6 w-full max-w-2xl">
        {/* Mission Card */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle className="m-auto">Customer Review</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="">
              <div className="mb-4 flex justify-center">
                <StarRatingInput value={rating} onChange={setRating} disabled={Boolean(review?.rating && review?.review)}/>
              </div>
              
              <textarea
                className="w-full h-[10rem] p-4 border text-white"
                value={review?.review}
                disabled={Boolean(review?.rating && review?.review)}
                onChange={(e) => setReview((prev) => prev ? { ...prev, review: e.target.value } : null)}
              />
              <div className="flex flex-row gap-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="mt-4 w-full bg-black hover:bg-zinc-900 text-white border">Back</Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Return to Info</AlertDialogTitle>
                    </AlertDialogHeader>
                    All unsaved changes will be discarded, will you continue?
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { router.back(); }}>Back</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
