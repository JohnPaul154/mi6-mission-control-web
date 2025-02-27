"use client";

import { useEffect, useState } from "react";
import { getDatabase, ref, get, update, set } from "firebase/database";
import { realtimeDB } from "@/firebase/init-firebase"; // Ensure this is correctly imported

const db = realtimeDB;
const dbRef = ref(db, "/agents");

const defaultAgentValues = {
  avatar: "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp",
  email: "unknown@example.com",
  name: "Unknown Agent",
  position: "Unassigned",
  status: "Inactive",
  token: "",
  rating: 0,
  ratingCount: 0,
} as const;

const defaultChatValues = {
  info: {
    checklist: {
      arrivalHQ: { completed: "", timestamp: 0 },
      arrivalEvent: { completed: "", timestamp: 0 },
      setupDone: { completed: "", timestamp: 0 },
      cleanup: { completed: "", timestamp: 0 },
      returnHQ: { completed: "", timestamp: 0 },
    },
    createdAt: Date.now(),
    name: "Unnamed Chat",
    notes: "",
    status: "active",
  },
  messages: {}
} as const;

const FillRealtimeDBPage = () => {
  const [updates, setUpdates] = useState<{ agents: number; chat: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateCollection = async (collectionName: string, defaultValues: Record<string, any>) => {
      try {
        const colRef = ref(db, collectionName);
        const snapshot = await get(colRef);

        if (!snapshot.exists()) {
          console.warn(`No ${collectionName} found in Realtime Database.`);
          return 0;
        }

        let updatedCount = 0;
        const updates: Record<string, any> = {};

        snapshot.forEach((childSnap) => {
          const itemId = childSnap.key; // Get item ID
          const itemData = childSnap.val();

          let needsUpdate = false;
          const updatedItemData = { ...itemData };

          const updateMissingKeys = (target: any, defaults: any) => {
            Object.keys(defaults).forEach((key) => {
              if (typeof defaults[key] === "object" && defaults[key] !== null) {
                if (!target[key] || typeof target[key] !== "object") {
                  target[key] = {};
                }
                updateMissingKeys(target[key], defaults[key]); // Recursive update for nested objects
              } else {
                if (target[key] === null || target[key] === "" || target[key] === undefined) {
                  target[key] = defaults[key];
                  needsUpdate = true;
                }
              }
            });
          };

          updateMissingKeys(updatedItemData, defaultValues);

          if (needsUpdate) {
            updates[`${collectionName}/${itemId}`] = updatedItemData;
            updatedCount++;
          }
        });

        if (Object.keys(updates).length > 0) {
          await update(ref(db), updates);
          console.log(`${collectionName} updated successfully.`);
        } else {
          console.log(`No updates needed for ${collectionName}.`);
        }

        return updatedCount;
      } catch (error) {
        console.error(`Error updating ${collectionName} in Realtime Database:`, error);
        return 0;
      }
    };

    const runUpdates = async () => {
      setLoading(true);

      const agentsUpdated = await updateCollection("agents", defaultAgentValues);
      const chatUpdated = await updateCollection("chats", defaultChatValues);

      setUpdates({ agents: agentsUpdated, chat: chatUpdated });
      setLoading(false);
    };

    runUpdates();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Realtime Database Update</h1>
      {loading ? (
        <p>Updating Realtime Database data...</p>
      ) : (
        <div>
          <p><strong>Updates Completed:</strong></p>
          <ul>
            <li><strong>Agents Updated:</strong> {updates?.agents}</li>
            <li><strong>Chat Updated:</strong> {updates?.chat}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default FillRealtimeDBPage;
