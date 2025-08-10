import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { PatientProfileModal } from "./PatientProfileModal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { tr } from "date-fns/locale";
import { format, parse, isValid, isAfter, isBefore } from "date-fns";

export function PatientsTab() {
  const leads = useQuery(api.leads.list);
  const currentUser = useQuery(api.auth.loggedInUser);
  const updateLead = useMutation(api.leads.update);
  const deleteLead = useMutation(api.leads.remove);
  const generateUploadUrl = useMutation(api.leads.generateUploadUrl);
  const addFile = useMutation(api.leads.addFile);
  const removeFile = useMutation(api.leads.removeFile);
  const [editingLead, setEditingLead] = useState<Id<"leads"> | null>(null);
  const [viewingFiles, setViewingFiles] = useState<Id<"leads"> | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState<Id<"leads"> | null>(null);
  const [showTreatmentModal, setShowTreatmentModal] = useState<Id<"leads"> | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<Id<"leads"> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currencyOptions = ["USD", "EUR", "GBP"];

  const [convertData, setConvertData] = useState({
    price: "",
    deposit: "",
    saleDate: "",
    currency: "USD",
  });

  const [treatmentData, setTreatmentData] = useState({
    consultation1Date: "",
    consultation2Date: "",
    consultation3Date: "",
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [treatmentFilter, setTreatmentFilter] = useState<string>("");
  const [followUpStart, setFollowUpStart] = useState<Date | null>(null);
  const [followUpEnd, setFollowUpEnd] = useState<Date | null>(null);
  const [followUpDateFilter, setFollowUpDateFilter] = useState<Date | null>(null);
  const [showFollowUpDatePicker, setShowFollowUpDatePicker] = useState(false);
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

  const [searchTerm, setSearchTerm] = useState("");

  // Check if current user can view sensitive information for a specific lead
  const canViewSensitiveInfo = (lead: any) => {
    if (!currentUser) return false;
    
    // Admin can view all information
    if (currentUser.role === "admin") return true;
    
    // Salesperson can only view their own lead's sensitive information
    if (currentUser.role === "salesperson") {
      return lead.assignedTo === currentUser._id;
    }
    
    return false;
  };

  // Yardımcı fonksiyon: yyyy-MM-dd -> dd/MM/yyyy
  function formatDateTR(dateStr?: string) {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }

  // Yardımcı fonksiyon: Bugün mü?
  function isTodayTR(dateStr?: string) {
    if (!dateStr) return false;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateStr === todayStr;
  }

  const handleStatusChange = async (id: Id<"leads">, status: string) => {
    if (status === "sold") {
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
        status: "sold",
        price: parseFloat(convertData.price) || undefined,
        deposit: parseFloat(convertData.deposit) || undefined,
        saleDate: convertData.saleDate || undefined,
        currency: convertData.currency,
      });
      
      setShowConvertModal(null);
      setConvertData({ price: "", deposit: "", saleDate: "", currency: "USD" });
      toast.success("Patient marked as sold successfully!");
    } catch (error) {
      toast.error("Failed to mark as sold");
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

  const handleDelete = async (id: Id<"leads">) => {
    if (confirm("Are you sure you want to delete this patient? This will also delete all associated files.")) {
      try {
        await deleteLead({ id });
        toast.success("Patient deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete patient");
      }
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
    
    // Check if current user can view files for this lead
    const canViewFiles = () => {
      if (!currentUser || !lead) return false;
      
      // Admin can view all files
      if (currentUser.role === "admin") return true;
      
      // Salesperson can only view their own lead's files
      if (currentUser.role === "salesperson") {
        return lead.assignedTo === currentUser._id;
      }
      
      return false;
    };
    
    if (!canViewFiles()) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
              <button
                onClick={() => setViewingFiles(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-700">
              You don't have permission to view files for this patient.
            </p>
          </div>
        </div>
      );
    }
    
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

  // Filter patients to show all except 'sold' and 'new_lead'
  let filteredPatients = leads.filter(lead => lead.status !== "sold" && lead.status !== "new_lead" && lead.status !== "new");
  if (statusFilter) filteredPatients = filteredPatients.filter(lead => lead.status === statusFilter);
  if (treatmentFilter) filteredPatients = filteredPatients.filter(lead => lead.treatmentType === treatmentFilter);
  if (followUpStart || followUpEnd) {
    filteredPatients = filteredPatients.filter(lead => {
      if (!lead.createdAt) return false;
      const leadDate = new Date(lead.createdAt);
      if (followUpStart && isBefore(leadDate, followUpStart)) return false;
      if (followUpEnd && isAfter(leadDate, followUpEnd)) return false;
      return true;
    });
  }
  if (followUpDateFilter) {
    filteredPatients = filteredPatients.filter(lead => {
      if (!lead.nextFollowUpDate) return false;
      const leadDate = parse(lead.nextFollowUpDate, 'yyyy-MM-dd', new Date());
      return isValid(leadDate) &&
        format(leadDate, 'yyyy-MM-dd') === format(followUpDateFilter, 'yyyy-MM-dd');
    });
  }
  if (searchTerm.trim() !== "") {
    const q = searchTerm.trim().toLowerCase();
    filteredPatients = filteredPatients.filter(lead => {
      const firstName = lead.firstName?.toLowerCase() || "";
      const lastName = lead.lastName?.toLowerCase() || "";
      const fullName = (lead.firstName && lead.lastName) ? (lead.firstName + " " + lead.lastName).toLowerCase() : "";
      const email = lead.email?.toLowerCase() || "";
      const phone = lead.phone || "";
      return (
        firstName.includes(q) ||
        lastName.includes(q) ||
        fullName.includes(q) ||
        email.includes(q) ||
        phone.includes(q)
      );
    });
  }
  const patients = filteredPatients;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Patients Management</h1>
      </div>

      <div className="mb-2 text-sm text-gray-700 font-semibold">Toplam {patients.length} hasta listeleniyor</div>

      {/* Sold Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Sold</h2>
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
                Save
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

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-4 mb-2 items-end">
        <div className="flex flex-col">
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-2 py-1 border rounded min-w-[120px]">
            <option value="">All</option>
            <option value="no_whatsapp">No Whatsapp</option>
            <option value="on_follow_up">On Follow-up</option>
            <option value="live">Live</option>
            <option value="passive_live">Passive Live</option>
            <option value="cold">Cold - GBTU</option>
            <option value="hot">Hot</option>
            <option value="dead">EWS</option>
            <option value="no_communication">No Communication</option>
            <option value="no_interest">No interest</option>
            <option value="sold">Sold</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="block text-xs font-medium text-gray-700 mb-1">Treatment</label>
          <select value={treatmentFilter} onChange={e => setTreatmentFilter(e.target.value)} className="px-2 py-1 border rounded min-w-[120px]">
            <option value="">All</option>
            {treatmentTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div className="flex-1" />
        <div className="flex flex-col items-end">
          <label className="block text-xs font-medium text-gray-700 mb-1">Follow-up</label>
          <button
            onClick={() => setShowFollowUpDatePicker(true)}
            className="px-2 py-1 border rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs"
          >
            {followUpDateFilter ? format(followUpDateFilter, 'dd/MM/yyyy') : 'Tarih seç'}
          </button>
          {followUpDateFilter && (
            <button
              onClick={() => setFollowUpDateFilter(null)}
              className="mt-1 px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs"
            >Temizle</button>
          )}
        </div>
      </div>
      <div className="flex flex-row gap-2 mb-4 items-end">
        <div className="flex flex-col w-[300px]">
          <label className="block text-xs font-medium text-gray-700 mb-1 invisible">Arama</label>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="İsim, numara veya email ile ara"
            className="w-[300px] px-2 py-1 border rounded text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="block text-xs font-medium text-gray-700 mb-1">Başlangıç</label>
          <DatePicker
            selected={followUpStart}
            onChange={setFollowUpStart}
            dateFormat="dd/MM/yyyy"
            locale={tr}
            placeholderText="gg/aa/yyyy"
            className="px-2 py-1 border rounded w-[130px] text-left"
            calendarClassName="!p-2"
            showPopperArrow={false}
            popperPlacement="bottom"
            isClearable
          />
        </div>
        <div className="flex flex-col">
          <label className="block text-xs font-medium text-gray-700 mb-1">Bitiş</label>
          <DatePicker
            selected={followUpEnd}
            onChange={setFollowUpEnd}
            dateFormat="dd/MM/yyyy"
            locale={tr}
            placeholderText="gg/aa/yyyy"
            className="px-2 py-1 border rounded w-[130px] text-left"
            calendarClassName="!p-2"
            showPopperArrow={false}
            popperPlacement="bottom"
            isClearable
          />
        </div>
        {(followUpStart || followUpEnd) && (
          <button
            onClick={() => { setFollowUpStart(null); setFollowUpEnd(null); }}
            className="ml-2 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs h-8 mt-4"
          >Filtreyi Temizle</button>
        )}
      </div>
      {showFollowUpDatePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4">Follow-up Tarihi Seç</h2>
            <DatePicker
              selected={followUpDateFilter}
              onChange={(date) => { setFollowUpDateFilter(date); setShowFollowUpDatePicker(false); }}
              dateFormat="dd/MM/yyyy"
              locale={tr}
              inline
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowFollowUpDatePicker(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >Kapat</button>
            </div>
          </div>
        </div>
      )}

      {/* Patients Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Treatment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Follow-up
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salesperson
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Files
                </th>
                {currentUser?.role === "admin" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patients.map((patient) => (
                <tr key={patient._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      {patient.createdAt && (
                        <span className="text-xs text-gray-400 mb-1">
                          {formatDateTR(new Date(patient.createdAt).toISOString().slice(0, 10))}
                        </span>
                      )}
                      <div 
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                        onClick={() => setShowProfileModal(patient._id)}
                      >
                        {patient.firstName} {patient.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{patient.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.phone}
                    &nbsp;
                    <a
                      href={`https://web.whatsapp.com/send?phone=${patient.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open WhatsApp Chat"
                    >
                      <img src="/WhatsApp.svg" alt="WhatsApp" width="16" height="16" style={{ verticalAlign: 'middle', marginLeft: '4px' }} />
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.treatmentType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {canViewSensitiveInfo(patient) ? (
                      <select
                        value={patient.status}
                        onChange={(e) => handleStatusChange(patient._id, e.target.value)}
                        className={`text-xs font-semibold rounded-full px-2 py-1 border-0 bg-gray-100`}
                      >
                        <option value="no_whatsapp">No Whatsapp</option>
                        <option value="on_follow_up">On Follow-up</option>
                        <option value="live">Live</option>
                        <option value="passive_live">Passive Live</option>
                        <option value="cold">Cold - GBTU</option>
                        <option value="hot">Hot</option>
                        <option value="dead">EWS</option>
                        <option value="no_communication">No Communication</option>
                        <option value="no_interest">No interest</option>
                        <option value="sold">Sold</option>
                      </select>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap flex flex-col items-start gap-1">
                    <div className="relative w-[150px]">
                      <DatePicker
                        selected={
                          patient.nextFollowUpDate && isValid(parse(patient.nextFollowUpDate, 'yyyy-MM-dd', new Date()))
                            ? parse(patient.nextFollowUpDate, 'yyyy-MM-dd', new Date())
                            : null
                        }
                        onChange={async (date: Date | null) => {
                          let backendDate = date ? format(date, 'yyyy-MM-dd') : '';
                          await updateLead({ id: patient._id, nextFollowUpDate: backendDate });
                          toast.success("Follow-up date updated!");
                        }}
                        dateFormat="dd/MM/yyyy"
                        locale={tr}
                        placeholderText="gg/aa/yyyy"
                        className={`pr-4 px-2 py-1 border rounded w-full text-left ${isTodayTR(patient.nextFollowUpDate) ? 'bg-red-100 text-red-700 font-bold' : ''}`}
                        calendarClassName="!p-2"
                        showPopperArrow={false}
                        popperPlacement="bottom"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={async () => {
                          const newCount = (patient.followUpCount || 0) - 1;
                          await updateLead({ id: patient._id, followUpCount: newCount < 0 ? 0 : newCount });
                        }}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        disabled={patient.followUpCount === 0}
                      >-</button>
                      <span className="font-semibold w-4 text-center">{patient.followUpCount || 0}</span>
                      <button
                        onClick={async () => {
                          const newCount = (patient.followUpCount || 0) + 1;
                          await updateLead({ id: patient._id, followUpCount: newCount });
                        }}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      >+</button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.salesPerson}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {canViewSensitiveInfo(patient) ? (
                      <button
                        onClick={() => setViewingFiles(patient._id)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <span>📎</span>
                        <span>{patient.files?.length || 0}</span>
                      </button>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  {currentUser?.role === "admin" && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDelete(patient._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {patients.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No patients found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
