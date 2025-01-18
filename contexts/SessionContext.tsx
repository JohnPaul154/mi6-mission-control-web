'use client';

import React, { createContext, useContext, useState, useEffect } from "react";

// Define the type of the session data
export interface SessionData {
  id: string;
  email: string;
  role: string;
  // Add more profile fields if needed
}

interface SessionContextProps {
  session: SessionData | null;
  setSession: (data: SessionData) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextProps | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load session data from local storage when app initializes
  useEffect(() => {
    const storedSession = localStorage.getItem("userSession");
    if (storedSession) {
      setSession(JSON.parse(storedSession));
    }
    setIsLoaded(true); // Mark as loaded after session retrieval
  }, []);

  const saveSession = (data: SessionData) => {
    setSession(data);
    localStorage.setItem("userSession", JSON.stringify(data));
  };

  const clearSession = () => {
    setSession(null);
    localStorage.removeItem("userSession");
  };

  // Wait until the session is loaded before rendering children
  if (!isLoaded) {
    return null; // or a loading spinner if needed
  }

  return (
    <SessionContext.Provider value={{ session, setSession: saveSession, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
};
