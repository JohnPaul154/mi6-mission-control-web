import { realtimeDB } from './init-firebase';
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database';

export class ConnectionManager {
  static initialize(userId: string): void {
    const connectedRef = ref(realtimeDB, '.info/connected');
    const userStatusRef = ref(realtimeDB, `agents/${userId}/status`);
    const lastOnlineRef = ref(realtimeDB, `agents/${userId}/lastOnline`);

    onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        // User is online
        set(userStatusRef, 'online');
        set(lastOnlineRef, serverTimestamp());

        // Handle disconnection
        onDisconnect(userStatusRef).set('offline');
        onDisconnect(lastOnlineRef).set(serverTimestamp());
      } else {
        // User is offline
        set(userStatusRef, 'offline');
        set(lastOnlineRef, serverTimestamp());
      }
    });
  }

  static async handleConnectionError(callback: (status: 'connected' | 'disconnected') => void): Promise<void> {
    const connectedRef = ref(realtimeDB, '.info/connected');
    onValue(connectedRef, (snap) => {
      if (snap.val() === false) {
        callback('disconnected');
      } else {
        callback('connected');
      }
    });
  }
}
