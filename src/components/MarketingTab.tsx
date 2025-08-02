// Marketing sekmesi, reklam bazlı lead analizi ve filtreleme için oluşturulmuştur.
import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
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

  // Tüm lead'leri çek
  const leads = useQuery(api.leads.list) || [];

  // Reklam adlarını çıkar
  const adNames = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => { if (l.adName) set.add(l.adName); });
    return Array.from(set);
  }, [leads]);

  // Filtrelenmiş lead'ler
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (selectedAd && l.adName !== selectedAd) return false;
      if (selectedStatus && l.status !== selectedStatus) return false;
      if (dateFrom && l.createdAt !== undefined && l.createdAt < new Date(dateFrom).getTime()) return false;
      if (dateTo && l.createdAt !== undefined && l.createdAt > new Date(dateTo).getTime() + 24*60*60*1000) return false;
      return true;
    });
  }, [leads, selectedAd, selectedStatus, dateFrom, dateTo]);

  // Özet istatistikler
  const stats = useMemo(() => {
    const total = filteredLeads.length;
    const byStatus: Record<string, number> = {};
    STATUS_OPTIONS.forEach(opt => { if (opt.value) byStatus[opt.value] = 0; });
    filteredLeads.forEach(l => { if (l.status) byStatus[l.status] = (byStatus[l.status] || 0) + 1; });
    return { total, byStatus };
  }, [filteredLeads]);

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
      {/* Özet kutuları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-100 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-700">Toplam Lead</div>
        </div>
        {Object.entries(stats.byStatus).map(([status, count]) => (
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
            {filteredLeads.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-6 text-gray-400">Sonuç bulunamadı</td></tr>
            ) : (
              filteredLeads.map(lead => (
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
    </div>
  );
} 