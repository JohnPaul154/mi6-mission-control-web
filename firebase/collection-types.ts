import { Timestamp, DocumentReference } from "firebase/firestore";

export interface EventData {
  id?: string;
  agents: DocumentReference[];
  arsenal: DocumentReference[];
  callTime: Timestamp; 
  contactNumber: string;
  contactPerson: string; 
  dateAdded: Timestamp;
  eventDate: Timestamp; 
  eventName: string;
  location: string; 
  package: string; 
  isArchive: boolean;
}

export interface ArsenalData {
  id?: string; 
  dateAdded: Timestamp; 
  events: DocumentReference[];
  name: string; 
  type: string; 
}

export interface AgentData {
  id?: string;
  avatar: string; 
  email: string;
  events: DocumentReference[];
  firstName: string;
  isActive: boolean;
  isEmployed: boolean;
  lastName: string;
  password: string; 
  position: string; 
  role: string;
}