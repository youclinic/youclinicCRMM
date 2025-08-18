import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { PatientProfileModal } from "./PatientProfileModal";

export function AftercareTab() {
  // Pagination state for treatment done patients
  const [paginationOpts, setPaginationOpts] = useState({
    numItems: 50,
    cursor: null as string | null,
  });

  const treatmentDoneResult = useQuery(api.leads.getTreatmentDone, { paginationOpts });
  const treatmentDonePatients = treatmentDoneResult?.page || [];
  
  const updateLead = useMutation(api.leads.update);
  const [editingConsultations, setEditingConsultations] = useState<Id<"leads"> | null>(null);
  const [consultationData, setConsultationData] = useState({
    consultation1Date: "",
    consultation2Date: "",
    consultation3Date: "",
    consultation4Date: "",
    consultation1Status: "scheduled" as "scheduled" | "completed" | "cancelled" | "no_show",
    consultation2Status: "scheduled" as "scheduled" | "completed" | "cancelled" | "no_show",
    consultation3Status: "scheduled" as "scheduled" | "completed" | "cancelled" | "no_show",
    consultation4Status: "scheduled" as "scheduled" | "completed" | "cancelled" | "no_show",
    consultation1Notes: "",
    consultation2Notes: "",
    consultation3Notes: "",
    consultation4Notes: "",
  });
  const [editingPatient, setEditingPatient] = useState<Id<"leads"> | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<Id<"leads"> | null>(null);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "no_show":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "scheduled":
        return "Scheduled";
      case "cancelled":
        return "Cancelled";
      case "no_show":
        return "No Show";
      default:
        return "Not Scheduled";
    }
  };

  const handleEditConsultations = (patient: any) => {
    setConsultationData({
      consultation1Date: patient.consultation1Date || "",
      consultation2Date: patient.consultation2Date || "",
      consultation3Date: patient.consultation3Date || "",
      consultation4Date: patient.consultation4Date || "",
      consultation1Status: patient.consultation1Status || "scheduled",
      consultation2Status: patient.consultation2Status || "scheduled",
      consultation3Status: patient.consultation3Status || "scheduled",
      consultation4Status: patient.consultation4Status || "scheduled",
      consultation1Notes: patient.consultation1Notes || "",
      consultation2Notes: patient.consultation2Notes || "",
      consultation3Notes: patient.consultation3Notes || "",
      consultation4Notes: patient.consultation4Notes || "",
    });
    setEditingConsultations(patient._id);
  };

  const handleSaveConsultations = async () => {
    if (!editingConsultations) return;
    
    try {
      await updateLead({
        id: editingConsultations,
        consultation1Date: consultationData.consultation1Date || undefined,
        consultation2Date: consultationData.consultation2Date || undefined,
        consultation3Date: consultationData.consultation3Date || undefined,
        consultation4Date: consultationData.consultation4Date || undefined,
        consultation1Status: consultationData.consultation1Status,
        consultation2Status: consultationData.consultation2Status,
        consultation3Status: consultationData.consultation3Status,
        consultation4Status: consultationData.consultation4Status,
        consultation1Notes: consultationData.consultation1Notes || undefined,
        consultation2Notes: consultationData.consultation2Notes || undefined,
        consultation3Notes: consultationData.consultation3Notes || undefined,
        consultation4Notes: consultationData.consultation4Notes || undefined,
      });
      
      setEditingConsultations(null);
      setConsultationData({ 
        consultation1Date: "", 
        consultation2Date: "", 
        consultation3Date: "",
        consultation4Date: "",
        consultation1Status: "scheduled",
        consultation2Status: "scheduled",
        consultation3Status: "scheduled",
        consultation4Status: "scheduled",
        consultation1Notes: "",
        consultation2Notes: "",
        consultation3Notes: "",
        consultation4Notes: "",
      });
      toast.success("Consultation dates updated successfully!");
    } catch (error) {
      toast.error("Failed to update consultation dates");
    }
  };

  const handleStatusChange = async (patientId: Id<"leads">, consultationNumber: number, newStatus: "scheduled" | "completed" | "cancelled" | "no_show") => {
    try {
      const updateData: any = {};
      updateData[`consultation${consultationNumber}Status`] = newStatus;
      
      await updateLead({
        id: patientId,
        ...updateData
      });
      
      toast.success(`Consultation ${consultationNumber} status updated!`);
    } catch (error) {
      toast.error("Failed to update consultation status");
    }
  };

  // Loading state
  if (treatmentDoneResult === undefined) {
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
        <h1 className="text-2xl font-bold text-gray-900">Aftercare Patients</h1>
      </div>

      {/* Consultation Modal */}
      {editingConsultations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Schedule Consultations</h2>
            <div className="space-y-6">
              {/* Consultation 1 */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">First Consultation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={consultationData.consultation1Date}
                      onChange={(e) => setConsultationData({ ...consultationData, consultation1Date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={consultationData.consultation1Status}
                      onChange={(e) => setConsultationData({ ...consultationData, consultation1Status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No Show</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={consultationData.consultation1Notes}
                    onChange={(e) => setConsultationData({ ...consultationData, consultation1Notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add consultation notes..."
                  />
                </div>
              </div>

              {/* Consultation 2 */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Second Consultation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={consultationData.consultation2Date}
                      onChange={(e) => setConsultationData({ ...consultationData, consultation2Date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={consultationData.consultation2Status}
                      onChange={(e) => setConsultationData({ ...consultationData, consultation2Status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No Show</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={consultationData.consultation2Notes}
                    onChange={(e) => setConsultationData({ ...consultationData, consultation2Notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add consultation notes..."
                  />
                </div>
              </div>

              {/* Consultation 3 */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Third Consultation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={consultationData.consultation3Date}
                      onChange={(e) => setConsultationData({ ...consultationData, consultation3Date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={consultationData.consultation3Status}
                      onChange={(e) => setConsultationData({ ...consultationData, consultation3Status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No Show</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={consultationData.consultation3Notes}
                    onChange={(e) => setConsultationData({ ...consultationData, consultation3Notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add consultation notes..."
                  />
                </div>
              </div>

              {/* Consultation 4 */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Fourth Consultation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={consultationData.consultation4Date}
                      onChange={(e) => setConsultationData({ ...consultationData, consultation4Date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={consultationData.consultation4Status}
                      onChange={(e) => setConsultationData({ ...consultationData, consultation4Status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No Show</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={consultationData.consultation4Notes}
                    onChange={(e) => setConsultationData({ ...consultationData, consultation4Notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add consultation notes..."
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingConsultations(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConsultations}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Consultations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aftercare Table */}
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
                  Consultation 1
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Consultation 2
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Consultation 3
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Consultation 4
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {treatmentDonePatients.map((patient) => (
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {patient.consultation1Date ? new Date(patient.consultation1Date).toLocaleDateString('tr-TR') : "Not scheduled"}
                    </div>
                    {patient.consultation1Status && (
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.consultation1Status)}`}>
                          {getStatusText(patient.consultation1Status)}
                        </span>
                      </div>
                    )}
                    {patient.consultation1Notes && (
                      <div className="mt-1 text-xs text-gray-500 max-w-xs truncate" title={patient.consultation1Notes}>
                        {patient.consultation1Notes}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {patient.consultation2Date ? new Date(patient.consultation2Date).toLocaleDateString('tr-TR') : "Not scheduled"}
                    </div>
                    {patient.consultation2Status && (
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.consultation2Status)}`}>
                          {getStatusText(patient.consultation2Status)}
                        </span>
                      </div>
                    )}
                    {patient.consultation2Notes && (
                      <div className="mt-1 text-xs text-gray-500 max-w-xs truncate" title={patient.consultation2Notes}>
                        {patient.consultation2Notes}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {patient.consultation3Date ? new Date(patient.consultation3Date).toLocaleDateString('tr-TR') : "Not scheduled"}
                    </div>
                    {patient.consultation3Status && (
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.consultation3Status)}`}>
                          {getStatusText(patient.consultation3Status)}
                        </span>
                      </div>
                    )}
                    {patient.consultation3Notes && (
                      <div className="mt-1 text-xs text-gray-500 max-w-xs truncate" title={patient.consultation3Notes}>
                        {patient.consultation3Notes}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {patient.consultation4Date ? new Date(patient.consultation4Date).toLocaleDateString('tr-TR') : "Not scheduled"}
                    </div>
                    {patient.consultation4Status && (
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.consultation4Status)}`}>
                          {getStatusText(patient.consultation4Status)}
                        </span>
                      </div>
                    )}
                    {patient.consultation4Notes && (
                      <div className="mt-1 text-xs text-gray-500 max-w-xs truncate" title={patient.consultation4Notes}>
                        {patient.consultation4Notes}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditConsultations(patient)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Manage Consultations
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {treatmentDonePatients.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No aftercare patients found.</p>
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
