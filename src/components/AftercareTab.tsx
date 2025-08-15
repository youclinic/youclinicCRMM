import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { PatientProfileModal } from "./PatientProfileModal";

export function AftercareTab() {
  const treatmentDonePatients = useQuery(api.leads.getTreatmentDone);
  const updateLead = useMutation(api.leads.update);
  const [editingConsultations, setEditingConsultations] = useState<Id<"leads"> | null>(null);
  const [consultationData, setConsultationData] = useState({
    consultation1Date: "",
    consultation2Date: "",
    consultation3Date: "",
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

  const handleEditConsultations = (patient: any) => {
    setConsultationData({
      consultation1Date: patient.consultation1Date || "",
      consultation2Date: patient.consultation2Date || "",
      consultation3Date: patient.consultation3Date || "",
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
      });
      
      setEditingConsultations(null);
      setConsultationData({ consultation1Date: "", consultation2Date: "", consultation3Date: "" });
      toast.success("Consultation dates updated successfully!");
    } catch (error) {
      toast.error("Failed to update consultation dates");
    }
  };

  if (treatmentDonePatients === undefined) {
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Schedule Consultations</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Consultation Date
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
                  Second Consultation Date
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
                  Third Consultation Date
                </label>
                <input
                  type="date"
                  value={consultationData.consultation3Date}
                  onChange={(e) => setConsultationData({ ...consultationData, consultation3Date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.consultation1Date ? new Date(patient.consultation1Date).toLocaleDateString('tr-TR') : "Not scheduled"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.consultation2Date ? new Date(patient.consultation2Date).toLocaleDateString('tr-TR') : "Not scheduled"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.consultation3Date ? new Date(patient.consultation3Date).toLocaleDateString('tr-TR') : "Not scheduled"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditConsultations(patient)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Schedule Consultations
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
