import React, { createContext, useContext, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// User context type
interface UserContextType {
  user: any; // Replace 'any' with your actual user type
  isLoading: boolean;
  error: any;
}

// Create context
const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider component
export function UserProvider({ children }: { children: ReactNode }) {
  const user = useQuery(api.auth.loggedInUser);

  const value: UserContextType = {
    user,
    isLoading: user === undefined,
    error: null, // Add error handling if needed
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook to use the user context
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
