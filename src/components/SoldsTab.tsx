import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { PatientProfileModal } from "./PatientProfileModal";

export function SoldsTab() {
  const convertedPatients = useQuery(api.leads.getConverted);
  const upcomingPatients = useQuery(api.leads.getUpcomingPatients);
  const currentUser = useQuery(api.auth.loggedInUser);
  const monthlyRevenue = useQuery(
    api.leads.getMonthlyRevenue,
    currentUser?.role === "admin" ? {} : "skip"
  );
  const updateLead = useMutation(api.leads.update);
  const [activeTab, setActiveTab] = useState<"sold" | "upcoming">("sold");
  const [editing, setEditing] = useState<{ id: Id<"leads">; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [showProfileModal, setShowProfileModal] = useState<Id<"leads"> | null>(null);
  const currencyOptions = ["USD", "EUR", "GBP", "TRY"];
  

  
  // Filter states
  const [treatmentFilter, setTreatmentFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("current_month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  
  const treatmentTypes = [
    "Parkinson's",
    "Autism",
    "Alzheimer's",
    "Dementia",
    "ChromaPulse",
    "Cerebral Palsy",
    "Stroke",
    "Ovarian Rejuvenation",
    "Erectile Dysfunction"
  ];

  // Get current month dates
  const getCurrentMonthDates = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: startOfMonth, end: endOfMonth };
  };

  // Get last month dates
  const getLastMonthDates = () => {
    const now = new Date();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: startOfLastMonth, end: endOfLastMonth };
  };

  // Handle date filter change
  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    if (value === "custom") {
      // Set default custom dates to current month if switching to custom
      if (!customStartDate || !customEndDate) {
        const { start, end } = getCurrentMonthDates();
        setCustomStartDate(start.toISOString().split('T')[0]);
        setCustomEndDate(end.toISOString().split('T')[0]);
      }
    }
  };

  // Filter patients based on date filter
  const filteredPatients = useMemo(() => {
    if (!Array.isArray(convertedPatients)) return [];
    
    let filtered = convertedPatients;
    
    // Apply treatment filter
    if (treatmentFilter) {
      filtered = filtered.filter(lead => lead.treatmentType === treatmentFilter);
    }
    
    // Apply date filter
    if (dateFilter === "current_month") {
      const { start, end } = getCurrentMonthDates();
      filtered = filtered.filter(lead => {
        if (!lead.saleDate) return false;
        const saleDate = new Date(lead.saleDate);
        return saleDate >= start && saleDate <= end;
      });
    } else if (dateFilter === "last_month") {
      const { start, end } = getLastMonthDates();
      filtered = filtered.filter(lead => {
        if (!lead.saleDate) return false;
        const saleDate = new Date(lead.saleDate);
        return saleDate >= start && saleDate <= end;
      });
    } else if (dateFilter === "custom" && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      filtered = filtered.filter(lead => {
        if (!lead.saleDate) return false;
        const saleDate = new Date(lead.saleDate);
        return saleDate >= start && saleDate <= end;
      });
    }
    // "all_time" shows all patients
    
    return filtered;
  }, [convertedPatients, treatmentFilter, dateFilter, customStartDate, customEndDate]);

  // Calculate total price
  const totalPrice = useMemo(() => {
    const totals: { [currency: string]: number } = {};
    
    filteredPatients.forEach(patient => {
      if (patient.price) {
        const currency = patient.currency || "USD";
        totals[currency] = (totals[currency] || 0) + patient.price;
      }
    });
    
    return totals;
  }, [filteredPatients]);

  const handleMarkTreatmentDone = async (id: Id<"leads">) => {
    try {
      await updateLead({ id, status: "treatment_done" });
      toast.success("Patient moved to aftercare!");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleEdit = (id: Id<"leads">, field: string, value: any) => {
    setEditing({ id, field });
    setEditValue(field === "saleDate" && value ? value.slice(0, 10) : value ? value.toString() : "");
  };

  const handleSave = async (id: Id<"leads">, field: string) => {
    try {
      let value: any = editValue;
      if (field === "price" || field === "deposit") {
        value = editValue ? parseFloat(editValue) : undefined;
      }
      if (field === "saleDate") {
        value = editValue || undefined;
      }
      await updateLead({ id, [field]: value });
      toast.success("Updated successfully!");
    } catch (error) {
      toast.error("Failed to update");
    } finally {
      setEditing(null);
      setEditValue("");
    }
  };

  if (convertedPatients === undefined) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sold Patients</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab("sold")}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            activeTab === "sold"
              ? "bg-blue-100 text-blue-700 border border-blue-300"
              : "bg-white text-gray-500 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          Sold Patients
        </button>
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            activeTab === "upcoming"
              ? "bg-blue-100 text-blue-700 border border-blue-300"
              : "bg-white text-gray-500 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          Upcoming Patients
        </button>
      </div>

      {/* Monthly Revenue for Admin - Only show in upcoming tab */}
      {activeTab === "upcoming" && currentUser?.role === "admin" && monthlyRevenue && monthlyRevenue.patientCount > 0 && (
        <div className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">This Month's Revenue</h3>
          <div className="flex flex-wrap items-center gap-4">
            {/* Revenue by Currency */}
            {monthlyRevenue.revenueByCurrency && Object.entries(monthlyRevenue.revenueByCurrency).map(([currency, amount]) => (
              <div key={currency} className="bg-white px-4 py-2 rounded border shadow-sm">
                <span className="text-sm text-gray-600">{currency}: </span>
                <span className="font-bold text-lg text-blue-600">
                  {amount.toLocaleString()}
                </span>
              </div>
            ))}
            
            {/* Patient Count */}
            <div className="bg-white px-4 py-2 rounded border shadow-sm">
              <span className="text-sm text-gray-600">Patients: </span>
              <span className="font-bold text-lg text-purple-600">
                {monthlyRevenue.patientCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter dropdowns - Only show for sold tab */}
      {activeTab === "sold" && (
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Treatment</label>
            <select value={treatmentFilter} onChange={e => setTreatmentFilter(e.target.value)} className="px-2 py-1 border rounded">
              <option value="">All</option>
              {treatmentTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date Range</label>
            <select value={dateFilter} onChange={e => handleDateFilterChange(e.target.value)} className="px-2 py-1 border rounded">
              <option value="current_month">Current Month</option>
              <option value="last_month">Last Month</option>
              <option value="custom">Custom Range</option>
              <option value="all_time">All Time</option>
            </select>
          </div>
          
          {/* Custom date inputs */}
          {dateFilter === "custom" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 border rounded"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Sold Patients Table */}
      {activeTab === "sold" && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Treatment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salesperson
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deposit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sale Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.map((patient) => (
                  <tr key={patient._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div 
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                        onClick={() => setShowProfileModal(patient._id)}
                      >
                        {patient.firstName} {patient.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{patient.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {patient.treatmentType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {patient.salesPerson}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editing && editing.id === patient._id && editing.field === "price" ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => handleSave(patient._id, "price")}
                          onKeyDown={e => { if (e.key === "Enter") handleSave(patient._id, "price"); }}
                          className="border px-2 py-1 rounded w-24"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => handleEdit(patient._id, "price", patient.price)}
                        >
                          {patient.price ? `${patient.currency || "USD"} ${patient.price.toLocaleString()}` : "Not set"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editing && editing.id === patient._id && editing.field === "deposit" ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => handleSave(patient._id, "deposit")}
                          onKeyDown={e => { if (e.key === "Enter") handleSave(patient._id, "deposit"); }}
                          className="border px-2 py-1 rounded w-24"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => handleEdit(patient._id, "deposit", patient.deposit)}
                        >
                          {patient.deposit ? `${patient.currency || "USD"} ${patient.deposit.toLocaleString()}` : "Not set"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editing && editing.id === patient._id && editing.field === "currency" ? (
                        <select
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => handleSave(patient._id, "currency")}
                          onKeyDown={e => { if (e.key === "Enter") handleSave(patient._id, "currency"); }}
                          className="border px-2 py-1 rounded w-24"
                          autoFocus
                        >
                          {currencyOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => handleEdit(patient._id, "currency", patient.currency || "USD")}
                        >
                          {patient.currency || "USD"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editing && editing.id === patient._id && editing.field === "saleDate" ? (
                        <input
                          type="date"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => handleSave(patient._id, "saleDate")}
                          onKeyDown={e => { if (e.key === "Enter") handleSave(patient._id, "saleDate"); }}
                          className="border px-2 py-1 rounded"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => handleEdit(patient._id, "saleDate", patient.saleDate)}
                        >
                          {patient.saleDate ? new Date(patient.saleDate).toLocaleDateString('tr-TR') : "Not Set"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleMarkTreatmentDone(patient._id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Mark Treatment Done
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPatients.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No sold patients found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Total Price Summary for Sold Tab */}
      {activeTab === "sold" && Object.keys(totalPrice).length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Revenue</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(totalPrice).map(([currency, total]) => (
              <div key={currency} className="bg-white px-4 py-2 rounded border">
                <span className="text-sm text-gray-600">{currency}: </span>
                <span className="font-semibold text-lg">{total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Patients Table */}
      {activeTab === "upcoming" && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Treatment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salesperson
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Arrival Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Until Arrival
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {upcomingPatients?.map((patient) => {
                  const daysUntilArrival = patient.arrivalDate 
                    ? Math.ceil((new Date(patient.arrivalDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  
                  return (
                    <tr key={patient._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div 
                          className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => setShowProfileModal(patient._id)}
                        >
                          {patient.firstName} {patient.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{patient.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.treatmentType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.salesPerson}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.price ? `${patient.currency || "USD"} ${patient.price.toLocaleString()}` : "Not set"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.currency || "USD"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.arrivalDate ? new Date(patient.arrivalDate).toLocaleDateString('tr-TR') : "Not set"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {daysUntilArrival !== null ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            daysUntilArrival <= 7 ? 'bg-red-100 text-red-800' :
                            daysUntilArrival <= 14 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {daysUntilArrival === 0 ? 'Today' : 
                             daysUntilArrival === 1 ? 'Tomorrow' :
                             daysUntilArrival < 0 ? `${Math.abs(daysUntilArrival)} days ago` :
                             `${daysUntilArrival} days`}
                          </span>
                        ) : (
                          "Not set"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(!upcomingPatients || upcomingPatients.length === 0) && (
              <div className="text-center py-8">
                <p className="text-gray-500">No upcoming patients found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Patient Profile Modal */}
      {showProfileModal && (
        <PatientProfileModal
          patientId={showProfileModal}
          onClose={() => setShowProfileModal(null)}
        />
      )}
    </div>
  );
}
