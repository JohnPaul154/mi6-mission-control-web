import { Timestamp, DocumentReference } from "firebase/firestore";

export interface EventData {
  id?: string;
  agents: DocumentReference[]; 
  agentNames?: string[];
  arsenal: DocumentReference[];
  arsenalNames?: string[];
  contactNumber: string;
  contactPerson: string; 
  dateAdded: Timestamp;
  eventDate: string; 
  eventName: string;
  location: string; 
  package: string; 
  layout: string;
  sdCardCount: number;
  batteryCount: number;
  notes: string;
  hqt: string;
  aop: string;
  isArchive: boolean;
}

export interface ArsenalData {
  id?: string; 
  dateAdded: Timestamp;
  name: string; 
  type: string;
  serial: string;
  details: string;
}

export interface AgentData {
  id?: string;
  avatar: string; 
  email: string;
  firstName: string;
  lastName: string;
  position: string; 
  address: string;
  birthday: string;
  contactNumber: string;
  dateHired: string;
  role: string;
  password: string; 
  isNew: boolean;
  isArchive: boolean;
}