import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function DashboardTab() {
  const stats = useQuery(api.leads.getStats);
  const recentLeads = useQuery(api.leads.list);

  if (stats === undefined || recentLeads === undefined) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate percentages
  const percent = (count: number) =>
    stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : "0.0";

  const statCards = [
    { title: "Total Leads", value: stats.total, color: "bg-blue-500" },
    { title: "New Lead", value: stats.new_lead, percent: percent(stats.new_lead), color: "bg-green-500" },
    { title: "No Whatsapp", value: stats.no_whatsapp, percent: percent(stats.no_whatsapp), color: "bg-gray-400" },
    { title: "On Follow-up", value: stats.on_follow_up, percent: percent(stats.on_follow_up), color: "bg-blue-300" },
    { title: "Live", value: stats.live, percent: percent(stats.live), color: "bg-green-400" },
    { title: "Passive Live", value: stats.passive_live, percent: percent(stats.passive_live), color: "bg-blue-200" },
    { title: "Cold", value: stats.cold, percent: percent(stats.cold), color: "bg-cyan-400" },
    { title: "Hot", value: stats.hot, percent: percent(stats.hot), color: "bg-orange-400" },
    { title: "Dead", value: stats.dead, percent: percent(stats.dead), color: "bg-red-400" },
    { title: "No Communication", value: stats.no_communication, percent: percent(stats.no_communication), color: "bg-gray-500" },
    { title: "No interest", value: stats.no_interest, percent: percent(stats.no_interest), color: "bg-gray-600" },
    { title: "Sold", value: stats.sold, percent: percent(stats.sold), color: "bg-purple-500" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow min-w-[140px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">{stat.title}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                {stat.percent !== undefined && (
                  <p className="text-xs text-gray-500">{stat.percent}% of total</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Section (replaces Recent Leads) */}
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Follow-up Calendar</h2>
        <TenDayFollowUpCalendar leads={recentLeads} />
      </div>
    </div>
  );
}

interface Lead {
  _id: Id<"leads">;
  firstName: string;
  lastName: string;
  nextFollowUpDate?: string;
}

function TenDayFollowUpCalendar({ leads }: { leads: Lead[] }) {
  const today = new Date();
  // Günleri ve ayı oluştur
  const days: { date: Date; dateStr: string; day: number; month: number; year: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      date: d,
      dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      day: d.getDate(),
      month: d.getMonth(),
      year: d.getFullYear(),
    });
  }
  // Ay adını Türkçe göster
  const monthName = days[0].date.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
  // Her gün için isimleri bul
  const followUpMap: Record<string, string[]> = {};
  for (const lead of leads) {
    if (lead.nextFollowUpDate) {
      if (!followUpMap[lead.nextFollowUpDate]) followUpMap[lead.nextFollowUpDate] = [];
      followUpMap[lead.nextFollowUpDate].push(`${lead.firstName} ${lead.lastName}`);
    }
  }
  return (
    <div>
      <div className="text-center text-xl font-bold mb-2 uppercase tracking-wide">{monthName}</div>
      <div className="grid grid-cols-10 gap-2">
        {days.map((d, idx) => (
          <div key={d.dateStr} className="flex flex-col items-center border rounded-lg p-2 min-h-[80px] bg-white">
            <div className={`mb-2 font-semibold text-gray-700 ${idx === 0 ? 'text-red-600' : ''}`}>{d.day}</div>
            <div className="flex flex-col gap-1 w-full">
              {(followUpMap[d.dateStr] || []).map((name, i) => (
                <div key={i} className="bg-blue-100 rounded px-2 py-1 text-xs text-center w-full">{name}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
