import { firestoreDB, realtimeDB } from './init-firebase';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { ref, get, set, onDisconnect, onValue } from 'firebase/database';

export class PresenceService {
  static async initialize(userId: string): Promise<void> {
    // Fetch user data from Firestore
    const userRef = doc(firestoreDB, `agents/${userId}`);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const connectedRef = ref(realtimeDB, '.info/connected');
      const userPresenceRef = ref(realtimeDB, `agents/${userId}`);

      onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === true) {
          // User is online
          set(userPresenceRef, {
            status: 'online',
            lastOnline: Date.now(),
            name: `${userData.firstName} ${userData.lastName}`,
            avatar: userData.avatar,
          });

          // Handle disconnect
          onDisconnect(userPresenceRef).set({
            status: 'offline',
            lastOnline: Date.now(),
          });
        }
      });
    }
  }

  static subscribeToUserStatus(userId: string, callback: (status: string | null) => void): () => void {
    const userPresenceRef = ref(realtimeDB, `agents/${userId}`);
    return onValue(userPresenceRef, (snapshot) => callback(snapshot.val()?.status ?? null));
  }
}

async function getUsersWithPresence() {
  const usersSnapshot = await getDocs(collection(firestoreDB, 'agents'));
  const agents = [];

  for (const doc of usersSnapshot.docs) {
    const userId = doc.id;
    const userData = doc.data();
    const presenceRef = ref(realtimeDB, `agents/${userId}`);
    const presenceSnapshot = await get(presenceRef);

    agents.push({
      id: userId,
      ...userData,
      presence: presenceSnapshot.exists() ? presenceSnapshot.val() : null,
    });
  }

  return agents;
}
