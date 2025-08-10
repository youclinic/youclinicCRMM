import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface PatientProfileModalProps {
  patientId: Id<"leads"> | null;
  onClose: () => void;
}

export function PatientProfileModal({ patientId, onClose }: PatientProfileModalProps) {
  const patient = useQuery(api.leads.getById, patientId ? { id: patientId } : "skip");
  const currentUser = useQuery(api.auth.loggedInUser);
  const updateLead = useMutation(api.leads.update);
  const generateUploadUrl = useMutation(api.leads.generateUploadUrl);
  const addFile = useMutation(api.leads.addFile);
  const removeFile = useMutation(api.leads.removeFile);
  
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [editingArrivalDate, setEditingArrivalDate] = useState(false);
  const [arrivalDateValue, setArrivalDateValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    "Ovarian Rejuvenation"
  ];
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
    notes: "",
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
        notes: patient.notes || "",
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
      await updateLead({ id: patientId as Id<"leads">, arrivalDate: arrivalDateValue });
      toast.success("Arrival date saved successfully!");
      setEditingArrivalDate(false);
    } catch (error) {
      toast.error("Failed to save arrival date");
    }
  };

  const FileItem = ({ file, onRemove }: { file: any; onRemove: () => void }) => {
    const canViewFiles = () => {
      if (!currentUser || !patient) return false;
      
      if (currentUser.role === "admin") return true;
      
      if (currentUser.role === "salesperson") {
        return patient.assignedTo === currentUser._id;
      }
      
      return false;
    };

    return (
      <div className="flex items-center justify-between p-2 bg-white rounded border">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">{file.fileName}</span>
          <span className="text-xs text-gray-400">
            {new Date(file.uploadTime).toLocaleDateString('tr-TR')}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {canViewFiles() && (
            <a
              href={`/api/files/${file.fileId}`}
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
                        <input
                          type="text"
                          value={editValues.source}
                          onChange={e => setEditValues(v => ({ ...v, source: e.target.value }))}
                          className="w-full px-2 py-1 border rounded"
                        />
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
                      <input
                        type="text"
                        value={editValues.currency}
                        onChange={e => setEditValues(v => ({ ...v, currency: e.target.value }))}
                        className="w-full px-2 py-1 border rounded"
                      />
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
                        <label className="text-sm font-medium text-gray-600">Notes</label>
                        <textarea
                          value={editValues.notes}
                          onChange={e => setEditValues(v => ({ ...v, notes: e.target.value }))}
                          className="w-full px-2 py-1 border rounded"
                        />
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
                              notes: patient.notes || "",
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
    </div>
  );
} 