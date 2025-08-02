import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { LeadsTab } from "./LeadsTab";
import { DashboardTab } from "./DashboardTab";
import { PatientsTab } from "./PatientsTab";
import { SoldsTab } from "./SoldsTab";
import { AftercareTab } from "./AftercareTab";
import { AdminTab } from "./AdminTab";
import { PatientProfileModal } from "./PatientProfileModal";
import { Id } from "../../convex/_generated/dataModel";
import { MarketingTab } from "./MarketingTab";
import { LogTab } from "./LogTab";
import { TransfersTab } from "./TransfersTab";

type Tab = "dashboard" | "leads" | "patients" | "solds" | "aftercare" | "admin" | "marketing" | "log" | "transfers";

export function CRMDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const logLogin = useMutation(api.logs.logLogin);
  const logTabVisit = useMutation(api.logs.logTabVisit);
  const loginLoggedRef = useRef(false);
  const lastLoggedTabRef = useRef<string | null>(null);

  useEffect(() => {
    if (loggedInUser && loggedInUser._id && !loginLoggedRef.current) {
      logLogin({});
      loginLoggedRef.current = true;
    }
  }, [loggedInUser, logLogin]);

  useEffect(() => {
    if (loggedInUser && loggedInUser._id && activeTab && lastLoggedTabRef.current !== activeTab) {
      logTabVisit({ tab: activeTab });
      lastLoggedTabRef.current = activeTab;
    }
  }, [activeTab, loggedInUser, logTabVisit]);

  const isAdmin = loggedInUser?.role === "admin";

  const tabs = [
    { id: "dashboard" as Tab, label: "Dashboard", icon: "📊" },
    { id: "leads" as Tab, label: "Leads", icon: "🎯" },
    { id: "patients" as Tab, label: "Patients", icon: "👥" },
    { id: "solds" as Tab, label: "Sold", icon: "💰" },
    { id: "aftercare" as Tab, label: "Aftercare", icon: "🏥" },
    { id: "transfers" as Tab, label: "Hasta Takas", icon: "🔄" },
    { id: "marketing" as Tab, label: "Marketing", icon: "📈" },
    ...(isAdmin ? [{ id: "admin" as Tab, label: "Admin", icon: "⚙️" }] : []),
    ...(isAdmin ? [{ id: "log" as Tab, label: "Log", icon: "📝" }] : []),
  ];

  // If not admin and activeTab is admin, force dashboard
  const safeActiveTab = activeTab === "admin" && !isAdmin ? "dashboard" : activeTab;

  // Search state
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<Id<"leads"> | null>(null);
  const searchResults = useQuery(api.leads.searchLeads, search.trim() ? { query: search } : "skip");

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              YC
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">You Clinic</h1>
              <p className="text-sm text-gray-500">Patient Management</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow">
              {(() => {
                const name = loggedInUser?.name?.trim();
                if (name) {
                  const parts = name.split(" ");
                  if (parts.length >= 2) {
                    return (parts[0][0] + parts[1][0]).toUpperCase();
                  }
                  return name.slice(0, 2).toUpperCase();
                }
                const email = loggedInUser?.email || "";
                return email.slice(0, 2).toUpperCase();
              })()}
            </div>
            <div>
              <p className="font-medium text-gray-900">{loggedInUser?.email}</p>
              <p className="text-xs text-gray-500">{isAdmin ? "Administrator" : "User"}</p>
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="p-4 border-b">
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
            placeholder="Hasta Ara..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setShowResults(!!e.target.value.trim());
            }}
            onFocus={() => setShowResults(!!search.trim())}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
          />
          {showResults && search.trim() && searchResults && (
            <div className="absolute z-50 mt-2 w-60 bg-white border rounded shadow max-h-80 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-3 text-gray-500 text-sm">Sonuç bulunamadı</div>
              ) : (
                searchResults.map((patient: any) => (
                  <div
                    key={patient._id}
                    className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => {
                      setSelectedPatientId(patient._id as Id<"leads">);
                      setShowResults(false);
                    }}
                  >
                    <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                    <div className="text-xs text-gray-500">{patient.phone}</div>
                    <div className="text-xs text-blue-600">{patient.status}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <nav className="mt-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center space-x-3 px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
                safeActiveTab === tab.id
                  ? "bg-blue-50 border-r-2 border-blue-600 text-blue-600"
                  : "text-gray-700"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {safeActiveTab === "dashboard" && <DashboardTab />}
        {safeActiveTab === "leads" && <LeadsTab />}
        {safeActiveTab === "patients" && <PatientsTab />}
        {safeActiveTab === "solds" && <SoldsTab />}
        {safeActiveTab === "aftercare" && <AftercareTab />}
        {safeActiveTab === "marketing" && <MarketingTab />}
        {safeActiveTab === "admin" && isAdmin && <AdminTab />}
        {safeActiveTab === "log" && isAdmin && <LogTab />}
        {safeActiveTab === "transfers" && <TransfersTab />}
        {/* Hasta Profil Modalı */}
        {selectedPatientId && (
          <PatientProfileModal patientId={selectedPatientId} onClose={() => setSelectedPatientId(null)} />
        )}
      </div>
    </div>
  );
}
