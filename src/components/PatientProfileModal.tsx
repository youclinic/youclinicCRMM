import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Download } from "lucide-react";
import { ProformaPDF } from "./ProformaPDF";

interface PatientProfileModalProps {
  patientId: Id<"leads"> | null;
  onClose: () => void;
}

export function PatientProfileModal({ patientId, onClose }: PatientProfileModalProps) {
  const patient = useQuery(api.leads.getById, patientId ? { id: patientId } : "skip");
  const currentUser = useQuery(api.auth.loggedInUser);
  const proformaInvoices = useQuery(api.leads.getProformaInvoices, patientId ? { patientId } : "skip");
  const updateLead = useMutation(api.leads.update);
  const generateUploadUrl = useMutation(api.leads.generateUploadUrl);
  const addFile = useMutation(api.leads.addFile);
  const removeFile = useMutation(api.leads.removeFile);
  const createProformaInvoice = useMutation(api.leads.createProformaInvoice);
  const deleteProformaInvoice = useMutation(api.leads.deleteProformaInvoice);
  const updateUserPhone = useMutation(api.users.updateUserPhone);
  
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [editingArrivalDate, setEditingArrivalDate] = useState(false);
  const [arrivalDateValue, setArrivalDateValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showProformaModal, setShowProformaModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [proformaForm, setProformaForm] = useState({
    items: [{ description: "", amount: 0 }],
    deposit: 0,
    currency: "USD",
    salespersonPhone: currentUser?.phone || "",
    notes: "",
  });

  // Update proforma form when currentUser changes
  useEffect(() => {
    if (currentUser?.phone && currentUser.phone.trim() !== "") {
      setProformaForm(prev => ({
        ...prev,
        salespersonPhone: currentUser.phone || ""
      }));
    }
  }, [currentUser?.phone]);

  // Check if current user can view sensitive information
  const canViewSensitiveInfo = () => {
    if (!currentUser || !patient) return false;
    
    // Admin can view all information
    if (currentUser.role === "admin") return true;
    
    // Salesperson can only view their own patient's sensitive information
    if (currentUser.role === "salesperson") {
      return patient.assignedTo === currentUser._id;
    }
    
    return false;
  };

  const sensitiveInfoVisible = canViewSensitiveInfo();

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

  const sourceOptions = [
    "Website",
    "Referral",
    "Social Media",
    "Advertisement",
    "Email Campaign",
    "Phone Call",
    "WhatsApp",
    "Other"
  ];

  const currencyOptions = ["USD", "EUR", "GBP", "TRY"];
  const [editingTreatmentType, setEditingTreatmentType] = useState(false);
  const [treatmentTypeValue, setTreatmentTypeValue] = useState("");
  useEffect(() => {
    if (patient && patient.treatmentType) {
      setTreatmentTypeValue(patient.treatmentType);
    }
  }, [patient]);

  const statusOptions = [
    { value: "no_whatsapp", label: "No Whatsapp" },
    { value: "on_follow_up", label: "On Follow-up" },
    { value: "live", label: "Live" },
    { value: "passive_live", label: "Passive Live" },
    { value: "cold", label: "Cold - GBTU" },
    { value: "hot", label: "Hot" },
    { value: "dead", label: "EWS" },
    { value: "no_communication", label: "No Communication" },
    { value: "no_interest", label: "No interest" },
    { value: "sold", label: "Sold" },
  ];
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusValue, setStatusValue] = useState("");
  useEffect(() => {
    if (patient && patient.status) {
      setStatusValue(patient.status);
    }
  }, [patient]);

  // Initialize arrival date value when patient data loads
  useEffect(() => {
    if (patient && patient.arrivalDate) {
      setArrivalDateValue(patient.arrivalDate);
    }
  }, [patient]);

  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    treatmentType: "",
    budget: "",
    source: "",
    price: "",
    currency: "",
    preferredDate: "",
    status: "",
    arrivalDate: "",
  });
  useEffect(() => {
    if (patient) {
      setEditValues({
        firstName: patient.firstName || "",
        lastName: patient.lastName || "",
        email: patient.email || "",
        phone: patient.phone || "",
        country: patient.country || "",
        treatmentType: patient.treatmentType || "",
        budget: patient.budget || "",
        source: patient.source || "",
        price: patient.price ? String(patient.price) : "",
        currency: patient.currency || "",
        preferredDate: patient.preferredDate || "",
        status: patient.status || "",
        arrivalDate: patient.arrivalDate || "",
      });
    }
  }, [patient]);

  const handleFileUpload = async (file: File) => {
    if (!patientId) return;
    
    setUploadingFile(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
              const { storageId } = await result.json();
        await addFile({ leadId: patientId, fileId: storageId, fileName: file.name, fileType: file.type });
      toast.success("File uploaded successfully!");
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveFile = async (fileId: Id<"_storage">) => {
    if (!patientId) return;
    
    try {
      await removeFile({ leadId: patientId, fileId });
      toast.success("File removed successfully!");
    } catch (error) {
      toast.error("Failed to remove file");
    }
  };

  const handleSaveNotes = async () => {
    if (!patientId) return;
    
    try {
      await updateLead({ id: patientId, notes: notesText });
      toast.success("Notes saved successfully!");
      setEditingNotes(false);
    } catch (error) {
      toast.error("Failed to save notes");
    }
  };

  const handleSaveArrivalDate = async () => {
    if (!patientId) return;
    
    try {
      await updateLead({
        id: patientId,
        arrivalDate: arrivalDateValue,
      });
      toast.success("Arrival date updated successfully!");
      setArrivalDateValue("");
    } catch (error) {
      toast.error("Failed to update arrival date");
    }
  };

  // Proforma functions
  const handleAddItem = () => {
    setProformaForm(prev => ({
      ...prev,
      items: [...prev.items, { description: "", amount: 0 }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setProformaForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: 'description' | 'amount', value: string | number) => {
    setProformaForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleCreateProforma = async () => {
    if (!patientId) return;

    // Validate form
    if (proformaForm.items.some(item => !item.description.trim() || item.amount <= 0)) {
      toast.error("Please fill all item descriptions and amounts");
      return;
    }

    if (proformaForm.deposit < 0) {
      toast.error("Deposit cannot be negative");
      return;
    }

    if (!proformaForm.salespersonPhone.trim()) {
      toast.error("Please enter salesperson phone number");
      return;
    }

    try {
      await createProformaInvoice({
        patientId,
        items: proformaForm.items,
        deposit: proformaForm.deposit,
        currency: proformaForm.currency,
        salespersonPhone: proformaForm.salespersonPhone,
        notes: proformaForm.notes,
      });
      
      toast.success("Proforma invoice created successfully!");
      setShowProformaModal(false);
      setProformaForm({
        items: [{ description: "", amount: 0 }],
        deposit: 0,
        currency: "USD",
        salespersonPhone: currentUser?.phone || "",
        notes: "",
      });
    } catch (error) {
      toast.error("Failed to create proforma invoice");
    }
  };

  const handleViewProforma = (invoiceId: Id<"proformaInvoices">) => {
    const invoice = proformaInvoices?.find(inv => inv._id === invoiceId);
    if (invoice) {
      setSelectedInvoice(invoice);
      setShowPDFModal(true);
    }
  };



  const handleDownloadProforma = async (invoiceId: Id<"proformaInvoices">) => {
    const invoice = proformaInvoices?.find(inv => inv._id === invoiceId);
    if (invoice) {
      setSelectedInvoice(invoice);
      setShowDownloadModal(true);
    }
  };

  const handleDeleteProforma = async (invoiceId: Id<"proformaInvoices">) => {
    if (confirm("Are you sure you want to delete this proforma invoice? This action cannot be undone.")) {
      try {
        await deleteProformaInvoice({ invoiceId });
        toast.success("Proforma invoice deleted successfully");
      } catch (error) {
        console.error("Error deleting proforma invoice:", error);
        toast.error("Failed to delete proforma invoice");
      }
    }
  };

  const calculateTotal = () => {
    return proformaForm.items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateRemaining = () => {
    return calculateTotal() - proformaForm.deposit;
  };

  const FileItem = ({ file, onRemove }: { file: any; onRemove: () => void }) => {
    const fileUrl = useQuery(api.leads.getFileUrl, file.fileId ? { fileId: file.fileId } : "skip");
    
    const canViewFiles = () => {
      if (!currentUser) return false;
      if (currentUser.role === "admin") return true;
      // For salesperson, check if they can view this patient's files
      if (currentUser.role === "salesperson") {
        // If patient is assigned to current user, they can view files
        if (patient?.assignedTo === currentUser._id) return true;
        // If patient has no assignment, salesperson can view
        if (!patient?.assignedTo) return true;
      }
      return false;
    };

    const formatUploadDate = (timestamp: number) => {
      return new Date(timestamp).toLocaleDateString('tr-TR');
    };

    const getFileIcon = (fileType: string) => {
      if (fileType.includes('image')) return '🖼️';
      if (fileType.includes('pdf')) return '📄';
      if (fileType.includes('word') || fileType.includes('document')) return '📝';
      if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
      return '📎';
    };

    return (
      <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getFileIcon(file.fileType)}</span>
          <div>
            <div className="font-medium text-gray-900">{file.fileName}</div>
            <div className="text-sm text-gray-500">
              Uploaded: {formatUploadDate(file.uploadedAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canViewFiles() && fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View
            </a>
          )}
          <button
            onClick={onRemove}
            className="px-3 py-1 text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Remove
          </button>
        </div>
      </div>
    );
  };

  if (!patient) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Loading patient information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Patient Profile: {patient.firstName} {patient.lastName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Basic Information */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                {!editing && sensitiveInfoVisible && (
                  <button
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {editing ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-600">First Name</label>
                      <input
                        type="text"
                        value={editValues.firstName}
                        onChange={e => setEditValues(v => ({ ...v, firstName: e.target.value }))}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Last Name</label>
                      <input
                        type="text"
                        value={editValues.lastName}
                        onChange={e => setEditValues(v => ({ ...v, lastName: e.target.value }))}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <input
                        type="email"
                        value={editValues.email}
                        onChange={e => setEditValues(v => ({ ...v, email: e.target.value }))}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Phone</label>
                      <input
                        type="text"
                        value={editValues.phone}
                        onChange={e => setEditValues(v => ({ ...v, phone: e.target.value }))}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Country</label>
                      <input
                        type="text"
                        value={editValues.country}
                        onChange={e => setEditValues(v => ({ ...v, country: e.target.value }))}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Treatment Type</label>
                      <select
                        value={editValues.treatmentType}
                        onChange={e => setEditValues(v => ({ ...v, treatmentType: e.target.value }))}
                        className="w-full px-2 py-1 border rounded"
                      >
                        {treatmentTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Budget</label>
                      <input
                        type="text"
                        value={editValues.budget}
                        onChange={e => setEditValues(v => ({ ...v, budget: e.target.value }))}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    {sensitiveInfoVisible && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Source</label>
                        <select
                          value={editValues.source}
                          onChange={e => setEditValues(v => ({ ...v, source: e.target.value }))}
                          className="w-full px-2 py-1 border rounded"
                        >
                          <option value="">Select Source</option>
                          {sourceOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-600">Price</label>
                      <input
                        type="number"
                        value={editValues.price}
                        onChange={e => setEditValues(v => ({ ...v, price: e.target.value }))}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Currency</label>
                      <select
                        value={editValues.currency}
                        onChange={e => setEditValues(v => ({ ...v, currency: e.target.value }))}
                        className="w-full px-2 py-1 border rounded"
                      >
                        <option value="">Select Currency</option>
                        {currencyOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Preferred Date</label>
                      <input
                        type="date"
                        value={editValues.preferredDate}
                        onChange={e => setEditValues(v => ({ ...v, preferredDate: e.target.value }))}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    {sensitiveInfoVisible && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <select
                          value={editValues.status}
                          onChange={e => setEditValues(v => ({ ...v, status: e.target.value }))}
                          className="w-full px-2 py-1 border rounded"
                        >
                          {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {sensitiveInfoVisible && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Ad Name</label>
                        <p className="text-gray-900">{patient.adName || '-'}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-600">Salesperson</label>
                      <p className="text-gray-900">{patient.salesPerson}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created</label>
                      <p className="text-gray-900">{new Date(patient._creationTime).toLocaleDateString('tr-TR')}</p>
                    </div>
                    {sensitiveInfoVisible && (
                      <div className="flex space-x-2 mt-4">
                        <button
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          onClick={async () => {
                            try {
                              await updateLead({
                                id: patientId as Id<"leads">,
                                ...editValues,
                                price: editValues.price ? Number(editValues.price) : undefined,
                              });
                              toast.success("Patient updated successfully!");
                              setEditing(false);
                            } catch (error) {
                              toast.error("Failed to update patient");
                            }
                          }}
                        >Save</button>
                        <button
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                          onClick={() => {
                            setEditing(false);
                            setEditValues({
                              firstName: patient.firstName || "",
                              lastName: patient.lastName || "",
                              email: patient.email || "",
                              phone: patient.phone || "",
                              country: patient.country || "",
                              treatmentType: patient.treatmentType || "",
                              budget: patient.budget || "",
                              source: patient.source || "",
                              price: patient.price ? String(patient.price) : "",
                              currency: patient.currency || "",
                              preferredDate: patient.preferredDate || "",
                              status: patient.status || "",
                              arrivalDate: patient.arrivalDate || "",
                            });
                          }}
                        >Cancel</button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Full Name</label>
                      <p className="text-gray-900">{patient.firstName} {patient.lastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-gray-900">{patient.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Phone</label>
                      <p className="text-gray-900">{patient.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Country</label>
                      <p className="text-gray-900">{patient.country}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Treatment Type</label>
                      <div className="flex items-center space-x-2">
                        <p className="text-gray-900">{patient.treatmentType}</p>
                      </div>
                    </div>
                    {sensitiveInfoVisible && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Ad Name</label>
                        <p className="text-gray-900">{patient.adName || '-'}</p>
                      </div>
                    )}
                    {sensitiveInfoVisible && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Source</label>
                        <p className="text-gray-900">{patient.source}</p>
                      </div>
                    )}
                    {patient.price !== undefined && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Budget</label>
                        <p className="text-gray-900">{patient.currency || "USD"} {patient.price.toLocaleString()}</p>
                      </div>
                    )}
                    {patient.preferredDate && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Preferred Date</label>
                        <p className="text-gray-900">{new Date(patient.preferredDate).toLocaleDateString('tr-TR')}</p>
                      </div>
                    )}
                    {sensitiveInfoVisible && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100`}>
                            {statusOptions.find(opt => opt.value === patient.status)?.label || patient.status}
                          </span>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-600">Salesperson</label>
                      <p className="text-gray-900">{patient.salesPerson}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created</label>
                      <p className="text-gray-900">{new Date(patient._creationTime).toLocaleDateString('tr-TR')}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Arrival Date Section - Only for sold patients */}
            {patient.status === "sold" && sensitiveInfoVisible && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Arrival Date</h3>
                  {!editingArrivalDate && (
                    <button
                      onClick={() => {
                        setArrivalDateValue(patient.arrivalDate || "");
                        setEditingArrivalDate(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                  )}
                </div>
                
                {editingArrivalDate ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Arrival Date</label>
                      <input
                        type="date"
                        value={arrivalDateValue}
                        onChange={(e) => setArrivalDateValue(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveArrivalDate}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingArrivalDate(false)}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Arrival Date</label>
                    <p className="text-gray-900">
                      {patient.arrivalDate 
                        ? new Date(patient.arrivalDate).toLocaleDateString('tr-TR')
                        : "Not set"
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Medical History */}
            {patient.medicalHistory && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical History</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{patient.medicalHistory}</p>
              </div>
            )}

            {/* Consultation Information */}
            {(patient.consultation1Date || patient.consultation2Date || patient.consultation3Date) && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Consultation Information</h3>
                <div className="space-y-4">
                  {/* Consultation 1 */}
                  {patient.consultation1Date && (
                    <div className="border-l-4 border-blue-500 pl-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">First Consultation</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(patient.consultation1Date).toLocaleDateString('tr-TR')}
                          </p>
                          {patient.consultation1Status && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                              patient.consultation1Status === 'completed' ? 'bg-green-100 text-green-800' :
                              patient.consultation1Status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              patient.consultation1Status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {patient.consultation1Status === 'completed' ? 'Completed' :
                               patient.consultation1Status === 'scheduled' ? 'Scheduled' :
                               patient.consultation1Status === 'cancelled' ? 'Cancelled' :
                               'No Show'}
                            </span>
                          )}
                        </div>
                      </div>
                      {patient.consultation1Notes && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{patient.consultation1Notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Consultation 2 */}
                  {patient.consultation2Date && (
                    <div className="border-l-4 border-green-500 pl-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">Second Consultation</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(patient.consultation2Date).toLocaleDateString('tr-TR')}
                          </p>
                          {patient.consultation2Status && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                              patient.consultation2Status === 'completed' ? 'bg-green-100 text-green-800' :
                              patient.consultation2Status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              patient.consultation2Status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {patient.consultation2Status === 'completed' ? 'Completed' :
                               patient.consultation2Status === 'scheduled' ? 'Scheduled' :
                               patient.consultation2Status === 'cancelled' ? 'Cancelled' :
                               'No Show'}
                            </span>
                          )}
                        </div>
                      </div>
                      {patient.consultation2Notes && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{patient.consultation2Notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Consultation 3 */}
                  {patient.consultation3Date && (
                    <div className="border-l-4 border-purple-500 pl-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">Third Consultation</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(patient.consultation3Date).toLocaleDateString('tr-TR')}
                          </p>
                          {patient.consultation3Status && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                              patient.consultation3Status === 'completed' ? 'bg-green-100 text-green-800' :
                              patient.consultation3Status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              patient.consultation3Status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {patient.consultation3Status === 'completed' ? 'Completed' :
                               patient.consultation3Status === 'scheduled' ? 'Scheduled' :
                               patient.consultation3Status === 'cancelled' ? 'Cancelled' :
                               'No Show'}
                            </span>
                          )}
                        </div>
                      </div>
                      {patient.consultation3Notes && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{patient.consultation3Notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Consultation 4 */}
                  {patient.consultation4Date && (
                    <div className="border-l-4 border-indigo-500 pl-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">Fourth Consultation</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(patient.consultation4Date).toLocaleDateString('tr-TR')}
                          </p>
                          {patient.consultation4Status && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                              patient.consultation4Status === 'completed' ? 'bg-green-100 text-green-800' :
                              patient.consultation4Status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              patient.consultation4Status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {patient.consultation4Status === 'completed' ? 'Completed' :
                               patient.consultation4Status === 'scheduled' ? 'Scheduled' :
                               patient.consultation4Status === 'cancelled' ? 'Cancelled' :
                               'No Show'}
                            </span>
                          )}
                        </div>
                      </div>
                      {patient.consultation4Notes && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{patient.consultation4Notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sales Information */}
            {(patient.price || patient.deposit || patient.saleDate) && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Information</h3>
                <div className="space-y-3">
                  {patient.price && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Price</label>
                      <p className="text-gray-900">{patient.currency || "USD"} {patient.price.toLocaleString()}</p>
                    </div>
                  )}
                  {patient.deposit && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Deposit</label>
                      <p className="text-gray-900">{patient.currency || "USD"} {patient.deposit.toLocaleString()}</p>
                    </div>
                  )}
                  {patient.saleDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Sale Date</label>
                      <p className="text-gray-900">{new Date(patient.saleDate).toLocaleDateString('tr-TR')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Consultation Dates */}
            {(patient.consultation1Date || patient.consultation2Date || patient.consultation3Date) && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Consultation Dates</h3>
                <div className="space-y-3">
                  {patient.consultation1Date && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">First Consultation</label>
                      <p className="text-gray-900">{new Date(patient.consultation1Date).toLocaleDateString('tr-TR')}</p>
                    </div>
                  )}
                  {patient.consultation2Date && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Second Consultation</label>
                      <p className="text-gray-900">{new Date(patient.consultation2Date).toLocaleDateString('tr-TR')}</p>
                    </div>
                  )}
                  {patient.consultation3Date && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Third Consultation</label>
                      <p className="text-gray-900">{new Date(patient.consultation3Date).toLocaleDateString('tr-TR')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Notes and Files */}
          <div className="space-y-6">
            {/* Notes */}
            {sensitiveInfoVisible && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
                  {!editingNotes && (
                    <button
                      onClick={() => {
                        setNotesText(patient.notes || "");
                        setEditingNotes(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                  )}
                </div>
                
                {editingNotes ? (
                  <div className="space-y-3">
                    <textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={6}
                      placeholder="Add notes about this patient..."
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveNotes}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingNotes(false)}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {patient.notes || "No notes added yet."}
                  </p>
                )}
              </div>
            )}

            {/* Files */}
            {sensitiveInfoVisible && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Files</h3>
                  <div className="flex items-center space-x-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file);
                        }
                      }}
                      className="text-sm"
                      disabled={uploadingFile}
                    />
                    {uploadingFile && (
                      <span className="text-sm text-blue-600">Uploading...</span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {patient.files?.map((file, index) => (
                    <FileItem
                      key={index}
                      file={file}
                      onRemove={() => handleRemoveFile(file.fileId)}
                    />
                  ))}
                  {(!patient.files || patient.files.length === 0) && (
                    <p className="text-gray-500 text-center py-4">No files uploaded yet</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Proforma Invoices Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Proforma Invoices</h3>
          <button
            onClick={() => setShowProformaModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Create Proforma
          </button>
        </div>
        
        {proformaInvoices && proformaInvoices.length > 0 ? (
          <div className="space-y-3">
            {proformaInvoices.map((invoice) => (
              <div key={invoice._id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{invoice.invoiceNumber}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(invoice.invoiceDate).toLocaleDateString('tr-TR')} - 
                    Total: {(invoice.currency || "USD") === "USD" ? "$" : 
                           (invoice.currency || "USD") === "EUR" ? "€" : 
                           (invoice.currency || "USD") === "TRY" ? "₺" : 
                           (invoice.currency || "USD") === "GBP" ? "£" : ""}{invoice.total.toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewProforma(invoice._id)}
                    className="flex items-center gap-2 px-3 py-1 text-green-600 hover:text-green-800"
                  >
                    <FileText className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleDownloadProforma(invoice._id)}
                    className="flex items-center gap-2 px-3 py-1 text-blue-600 hover:text-blue-800"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => handleDeleteProforma(invoice._id)}
                    className="flex items-center gap-2 px-3 py-1 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No proforma invoices found</p>
        )}
      </div>

      {/* Proforma Creation Modal */}
      {showProformaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Create Proforma Invoice</h3>
            
            <div className="space-y-6">
              {/* Items Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">Items</h4>
                  <button
                    onClick={handleAddItem}
                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    <Plus className="w-3 h-3" />
                    Add Item
                  </button>
                </div>
                
                <div className="space-y-3">
                  {proformaForm.items.map((item, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <input
                        type="text"
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        value={item.amount}
                        onChange={(e) => handleItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {proformaForm.items.length > 1 && (
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={proformaForm.currency}
                      onChange={(e) => setProformaForm(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="TRY">TRY (₺)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total
                    </label>
                    <div className="text-lg font-bold text-gray-900">
                      {proformaForm.currency === "USD" ? "$" : 
                       proformaForm.currency === "EUR" ? "€" : 
                       proformaForm.currency === "TRY" ? "₺" : 
                       proformaForm.currency === "GBP" ? "£" : ""}{calculateTotal().toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deposit
                    </label>
                    <input
                      type="number"
                      value={proformaForm.deposit}
                      onChange={(e) => setProformaForm(prev => ({ ...prev, deposit: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remaining
                    </label>
                    <div className="text-lg font-bold text-blue-600">
                      {proformaForm.currency === "USD" ? "$" : 
                       proformaForm.currency === "EUR" ? "€" : 
                       proformaForm.currency === "TRY" ? "₺" : 
                       proformaForm.currency === "GBP" ? "£" : ""}{calculateRemaining().toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Salesperson Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salesperson Phone *
                </label>
                <input
                  type="text"
                  value={proformaForm.salespersonPhone}
                  onChange={(e) => setProformaForm(prev => ({ ...prev, salespersonPhone: e.target.value }))}
                  placeholder="+90 (541) 974 30 03"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={proformaForm.notes}
                  onChange={(e) => setProformaForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowProformaModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProforma}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Proforma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proforma PDF Modal */}
      {showPDFModal && selectedInvoice && (
        <ProformaPDF 
          invoice={selectedInvoice} 
          patient={patient}
          createdBy={currentUser}
          autoDownload={false}
          onClose={() => setShowPDFModal(false)} 
        />
      )}

      {/* Proforma Download Modal */}
      {showDownloadModal && selectedInvoice && (
        <ProformaPDF 
          invoice={selectedInvoice} 
          patient={patient}
          createdBy={currentUser}
          autoDownload={true}
          onClose={() => setShowDownloadModal(false)} 
        />
      )}


    </div>
  );
} 