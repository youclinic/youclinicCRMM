import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function DashboardTab() {
  const stats = useQuery(api.leads.getStats);
  const recentLeads = useQuery(api.leads.getDashboardLeads);

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
    { title: "Cold - GBTU", value: stats.cold, percent: percent(stats.cold), color: "bg-cyan-400" },
    { title: "Hot", value: stats.hot, percent: percent(stats.hot), color: "bg-orange-400" },
    { title: "EWS", value: stats.dead, percent: percent(stats.dead), color: "bg-red-400" },
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

      {/* Calendar Section */}
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Calendar</h2>
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
  consultation1Date?: string;
  consultation2Date?: string;
  consultation3Date?: string;
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
  const followUpMap: Record<string, Array<{name: string, type: 'followup' | 'consultation1' | 'consultation2' | 'consultation3'}>> = {};
  
  for (const lead of leads) {
    // Follow-up tarihleri
    if (lead.nextFollowUpDate) {
      if (!followUpMap[lead.nextFollowUpDate]) followUpMap[lead.nextFollowUpDate] = [];
      followUpMap[lead.nextFollowUpDate].push({
        name: `${lead.firstName} ${lead.lastName}`,
        type: 'followup'
      });
    }
    
    // Consultation tarihleri
    if (lead.consultation1Date) {
      if (!followUpMap[lead.consultation1Date]) followUpMap[lead.consultation1Date] = [];
      followUpMap[lead.consultation1Date].push({
        name: `${lead.firstName} ${lead.lastName}`,
        type: 'consultation1'
      });
    }
    
    if (lead.consultation2Date) {
      if (!followUpMap[lead.consultation2Date]) followUpMap[lead.consultation2Date] = [];
      followUpMap[lead.consultation2Date].push({
        name: `${lead.firstName} ${lead.lastName}`,
        type: 'consultation2'
      });
    }
    
    if (lead.consultation3Date) {
      if (!followUpMap[lead.consultation3Date]) followUpMap[lead.consultation3Date] = [];
      followUpMap[lead.consultation3Date].push({
        name: `${lead.firstName} ${lead.lastName}`,
        type: 'consultation3'
      });
    }
  }
  
  const getEventColor = (type: 'followup' | 'consultation1' | 'consultation2' | 'consultation3') => {
    switch (type) {
      case 'followup':
        return 'bg-blue-100 text-blue-800';
      case 'consultation1':
        return 'bg-green-100 text-green-800';
      case 'consultation2':
        return 'bg-yellow-100 text-yellow-800';
      case 'consultation3':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getEventLabel = (type: 'followup' | 'consultation1' | 'consultation2' | 'consultation3') => {
    switch (type) {
      case 'followup':
        return 'Follow-up';
      case 'consultation1':
        return 'Consultation 1';
      case 'consultation2':
        return 'Consultation 2';
      case 'consultation3':
        return 'Consultation 3';
      default:
        return '';
    }
  };
  
  return (
    <div>
      <div className="text-center text-xl font-bold mb-2 uppercase tracking-wide">{monthName}</div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
          <span className="text-xs text-gray-600">Follow-up</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
          <span className="text-xs text-gray-600">Consultation 1</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span className="text-xs text-gray-600">Consultation 2</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
          <span className="text-xs text-gray-600">Consultation 3</span>
        </div>
      </div>
      
      <div className="grid grid-cols-10 gap-2">
        {days.map((d, idx) => (
          <div key={d.dateStr} className="flex flex-col items-center border rounded-lg p-2 min-h-[80px] bg-white">
            <div className={`mb-2 font-semibold text-gray-700 ${idx === 0 ? 'text-red-600' : ''}`}>{d.day}</div>
            <div className="flex flex-col gap-1 w-full">
              {(followUpMap[d.dateStr] || []).map((event, i) => (
                <div 
                  key={i} 
                  className={`rounded px-2 py-1 text-xs text-center w-full ${getEventColor(event.type)}`}
                  title={`${event.name} - ${getEventLabel(event.type)}`}
                >
                  <div className="font-medium">{event.name}</div>
                  <div className="text-xs opacity-75">{getEventLabel(event.type)}</div>
                </div>
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
