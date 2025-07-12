import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function AdminTab() {
  const currentUser = useQuery(api.auth.loggedInUser);
  const allUsers = useQuery(api.users.getAllUsers);
  const createSalespersonAccounts = useMutation(api.users.createSalespersonAccounts);
  const updateUserRole = useMutation(api.users.updateUserRole);
  const makeCurrentUserAdmin = useMutation(api.users.makeCurrentUserAdmin);
  const fixUserRoles = useMutation(api.users.fixUserRoles);
  const deleteUser = useMutation(api.users.deleteUser);
  const createSalespersonWithPassword = useMutation(api.users.createSalespersonWithPassword);
  const [selectedSalesperson, setSelectedSalesperson] = useState<any>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateUserRole({ userId: userId as any, role: newRole });
      toast.success("User role updated successfully!");
    } catch (error) {
      toast.error("Failed to update user role");
    }
  };

  const handleMakeAdmin = async () => {
    try {
      await makeCurrentUserAdmin({});
      toast.success("You are now an admin!");
    } catch (error) {
      toast.error("Failed to make you admin");
    }
  };

  const handleFixRoles = async () => {
    try {
      const result = await fixUserRoles({});
      toast.success(result.message);
    } catch (error) {
      toast.error("Failed to fix user roles");
    }
  };

  // Salesperson'a tıklanınca modalı aç
  const handleSalespersonClick = (user: any) => {
    setSelectedSalesperson(user);
    setShowStatsModal(true);
  };

  // Seçili salesperson için istatistikleri getir
  const stats = useQuery(
    api.leads.getStatsForUser,
    selectedSalesperson ? { userId: selectedSalesperson._id } : "skip"
  );

  // Check if current user is admin
  if (currentUser && currentUser.role !== "admin") {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-yellow-800 mb-2">Admin Access Required</h2>
          <p className="text-yellow-700 mb-4">
            You need admin privileges to access this section. 
          </p>
          <div className="bg-white p-4 rounded border mb-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Current User:</strong> {currentUser.email}
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Role:</strong> {currentUser.role || "No role assigned"}
            </p>
            <p className="text-sm text-gray-700">
              <strong>User ID:</strong> {currentUser._id}
            </p>
          </div>
          
          {/* Show different buttons based on user state */}
          {!currentUser.role ? (
            <div className="space-y-3">
              <button
                onClick={handleFixRoles}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {currentUser.role ? "Make Me Admin" : "Fix User Role (Make Admin)"}
              </button>
              <p className="text-xs text-gray-600">
                This will assign you the admin role and fix the role issue.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleMakeAdmin}
                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {currentUser.role ? "Make Me Admin" : "Make Me Admin"}
              </button>
              <p className="text-xs text-gray-600">
                This will change your role from "{currentUser.role}" to "admin".
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentUser === undefined || allUsers === undefined) {
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
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
      </div>
      {/* User Management */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allUsers?.map((user) => (
                <tr key={user._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.role === "salesperson" ? (
                      <button style={{ color: "#2563eb", textDecoration: "underline", cursor: "pointer", background: "none", border: "none", padding: 0 }} onClick={() => handleSalespersonClick(user)}>
                        {user.name || user.email}
                      </button>
                    ) : (
                      <div className="text-sm font-medium text-gray-900">
                        {user.name || "No name"}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email || "No email"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === "admin" ? "bg-purple-100 text-purple-800" :
                      user.role === "salesperson" ? "bg-green-100 text-green-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {user.role || "No role"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <select
                      value={user.role || ""}
                      onChange={(e) => handleUpdateUserRole(user._id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                      disabled={user._id === currentUser?._id} // Can't change own role
                    >
                      <option value="">No Role</option>
                      <option value="admin">Admin</option>
                      <option value="salesperson">Salesperson</option>
                    </select>
                    {/* Delete button for non-admin users */}
                    {user.role !== "admin" && (
                      <button
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
                            try {
                              await deleteUser({ userId: user._id });
                              toast.success("User deleted successfully!");
                            } catch (error) {
                              toast.error("Failed to delete user");
                            }
                          }
                        }}
                        className="ml-3 text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!allUsers || allUsers.length === 0) && (
            <div className="text-center py-8">
              <p className="text-gray-500">No users found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Salesperson Stats Modal */}
      {showStatsModal && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowStatsModal(false)}>
          <div className="modal-content" style={{ background: "#fff", borderRadius: 8, padding: 32, minWidth: 350, minHeight: 200, position: "relative" }} onClick={e => e.stopPropagation()}>
            <button style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", fontSize: 20, cursor: "pointer" }} onClick={() => setShowStatsModal(false)}>&times;</button>
            <h2 style={{ fontWeight: 600, fontSize: 20, marginBottom: 16 }}>{selectedSalesperson?.name || selectedSalesperson?.email} - Lead İstatistikleri</h2>
            {stats === undefined ? (
              <div>Yükleniyor...</div>
            ) : stats ? (
              <div>
                <div>Toplam Lead: <b>{stats.total}</b></div>
                <div>New Lead: {stats.new_lead} ({stats.total > 0 ? ((stats.new_lead / stats.total) * 100).toFixed(1) : "0.0"}%)</div>
                <div>No Whatsapp: {stats.no_whatsapp} ({stats.total > 0 ? ((stats.no_whatsapp / stats.total) * 100).toFixed(1) : "0.0"}%)</div>
                <div>On Follow-up: {stats.on_follow_up} ({stats.total > 0 ? ((stats.on_follow_up / stats.total) * 100).toFixed(1) : "0.0"}%)</div>
                <div>Live: {stats.live} ({stats.total > 0 ? ((stats.live / stats.total) * 100).toFixed(1) : "0.0"}%)</div>
                <div>Passive Live: {stats.passive_live} ({stats.total > 0 ? ((stats.passive_live / stats.total) * 100).toFixed(1) : "0.0"}%)</div>
                <div>Cold: {stats.cold} ({stats.total > 0 ? ((stats.cold / stats.total) * 100).toFixed(1) : "0.0"}%)</div>
                <div>Hot: {stats.hot} ({stats.total > 0 ? ((stats.hot / stats.total) * 100).toFixed(1) : "0.0"}%)</div>
                <div>Dead: {stats.dead} ({stats.total > 0 ? ((stats.dead / stats.total) * 100).toFixed(1) : "0.0"}%)</div>
                <div>No Communication: {stats.no_communication} ({stats.total > 0 ? ((stats.no_communication / stats.total) * 100).toFixed(1) : "0.0"}%)</div>
                <div>No interest: {stats.no_interest} ({stats.total > 0 ? ((stats.no_interest / stats.total) * 100).toFixed(1) : "0.0"}%)</div>
                <div>Sold: {stats.sold} ({stats.total > 0 ? ((stats.sold / stats.total) * 100).toFixed(1) : "0.0"}%)</div>
              </div>
            ) : (
              <div>İstatistik bulunamadı.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 