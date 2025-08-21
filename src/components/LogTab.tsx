import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import React from "react";

export function LogTab() {
  const [paginationOpts, setPaginationOpts] = useState({
    numItems: 100,
    cursor: null as string | null,
  });

  // State to accumulate all loaded logs
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const logsResult = useQuery(api.logs.listAllLogs, { paginationOpts });

  // Update allLogs when new data comes in
  React.useEffect(() => {
    if (logsResult?.page) {
      if (paginationOpts.cursor === null) {
        // First load - replace all logs
        setAllLogs(logsResult.page);
      } else {
        // Load more - append to existing logs
        setAllLogs(prev => [...prev, ...logsResult.page]);
      }
      // Reset loading state
      setIsLoadingMore(false);
    }
  }, [logsResult?.page, paginationOpts.cursor]);

  // Pagination handlers
  const loadMore = () => {
    if (logsResult && !logsResult.isDone && !isLoadingMore) {
      setIsLoadingMore(true);
      setPaginationOpts(prev => ({
        ...prev,
        cursor: logsResult.continueCursor,
      }));
    }
  };

  const showAll = () => {
    setPaginationOpts({
      numItems: 10000, // Very large number to get all
      cursor: null,
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Log Kayıtları</h1>
      {logsResult === undefined ? (
        <div>Yükleniyor...</div>
      ) : allLogs.length === 0 ? (
        <div>Hiç log kaydı yok.</div>
      ) : (
        <>
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
              {allLogs.map((log: any) => (
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
          
          {/* Pagination */}
          {logsResult && !logsResult.isDone && (
            <div className="mt-6 text-center space-y-2">
              <button
                onClick={loadMore}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors cursor-pointer"
              >
                load more
              </button>
              <div>
                <button
                  onClick={showAll}
                  className="text-blue-500 hover:text-blue-700 text-sm font-medium transition-colors cursor-pointer"
                >
                  Show All
                </button>
              </div>
            </div>
          )}
          
          {logsResult && logsResult.isDone && allLogs.length > 0 && (
            <div className="mt-6 text-center">
              <p className="text-gray-500 text-sm">All logs loaded</p>
            </div>
          )}
        </>
      )}
    </div>
  );
} 