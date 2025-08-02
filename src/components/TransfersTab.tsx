import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function TransfersTab() {
  const [activeSection, setActiveSection] = useState<"create" | "requests" | "history">("create");
  const [transferType, setTransferType] = useState<"give" | "take">("give");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<Id<"patientTransfers"> | null>(null);
  const [historyDays, setHistoryDays] = useState(7);

  const loggedInUser = useQuery(api.auth.loggedInUser);
  const isAdmin = loggedInUser?.role === "admin";

  // Queries
  const searchResults = useQuery(
    api.transfers.searchPatients,
    searchQuery.trim() ? { query: searchQuery, transferType } : "skip"
  );
  const salespersons = useQuery(api.users.getSalespersons);
  const transferRequests = useQuery(api.transfers.listTransferRequests);
  const transferHistory = useQuery(api.transfers.getTransferHistory, { days: historyDays });
  const notifications = useQuery(api.transfers.listNotifications);
  const unreadCount = useQuery(api.transfers.getUnreadNotificationCount);

  // Mutations
  const createTransfer = useMutation(api.transfers.createTransferRequest);
  const approveTransfer = useMutation(api.transfers.approveTransferRequest);
  const rejectTransfer = useMutation(api.transfers.rejectTransferRequest);
  const markNotificationRead = useMutation(api.transfers.markNotificationAsRead);

  // Bildirimleri okundu olarak işaretle
  useEffect(() => {
    if (notifications) {
      notifications.forEach(notification => {
        if (!notification.isRead) {
          markNotificationRead({ notificationId: notification._id });
        }
      });
    }
  }, [notifications, markNotificationRead]);

  const handleCreateTransfer = async () => {
    if (!selectedPatient || !selectedUser) {
      alert("Lütfen hasta ve kullanıcı seçin");
      return;
    }

    try {
      await createTransfer({
        patientId: selectedPatient._id,
        toUserId: selectedUser._id,
        transferType,
        reason,
        notes,
      });

      // Formu temizle
      setSelectedPatient(null);
      setSelectedUser(null);
      setReason("");
      setNotes("");
      setSearchQuery("");
      
      alert("Takas isteği başarıyla oluşturuldu!");
    } catch (error: any) {
      alert(`Hata: ${error.message}`);
    }
  };

  const handleApproveTransfer = async (transferId: Id<"patientTransfers">) => {
    try {
      await approveTransfer({ transferId });
      alert("Takas isteği onaylandı!");
    } catch (error: any) {
      alert(`Hata: ${error.message}`);
    }
  };

  const handleRejectTransfer = async () => {
    if (!selectedTransferId) return;

    try {
      await rejectTransfer({ 
        transferId: selectedTransferId, 
        rejectionReason: rejectionReason || undefined 
      });
      setShowRejectionModal(false);
      setSelectedTransferId(null);
      setRejectionReason("");
      alert("Takas isteği reddedildi!");
    } catch (error: any) {
      alert(`Hata: ${error.message}`);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('tr-TR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "Beklemede";
      case "approved": return "Onaylandı";
      case "rejected": return "Reddedildi";
      default: return status;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Hasta Takas Sistemi</h1>
        <p className="text-gray-600">Hastaları diğer satışçılarla takas edin</p>
      </div>

      {/* Bildirim Sayısı */}
      {unreadCount && unreadCount > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-blue-600 font-medium">
              {unreadCount} yeni bildiriminiz var
            </span>
          </div>
        </div>
      )}

      {/* Sekme Navigasyonu */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveSection("create")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeSection === "create"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Takas İsteği Oluştur
        </button>
        <button
          onClick={() => setActiveSection("requests")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeSection === "requests"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          İstekler {transferRequests && transferRequests.filter(r => r.status === "pending").length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {transferRequests.filter(r => r.status === "pending").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSection("history")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeSection === "history"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Geçmiş
        </button>
      </div>

      {/* Takas İsteği Oluşturma */}
      {activeSection === "create" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Yeni Takas İsteği</h2>
          
          {/* Transfer Tipi Seçimi */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transfer Tipi
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="give"
                  checked={transferType === "give"}
                  onChange={(e) => setTransferType(e.target.value as "give" | "take")}
                  className="mr-2"
                />
                <span>Benden Başkasına</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="take"
                  checked={transferType === "take"}
                  onChange={(e) => setTransferType(e.target.value as "give" | "take")}
                  className="mr-2"
                />
                <span>Başkasından Bana</span>
              </label>
            </div>
          </div>

          {/* Hasta Arama */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hasta Ara
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="İsim, telefon veya email ile arama yapın..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {searchResults && searchResults.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                {searchResults.map((patient) => (
                  <div
                    key={patient._id}
                    onClick={() => setSelectedPatient(patient)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                      selectedPatient?._id === patient._id ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                    <div className="text-sm text-gray-600">{patient.email}</div>
                    <div className="text-sm text-gray-500">{patient.phone}</div>
                    <div className="text-xs text-blue-600">{patient.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seçili Hasta */}
          {selectedPatient && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Seçili Hasta:</h3>
              <div className="text-sm text-blue-800">
                <div><strong>Ad:</strong> {selectedPatient.firstName} {selectedPatient.lastName}</div>
                <div><strong>Email:</strong> {selectedPatient.email}</div>
                <div><strong>Telefon:</strong> {selectedPatient.phone}</div>
                <div><strong>Durum:</strong> {selectedPatient.status}</div>
              </div>
            </div>
          )}

          {/* Kullanıcı Seçimi */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {transferType === "give" ? "Hedef Kullanıcı" : "Kaynak Kullanıcı"}
            </label>
            <select
              value={selectedUser?._id || ""}
              onChange={(e) => {
                const user = salespersons?.find(u => u._id === e.target.value);
                setSelectedUser(user || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Kullanıcı seçin...</option>
              {salespersons?.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Sebep */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sebep
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Takas sebebini belirtin..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notlar */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notlar
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ek notlar..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Gönder Butonu */}
          <button
            onClick={handleCreateTransfer}
            disabled={!selectedPatient || !selectedUser}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Takas İsteği Oluştur
          </button>
        </div>
      )}

      {/* İstekler Listesi */}
      {activeSection === "requests" && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Takas İstekleri</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hasta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transfer Tipi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kimden
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kime
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transferRequests?.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {request.patient.firstName} {request.patient.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{request.patient.phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {request.transferType === "give" ? "Benden Başkasına" : "Başkasından Bana"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{request.fromUser.name || request.fromUser.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{request.toUser.name || request.toUser.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {getStatusText(request.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.createdAt)}
                    </td>
                    {isAdmin && request.status === "pending" && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApproveTransfer(request._id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTransferId(request._id);
                              setShowRejectionModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reddet
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {(!transferRequests || transferRequests.length === 0) && (
            <div className="p-6 text-center text-gray-500">
              Henüz takas isteği bulunmuyor.
            </div>
          )}
        </div>
      )}

      {/* Geçmiş */}
      {activeSection === "history" && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Takas Geçmişi</h2>
              <select
                value={historyDays}
                onChange={(e) => setHistoryDays(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value={7}>Son 7 gün</option>
                <option value={30}>Son 30 gün</option>
                <option value={90}>Son 90 gün</option>
                <option value={365}>Son 1 yıl</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hasta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transfer Tipi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kimden
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kime
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sebep
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transferHistory?.map((transfer) => (
                  <tr key={transfer._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transfer.patient.firstName} {transfer.patient.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{transfer.patient.phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {transfer.transferType === "give" ? "Benden Başkasına" : "Başkasından Bana"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{transfer.fromUser.name || transfer.fromUser.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{transfer.toUser.name || transfer.toUser.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transfer.status)}`}>
                        {getStatusText(transfer.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transfer.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transfer.reason || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {(!transferHistory || transferHistory.length === 0) && (
            <div className="p-6 text-center text-gray-500">
              Bu süre içinde takas geçmişi bulunmuyor.
            </div>
          )}
        </div>
      )}

      {/* Reddetme Modalı */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Takas İsteğini Reddet</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Red Sebebi (Opsiyonel)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Red sebebini belirtin..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleRejectTransfer}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
              >
                Reddet
              </button>
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setSelectedTransferId(null);
                  setRejectionReason("");
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 