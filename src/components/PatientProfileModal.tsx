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
  const updateLead = useMutation(api.leads.update);
  const generateUploadUrl = useMutation(api.leads.generateUploadUrl);
  const addFile = useMutation(api.leads.addFile);
  const removeFile = useMutation(api.leads.removeFile);
  
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      });
    }
  }, [patient]);

  if (!patientId || !patient) {
    return null;
  }

  const handleFileUpload = async (file: File) => {
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
        leadId: patientId,
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

  const handleRemoveFile = async (fileId: Id<"_storage">) => {
    if (confirm("Are you sure you want to delete this file?")) {
      try {
        await removeFile({ leadId: patientId, fileId });
        toast.success("File deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete file");
      }
    }
  };

  const handleSaveNotes = async () => {
    try {
      await updateLead({ id: patientId, notes: notesText });
      setEditingNotes(false);
      toast.success("Notes updated successfully!");
    } catch (error) {
      toast.error("Failed to update notes");
    }
  };

  const FileItem = ({ file, onRemove }: { file: any; onRemove: () => void }) => {
    const fileUrl = useQuery(api.leads.getFileUrl, file.fileId ? { fileId: file.fileId } : "skip");
    
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">
            {file.fileType.startsWith('image/') ? '🖼️' : 
             file.fileType.includes('pdf') ? '📄' : 
             file.fileType.includes('doc') ? '📝' : '📎'}
          </div>
          <div>
            <p className="font-medium text-sm">{file.fileName}</p>
            <p className="text-xs text-gray-500">
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
                {!editing && (
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
                    <div>
                      <label className="text-sm font-medium text-gray-600">Source</label>
                      <input
                        type="text"
                        value={editValues.source}
                        onChange={e => setEditValues(v => ({ ...v, source: e.target.value }))}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
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
                    <div>
                      <label className="text-sm font-medium text-gray-600">Notes</label>
                      <textarea
                        value={editValues.notes}
                        onChange={e => setEditValues(v => ({ ...v, notes: e.target.value }))}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Ad Name</label>
                      <p className="text-gray-900">{patient.adName || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Salesperson</label>
                      <p className="text-gray-900">{patient.salesPerson}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created</label>
                      <p className="text-gray-900">{new Date(patient._creationTime).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <button
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        onClick={async () => {
                          try {
                            await updateLead({
                              id: patientId,
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
                          });
                        }}
                      >Cancel</button>
                    </div>
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
                    <div>
                      <label className="text-sm font-medium text-gray-600">Ad Name</label>
                      <p className="text-gray-900">{patient.adName || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Source</label>
                      <p className="text-gray-900">{patient.source}</p>
                    </div>
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
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100`}>
                          {statusOptions.find(opt => opt.value === patient.status)?.label || patient.status}
                        </span>
                      </div>
                    </div>
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

            {/* Files */}
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
          </div>
        </div>
      </div>
    </div>
  );
} 