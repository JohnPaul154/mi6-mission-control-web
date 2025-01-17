import { Timestamp, DocumentReference } from "firebase/firestore";

export interface EventData {
  id?: string;
  agents: DocumentReference[]; 
  agentNames?: string[];
  arsenal: DocumentReference[];
  arsenalNames?: string[];
  callTime: Timestamp; 
  contactNumber: string;
  contactPerson: string; 
  dateAdded: Timestamp;
  eventDate: string; 
  eventName: string;
  location: string; 
  package: string; 
  layout: string;
  notes: string;
  isArchive: boolean;
}

export interface ArsenalData {
  id?: string; 
  dateAdded: Timestamp;
  name: string; 
  type: string; 
}

export interface AgentData {
  id?: string;
  avatar: string; 
  email: string;
  firstName: string;
  isActive: boolean;
  isEmployed: boolean;
  lastName: string;
  password: string; 
  position: string; 
  role: string;
}