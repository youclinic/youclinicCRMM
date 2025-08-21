// Marketing sekmesi, reklam bazlı lead analizi ve filtreleme için oluşturulmuştur.
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "new_lead", label: "New Lead" },
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

export function MarketingTab() {
  // Filtreler
  const [selectedAd, setSelectedAd] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination state for leads
  const [paginationOpts, setPaginationOpts] = useState({
    numItems: 50, // Marketing için daha fazla lead çekelim
    cursor: null as string | null,
  });

  // Filtreler değiştiğinde pagination'ı sıfırla
  useEffect(() => {
    setPaginationOpts({
      numItems: 50,
      cursor: null,
    });
  }, [selectedAd, selectedStatus, dateFrom, dateTo]);

  // Tüm reklam adlarını çek
  const adNames = useQuery(api.leads.getAdNamesForMarketing) || [];

  // Tüm lead'leri çek (pagination ile) - Marketing analizi için tüm leadler
  const leadsResult = useQuery(api.leads.getAllLeadsForMarketing, { 
    paginationOpts,
    adNameFilter: selectedAd || undefined,
    statusFilter: selectedStatus || undefined,
    dateFromFilter: dateFrom || undefined,
    dateToFilter: dateTo || undefined,
  });
  const leads = leadsResult?.page || [];

  // Tüm leadler için istatistikleri çek (pagination'dan bağımsız)
  const statsResult = useQuery(api.leads.getMarketingStats, {
    adNameFilter: selectedAd || undefined,
    statusFilter: selectedStatus || undefined,
    dateFromFilter: dateFrom || undefined,
    dateToFilter: dateTo || undefined,
  });

  // Pagination fonksiyonları
  const loadMore = () => {
    if (leadsResult && !leadsResult.isDone) {
      setPaginationOpts(prev => ({
        ...prev,
        cursor: leadsResult.continueCursor,
      }));
    }
  };

  const showAll = () => {
    setPaginationOpts({
      numItems: 1000, // Çok büyük bir sayı ile tümünü yükle
      cursor: null,
    });
  };

  const resetPagination = () => {
    setPaginationOpts({
      numItems: 50,
      cursor: null,
    });
  };

  // Loading state
  if (leadsResult === undefined || adNames === undefined || statsResult === undefined) {
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
      <h2 className="text-2xl font-bold mb-6">Marketing Analizi</h2>
      
      {/* Filtreler */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Reklam Adı</label>
          <select
            className="border rounded px-3 py-2 w-48"
            value={selectedAd}
            onChange={e => setSelectedAd(e.target.value)}
          >
            <option value="">Tümü</option>
            {adNames.map(ad => (
              <option key={ad} value={ad}>{ad}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            className="border rounded px-3 py-2 w-40"
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Başlangıç Tarihi</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Bitiş Tarihi</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* Özet kutuları - Tüm leadler için istatistikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-100 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold">{statsResult.total}</div>
          <div className="text-sm text-gray-700">Toplam Lead</div>
        </div>
        {Object.entries(statsResult.byStatus).map(([status, count]) => (
          <div key={status} className="bg-white border rounded-lg p-4 text-center">
            <div className="text-xl font-bold">{count}</div>
            <div className="text-xs text-gray-500">{STATUS_OPTIONS.find(o => o.value === status)?.label}</div>
          </div>
        ))}
      </div>

      {/* Tablo */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ad</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Soyad</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Telefon</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reklam</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-gray-400">Sonuç bulunamadı</td></tr>
            ) : (
              leads.map((lead: any) => (
                <tr key={lead._id}>
                  <td className="px-4 py-2">{lead.firstName}</td>
                  <td className="px-4 py-2">{lead.lastName}</td>
                  <td className="px-4 py-2">{lead.phone}</td>
                  <td className="px-4 py-2">{lead.adName || <span className="text-gray-400">-</span>}</td>
                  <td className="px-4 py-2">{STATUS_OPTIONS.find(o => o.value === lead.status)?.label || lead.status}</td>
                  <td className="px-4 py-2">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('tr-TR') : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {leadsResult && (
        <div className="mt-4 flex justify-center gap-4">
          {!leadsResult.isDone && (
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Daha Fazla Yükle
            </button>
          )}
          {paginationOpts.numItems > 50 && (
            <button
              onClick={resetPagination}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              İlk 50'yi Göster
            </button>
          )}
          {leadsResult.isDone && paginationOpts.numItems <= 50 && (
            <button
              onClick={showAll}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Tümünü Göster
            </button>
          )}
        </div>
      )}

      {/* Pagination info */}
      {leadsResult && (
        <div className="mt-4 text-center text-sm text-gray-500">
          {leadsResult.isDone ? (
            <p>Toplam {leads.length} lead yüklendi (Filtrelenmiş toplam: {statsResult.total} lead)</p>
          ) : (
            <p>Daha fazla lead yüklenebilir (şu anda {leads.length} lead gösteriliyor, Filtrelenmiş toplam: {statsResult.total} lead)</p>
          )}
        </div>
      )}
    </div>
  );
} 