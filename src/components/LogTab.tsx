import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function LogTab() {
  const logs = useQuery(api.logs.listAllLogs, {});

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Log Kayıtları</h1>
      {logs === undefined ? (
        <div>Yükleniyor...</div>
      ) : logs.length === 0 ? (
        <div>Hiç log kaydı yok.</div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded shadow">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tarih/Saat</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kullanıcı</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Detay</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log: any) => (
              <tr key={log._id}>
                <td className="px-4 py-2 whitespace-nowrap font-mono text-xs">{log.timestamp.replace("T", " ").replace("Z", "")}</td>
                <td className="px-4 py-2 whitespace-nowrap">{log.userName}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {log.type === "login" ? "Giriş" : log.type === "status_update" ? "Status Güncelleme" : log.type === "tab_visit" ? "Sekme Ziyareti" : log.type}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {log.type === "login" && <span>Siteye giriş yaptı</span>}
                  {log.type === "status_update" && (
                    <span>
                      Hasta: <b>{log.details.patientName}</b> <br />
                      Status: <b>{log.details.oldStatus}</b> → <b>{log.details.newStatus}</b>
                    </span>
                  )}
                  {log.type === "tab_visit" && (
                    <span>
                      Sekme: <b>{log.details.tab}</b>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 