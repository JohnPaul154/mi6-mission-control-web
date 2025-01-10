// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBpKaBLVQwvrc8-1ZVHMAl5ikJGaZ4S7bU",
  authDomain: "mi6-mission-control.firebaseapp.com",
  projectId: "mi6-mission-control",
  storageBucket: "mi6-mission-control.firebasestorage.app",
  messagingSenderId: "454544835991",
  appId: "1:454544835991:web:6af0eded42db849bdab0d2"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const firestoreDB = getFirestore(app);