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
import { ReviewData } from "@/firebase/collection-types";
import { firestoreDB } from "@/firebase/init-firebase";
import { doc, getDoc, query, collection, where, getDocs, updateDoc } from "firebase/firestore";


export default function Report() {
  const router = useRouter();
  const params = useParams();
  const { eventId } = params as { eventId: string };

  // Global states
  const [review, setReview] = useState<ReviewData | null>(null);
  const [shouldRefetch, setShouldRefetch] = useState(false);

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
          rating: review.report,
        });

        console.log("Review data updated successfully!");

        router.push(`/dashboard/events/${eventId}`);
      } catch (error) {
        console.error("Error saving event data:", error);
      }
    }
  };

  return (
    <div className="min-h-screen w-full p-6 flex flex-1 flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold mb-6">
        Report
      </h1>

      {/* Vertical Layout for Cards with Padding */}
      <div className="space-y-6 w-full max-w-2xl">
        {/* Mission Card */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Event Report</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              <textarea
                className="w-full h-[10rem] p-4 border text-white"
                value={review?.report}
                onChange={(e) => setReview((prev) => prev ? { ...prev, report: e.target.value } : null)}
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
                      <AlertDialogAction onClick={() => { router.push(`/dashboard/events/${eventId}`); }}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="mt-4 w-full">Save Report</Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Save Report</AlertDialogTitle>
                    </AlertDialogHeader>
                    Save your changes to the report of this event?
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSaveChanges}>Save</AlertDialogAction>
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
