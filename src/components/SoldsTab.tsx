import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { PatientProfileModal } from "./PatientProfileModal";

export function SoldsTab() {
  const convertedPatients = useQuery(api.leads.getConverted);
  const updateLead = useMutation(api.leads.update);
  const [editing, setEditing] = useState<{ id: Id<"leads">; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [showProfileModal, setShowProfileModal] = useState<Id<"leads"> | null>(null);
  const currencyOptions = ["USD", "EUR", "GBP", "TRY"];
  // Filter states
  const [treatmentFilter, setTreatmentFilter] = useState<string>("");
  const treatmentTypes = [
    "Parkinson's",
    "Autism",
    "Alzheimer's",
    "Dementia",
    "ChromaPulse",
    "Cerebral Palsy",
    "Stroke"
  ];

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

  let filteredPatients = Array.isArray(convertedPatients) ? convertedPatients : [];
  if (treatmentFilter) filteredPatients = filteredPatients.filter(lead => lead.treatmentType === treatmentFilter);

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

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Treatment</label>
          <select value={treatmentFilter} onChange={e => setTreatmentFilter(e.target.value)} className="px-2 py-1 border rounded">
            <option value="">All</option>
            {treatmentTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      </div>

      {/* Solds Table */}
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
