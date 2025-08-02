import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { PatientProfileModal } from "./PatientProfileModal";

export function LeadsTab() {
  const leads = useQuery(api.leads.list);
  const currentUser = useQuery(api.auth.loggedInUser);
  const createLead = useMutation(api.leads.create);
  const updateLead = useMutation(api.leads.update);
  const deleteLead = useMutation(api.leads.remove);
  const generateUploadUrl = useMutation(api.leads.generateUploadUrl);
  const addFile = useMutation(api.leads.addFile);
  const removeFile = useMutation(api.leads.removeFile);

  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Id<"leads"> | null>(null);
  const [viewingFiles, setViewingFiles] = useState<Id<"leads"> | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState<Id<"leads"> | null>(null);
  const [showTreatmentModal, setShowTreatmentModal] = useState<Id<"leads"> | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<Id<"leads"> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    treatmentType: "",
    budget: "",
    source: "",
    adName: "",
    notes: "",
    preferredDate: "",
    medicalHistory: "",
  });

  const [convertData, setConvertData] = useState({
    price: "",
    deposit: "",
    saleDate: "",
    currency: "USD", // Add default currency
  });

  const [treatmentData, setTreatmentData] = useState({
    consultation1Date: "",
    consultation2Date: "",
    consultation3Date: "",
  });

  const treatmentTypes = [
    "Parkinson's",
    "Autism",
    "Alzheimer's",
    "Dementia",
    "ChromaPulse",
    "Cerebral Palsy",
    "Stroke",
    "Ovarian Rejuvenation"
  ];

  const sources = [
    "Website",
    "Referral",
    "Social Media",
    "Advertisement",
    "Email Campaign",
    "Phone Call",
    "Other"
  ];

  const currencyOptions = ["USD", "EUR", "GBP"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLead) {
        await updateLead({ id: editingLead, ...formData });
        toast.success("Lead updated successfully!");
      } else {
        await createLead(formData);
        toast.success("Lead created successfully!");
      }
      resetForm();
    } catch (error) {
      toast.error("Failed to save lead");
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      country: "",
      treatmentType: "",
      budget: "",
      source: "",
      adName: "",
      notes: "",
      preferredDate: "",
      medicalHistory: "",
    });
    setShowForm(false);
    setEditingLead(null);
  };

  const handleEdit = (lead: any) => {
    setFormData({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      country: lead.country,
      treatmentType: lead.treatmentType,
      budget: lead.budget || "",
      source: lead.source,
      adName: lead.adName || "",
      notes: lead.notes || "",
      preferredDate: lead.preferredDate || "",
      medicalHistory: lead.medicalHistory || "",
    });
    setEditingLead(lead._id);
    setShowForm(true);
  };

  const handleDelete = async (id: Id<"leads">) => {
    if (confirm("Are you sure you want to delete this lead? This will also delete all associated files.")) {
      try {
        await deleteLead({ id });
        toast.success("Lead deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete lead");
      }
    }
  };

  const handleStatusChange = async (id: Id<"leads">, status: string, leadObj?: any) => {
    if (!leads) {
      toast.error("Lead verisi yüklenemedi. Lütfen sayfayı yenileyin.");
      return;
    }
    const lead = leadObj || leads.find((l) => l._id === id);
    const requiredFields = [
      { key: "firstName", label: "First Name" },
      { key: "lastName", label: "Last Name" },
      { key: "phone", label: "Phone" },
      { key: "treatmentType", label: "Treatment Type" },
      { key: "source", label: "Source" },
    ];
    const missingFields = requiredFields.filter(f => !lead?.[f.key] || lead[f.key].trim() === "");
    if (missingFields.length > 0) {
      toast.error(
        `Eksik zorunlu alanlar: ${missingFields.map(f => f.label).join(", ")}.\nLütfen bu alanları doldurun.`
      );
      return;
    }
    if (status === "converted") {
      setShowConvertModal(id);
      return;
    }
    
    if (status === "treatment_done") {
      setShowTreatmentModal(id);
      return;
    }
    
    try {
      await updateLead({ id, status });
      toast.success("Status updated successfully!");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleConvertSubmit = async () => {
    if (!showConvertModal) return;
    
    try {
      await updateLead({
        id: showConvertModal,
        status: "converted",
        price: parseFloat(convertData.price) || undefined,
        deposit: parseFloat(convertData.deposit) || undefined,
        saleDate: convertData.saleDate || undefined,
        currency: convertData.currency,
      });
      
      setShowConvertModal(null);
      setConvertData({ price: "", deposit: "", saleDate: "", currency: "USD" });
      toast.success("Lead converted successfully!");
    } catch (error) {
      toast.error("Failed to convert lead");
    }
  };

  const handleTreatmentSubmit = async () => {
    if (!showTreatmentModal) return;
    
    try {
      await updateLead({
        id: showTreatmentModal,
        status: "treatment_done",
        consultation1Date: treatmentData.consultation1Date || undefined,
        consultation2Date: treatmentData.consultation2Date || undefined,
        consultation3Date: treatmentData.consultation3Date || undefined,
      });
      
      setShowTreatmentModal(null);
      setTreatmentData({ consultation1Date: "", consultation2Date: "", consultation3Date: "" });
      toast.success("Patient moved to aftercare!");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleFileUpload = async (leadId: Id<"leads">, file: File) => {
    setUploadingFile(true);
    try {
      const uploadUrl = await generateUploadUrl();
      
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!result.ok) {
        throw new Error("Upload failed");
      }
      
      const { storageId } = await result.json();
      
      await addFile({
        leadId,
        fileId: storageId,
        fileName: file.name,
        fileType: file.type,
      });
      
      toast.success("File uploaded successfully!");
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = async (leadId: Id<"leads">, fileId: Id<"_storage">) => {
    if (confirm("Are you sure you want to delete this file?")) {
      try {
        await removeFile({ leadId, fileId });
        toast.success("File deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete file");
      }
    }
  };

  const FileViewer = ({ leadId }: { leadId: Id<"leads"> }) => {
    const lead = leads?.find(l => l._id === leadId);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              Files for {lead?.firstName} {lead?.lastName}
            </h2>
            <button
              onClick={() => setViewingFiles(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(leadId, file);
                }
              }}
              className="mb-2"
              disabled={uploadingFile}
            />
            {uploadingFile && (
              <p className="text-sm text-blue-600">Uploading...</p>
            )}
          </div>
          
          <div className="space-y-2">
            {lead?.files?.map((file, index) => (
              <FileItem
                key={index}
                file={file}
                onRemove={() => handleRemoveFile(leadId, file.fileId)}
              />
            ))}
            {(!lead?.files || lead.files.length === 0) && (
              <p className="text-gray-500 text-center py-4">No files uploaded yet</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const FileItem = ({ file, onRemove }: { file: any; onRemove: () => void }) => {
    const fileUrl = useQuery(api.leads.getFileUrl, file.fileId ? { fileId: file.fileId } : "skip");
    
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">
            {file.fileType.startsWith('image/') ? '🖼️' : 
             file.fileType.includes('pdf') ? '📄' : 
             file.fileType.includes('doc') ? '📝' : '📎'}
          </div>
          <div>
            <p className="font-medium">{file.fileName}</p>
            <p className="text-sm text-gray-500">
              {new Date(file.uploadedAt).toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View
            </a>
          )}
          <button
            onClick={onRemove}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  if (leads === undefined) {
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

  // Filter leads to only show those with status 'new'
  let filteredLeads = leads;
  const activeLeads = filteredLeads.filter(lead => lead.status === "new");

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add New Lead
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingLead ? "Edit Lead" : "Add New Lead"}
            </h2>
            
            {/* Show assignment info for new leads */}
            {!editingLead && currentUser && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This lead will be automatically assigned to you ({currentUser.name || currentUser.email})
                </p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Treatment Type *
                  </label>
                  <select
                    required
                    value={formData.treatmentType}
                    onChange={(e) => setFormData({ ...formData, treatmentType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Treatment</option>
                    {treatmentTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget
                  </label>
                  <input
                    type="text"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., $5,000 - $10,000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source *
                  </label>
                  <select
                    required
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Source</option>
                    {sources.map((source) => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Name
                  </label>
                  <input
                    type="text"
                    value={formData.adName}
                    onChange={(e) => setFormData({ ...formData, adName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Facebook Ad - Parkinson's Treatment"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medical History
                </label>
                <textarea
                  value={formData.medicalHistory}
                  onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Any relevant medical history..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingLead ? "Update Lead" : "Create Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Convert to Sale</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={convertData.price}
                    onChange={(e) => setConvertData({ ...convertData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter treatment price"
                  />
                  <select
                    value={convertData.currency}
                    onChange={(e) => setConvertData({ ...convertData, currency: e.target.value })}
                    className="px-2 py-2 border border-gray-300 rounded-md"
                  >
                    {currencyOptions.map((cur) => (
                      <option key={cur} value={cur}>{cur}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deposit
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={convertData.deposit}
                    onChange={(e) => setConvertData({ ...convertData, deposit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter deposit amount"
                  />
                  <select
                    value={convertData.currency}
                    onChange={(e) => setConvertData({ ...convertData, currency: e.target.value })}
                    className="px-2 py-2 border border-gray-300 rounded-md"
                  >
                    {currencyOptions.map((cur) => (
                      <option key={cur} value={cur}>{cur}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sale Date
                </label>
                <input
                  type="date"
                  value={convertData.saleDate}
                  onChange={(e) => setConvertData({ ...convertData, saleDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowConvertModal(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertSubmit}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Convert to Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Treatment Done Modal */}
      {showTreatmentModal && (
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
                  value={treatmentData.consultation1Date}
                  onChange={(e) => setTreatmentData({ ...treatmentData, consultation1Date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Second Consultation Date
                </label>
                <input
                  type="date"
                  value={treatmentData.consultation2Date}
                  onChange={(e) => setTreatmentData({ ...treatmentData, consultation2Date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Third Consultation Date
                </label>
                <input
                  type="date"
                  value={treatmentData.consultation3Date}
                  onChange={(e) => setTreatmentData({ ...treatmentData, consultation3Date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowTreatmentModal(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTreatmentSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Move to Aftercare
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {viewingFiles && <FileViewer leadId={viewingFiles} />}

      {/* Patient Profile Modal */}
      {showProfileModal && (
        <PatientProfileModal
          patientId={showProfileModal}
          onClose={() => setShowProfileModal(null)}
        />
      )}

      {/* Leads Table */}
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Files
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeLeads.map((lead) => (
                <tr key={lead._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                      onClick={() => setShowProfileModal(lead._id)}
                    >
                      {lead.firstName} {lead.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{lead.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lead.treatmentType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead._id, e.target.value, lead)}
                      className={`text-xs font-semibold rounded-full px-2 py-1 border-0 bg-gray-100`}
                    >
                      <option value="new_lead">New Lead</option>
                      <option value="no_whatsapp">No Whatsapp</option>
                      <option value="on_follow_up">On Follow-up</option>
                      <option value="live">Live</option>
                      <option value="passive_live">Passive Live</option>
                      <option value="cold">Cold - GBTU</option>
                      <option value="hot">Hot</option>
                      <option value="dead">EWS</option>
                      <option value="no_communication">No Communication</option>
                      <option value="no_interest">No interest</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => setViewingFiles(lead._id)}
                      className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                    >
                      <span>📎</span>
                      <span>{lead.files?.length || 0}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(lead)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(lead._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {activeLeads.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No leads found. Add your first lead to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
