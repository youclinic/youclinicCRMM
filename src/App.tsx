import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { CRMDashboard } from "./components/CRMDashboard";
import { UserProvider, useUser } from "./contexts/UserContext";

export default function App() {
  return (
    <UserProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
          <h2 className="text-xl font-semibold text-blue-600">YouClinic CRM</h2>
          <Authenticated>
            <SignOutButton />
          </Authenticated>
        </header>
        <main className="flex-1">
          <Content />
        </main>
        <Toaster />
      </div>
    </UserProvider>
  );
}

function Content() {
  const { user: loggedInUser, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loggedInUser === null) {
    return <SignInForm />;
  }

  return (
    <div className="flex flex-col gap-section">
      <Authenticated>
        <CRMDashboard />
      </Authenticated>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-md mx-auto p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
              </div>
              <h1 className="text-3xl font-bold text-blue-600 mb-4">Welcome to You Clinic CRM</h1>
              <p className="text-xl text-gray-600">Specialized care management for neurological conditions</p>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}
