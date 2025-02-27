'use client'

import { useEffect, useState } from "react";
import { getFirestore, collection, getDocs, setDoc, updateDoc, doc } from "firebase/firestore";
import { firestoreDB } from "@/firebase/init-firebase";

const db = firestoreDB;

const defaultValues: Record<string, any> = {
  events: {
    agents: [],
    agentsAccepted: [],
    agentsDeclined: [],
    arsenal: [],
    contactNumber: "N/A",
    contactPerson: "N/A",
    eventDate: "N/A",
    eventName: "N/A",
    location: "N/A",
    package: "N/A",
    layout: "N/A",
    sdCardCount: 0,
    batteryCount: 0,
    notes: "",
    hqt: "N/A",
    aop: "N/A",
    collection: "N/A",
    isArchive: false,
  },
  // reviews: {
  //   rating: 0,
  //   review: "No review provided",
  // },
  arsenal: {
    name: "Unnamed Item",
    type: "Unknown",
    serial: "N/A",
    details: "No details provided",
  },
  agents: {
    avatar: "",
    email: "unknown@example.com",
    firstName: "Unknown",
    lastName: "Agent",
    position: "Unassigned",
    address: "Unknown",
    birthday: "N/A",
    contactNumber: "N/A",
    dateHired: "N/A",
    role: "N/A",
    password: "default_password",
    isNew: false,
    isArchive: false,
    isSuspended: false,
    suspensionEndDate: "N/A",
  },
};

const FillFirestorePage = () => {
  const [updates, setUpdates] = useState<{ [key: string]: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateCollection = async (collectionName: string) => {
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(colRef);
    
      let updatedCount = 0;
    
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const updatedData: Record<string, any> = { ...data }; // Explicitly type as object
    
        let needsUpdate = false;
    
        Object.keys(defaultValues[collectionName]).forEach((key) => {
          if (updatedData[key] === null || updatedData[key] === "" || updatedData[key] === undefined) {
            updatedData[key] = defaultValues[collectionName][key];
            needsUpdate = true;
          }
        });
    
        if (needsUpdate) {
          await setDoc(doc(db, collectionName, docSnap.id), updatedData, { merge: true });
          updatedCount++;
        }
      }
    
      return updatedCount;
    };

    const runFirestoreUpdates = async () => {
      setLoading(true);

      const eventsUpdated = await updateCollection("events");
      //const reviewsUpdated = await updateCollection("reviews");
      const arsenalUpdated = await updateCollection("arsenal");
      const agentsUpdated = await updateCollection("agents");

      setUpdates({ 
        eventsUpdated, 
        // reviewsUpdated, 
        arsenalUpdated, 
        agentsUpdated });
      setLoading(false);
    };

    runFirestoreUpdates();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Firestore Update</h1>
      {loading ? (
        <p>Updating Firestore data...</p>
      ) : (
        <div>
          <p><strong>Updates Completed:</strong></p>
          <ul>
            <li><strong>Events Updated:</strong> {updates?.eventsUpdated}</li>
            <li><strong>Reviews Updated:</strong> {updates?.reviewsUpdated}</li>
            <li><strong>Arsenal Updated:</strong> {updates?.arsenalUpdated}</li>
            <li><strong>Agents Updated:</strong> {updates?.agentsUpdated}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default FillFirestorePage;
