// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCVU6tuLGkd3OgIy8ljLUPVxJQ5Fwqg2zA",
  authDomain: "mi6-command-center.firebaseapp.com",
  projectId: "mi6-command-center",
  storageBucket: "mi6-command-center.firebasestorage.app",
  messagingSenderId: "75773355505",
  appId: "1:75773355505:web:f8df77cdcd166f457c1050"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const firestoreDB = getFirestore(app);