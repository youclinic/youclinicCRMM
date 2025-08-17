import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function DashboardTab() {
  const stats = useQuery(api.leads.getStats);
  const recentLeads = useQuery(api.leads.getDashboardLeads);
  const todayEvents = useQuery(api.calendar.getToday);

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

      {/* Today's Events Section */}
      {todayEvents && todayEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bugünkü Görevler</h2>
          <div className="space-y-3">
            {todayEvents.map((event) => (
              <div
                key={event._id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  event.isCompleted ? "bg-gray-50" : "bg-blue-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    event.priority === "high" ? "bg-red-500" :
                    event.priority === "medium" ? "bg-yellow-500" : "bg-green-500"
                  }`}></div>
                  <div>
                    <div className={`font-medium ${event.isCompleted ? "line-through text-gray-500" : ""}`}>
                      {event.title}
                    </div>
                    {event.description && (
                      <div className="text-sm text-gray-600">{event.description}</div>
                    )}
                    {event.eventTime && (
                      <div className="text-sm text-gray-500">{event.eventTime}</div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {event.priority === "high" ? "Yüksek" :
                   event.priority === "medium" ? "Orta" : "Düşük"} Öncelik
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Section */}
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Calendar</h2>
        <TenDayFollowUpCalendar leads={recentLeads} />
      </div>

      {/* Consultation Tracking Section */}
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Consultation Tracking</h2>
        <ConsultationTracking leads={recentLeads} />
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
  consultation4Date?: string;
  consultation1Status?: "scheduled" | "completed" | "cancelled" | "no_show";
  consultation2Status?: "scheduled" | "completed" | "cancelled" | "no_show";
  consultation3Status?: "scheduled" | "completed" | "cancelled" | "no_show";
  consultation4Status?: "scheduled" | "completed" | "cancelled" | "no_show";
  consultation1Notes?: string;
  consultation2Notes?: string;
  consultation3Notes?: string;
  consultation4Notes?: string;
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
  const followUpMap: Record<string, Array<{name: string, type: 'followup' | 'consultation1' | 'consultation2' | 'consultation3' | 'consultation4'}>> = {};
  
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
    
    if (lead.consultation4Date) {
      if (!followUpMap[lead.consultation4Date]) followUpMap[lead.consultation4Date] = [];
      followUpMap[lead.consultation4Date].push({
        name: `${lead.firstName} ${lead.lastName}`,
        type: 'consultation4'
      });
    }
  }
  
  const getEventColor = (type: 'followup' | 'consultation1' | 'consultation2' | 'consultation3' | 'consultation4') => {
    switch (type) {
      case 'followup':
        return 'bg-blue-100 text-blue-800';
      case 'consultation1':
        return 'bg-green-100 text-green-800';
      case 'consultation2':
        return 'bg-yellow-100 text-yellow-800';
      case 'consultation3':
        return 'bg-purple-100 text-purple-800';
      case 'consultation4':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getEventLabel = (type: 'followup' | 'consultation1' | 'consultation2' | 'consultation3' | 'consultation4') => {
    switch (type) {
      case 'followup':
        return 'Follow-up';
      case 'consultation1':
        return 'Consultation 1';
      case 'consultation2':
        return 'Consultation 2';
      case 'consultation3':
        return 'Consultation 3';
      case 'consultation4':
        return 'Consultation 4';
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
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-indigo-100 border border-indigo-300 rounded"></div>
          <span className="text-xs text-gray-600">Consultation 4</span>
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
                  className={`rounded px-2 py-1 text-xs text-center w-full ${getEventColor(event.type as any)}`}
                  title={`${event.name} - ${getEventLabel(event.type as any)}`}
                >
                  <div className="font-medium">{event.name}</div>
                  <div className="text-xs opacity-75">{getEventLabel(event.type as any)}</div>
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

function ConsultationTracking({ leads }: { leads: Lead[] }) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Get patients with consultations
  const patientsWithConsultations = leads.filter(lead => 
    lead.consultation1Date || lead.consultation2Date || lead.consultation3Date || lead.consultation4Date
  );

  // Get upcoming consultations (next 7 days)
  const upcomingConsultations = patientsWithConsultations.filter(patient => {
    const consultations = [
      { date: patient.consultation1Date, status: patient.consultation1Status },
      { date: patient.consultation2Date, status: patient.consultation2Status },
      { date: patient.consultation3Date, status: patient.consultation3Status },
      { date: patient.consultation4Date, status: patient.consultation4Status }
    ];
    
    return consultations.some(consultation => {
      if (!consultation.date) return false;
      const consultationDate = new Date(consultation.date);
      const diffTime = consultationDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7 && consultation.status !== 'completed';
    });
  });

  // Get today's consultations
  const todaysConsultations = patientsWithConsultations.filter(patient => {
    const consultations = [
      { date: patient.consultation1Date, status: patient.consultation1Status },
      { date: patient.consultation2Date, status: patient.consultation2Status },
      { date: patient.consultation3Date, status: patient.consultation3Status },
      { date: patient.consultation4Date, status: patient.consultation4Status }
    ];
    
    return consultations.some(consultation => {
      if (!consultation.date) return false;
      const consultationDate = new Date(consultation.date);
      return consultationDate.toDateString() === today.toDateString() && consultation.status !== 'completed';
    });
  });

  // Get completed consultations this month
  const completedThisMonth = patientsWithConsultations.filter(patient => {
    const consultations = [
      { date: patient.consultation1Date, status: patient.consultation1Status },
      { date: patient.consultation2Date, status: patient.consultation2Status },
      { date: patient.consultation3Date, status: patient.consultation3Status },
      { date: patient.consultation4Date, status: patient.consultation4Status }
    ];
    
    return consultations.some(consultation => {
      if (!consultation.date || consultation.status !== 'completed') return false;
      const consultationDate = new Date(consultation.date);
      return consultationDate.getMonth() === today.getMonth() && consultationDate.getFullYear() === today.getFullYear();
    });
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800">Today's Consultations</h3>
          <p className="text-2xl font-bold text-blue-900">{todaysConsultations.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-800">Upcoming (7 days)</h3>
          <p className="text-2xl font-bold text-green-900">{upcomingConsultations.length}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-purple-800">Completed This Month</h3>
          <p className="text-2xl font-bold text-purple-900">{completedThisMonth.length}</p>
        </div>
      </div>

      {/* Today's Consultations */}
      {todaysConsultations.length > 0 && (
        <div>
          <h3 className="text-md font-semibold text-gray-900 mb-3">Today's Consultations</h3>
          <div className="space-y-2">
            {todaysConsultations.map(patient => {
              const consultations = [
                { date: patient.consultation1Date, status: patient.consultation1Status, number: 1 },
                { date: patient.consultation2Date, status: patient.consultation2Status, number: 2 },
                { date: patient.consultation3Date, status: patient.consultation3Status, number: 3 },
                { date: patient.consultation4Date, status: patient.consultation4Status, number: 4 }
              ].filter(c => c.date && new Date(c.date).toDateString() === today.toDateString() && c.status !== 'completed');
              
              return consultations.map(consultation => (
                <div key={`${patient._id}-${consultation.number}`} className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{patient.firstName} {patient.lastName}</p>
                      <p className="text-sm text-gray-600">Consultation {consultation.number}</p>
                    </div>
                    <span className="text-sm text-yellow-800 font-medium">TODAY</span>
                  </div>
                </div>
              ));
            })}
          </div>
        </div>
      )}

      {/* Upcoming Consultations */}
      {upcomingConsultations.length > 0 && (
        <div>
          <h3 className="text-md font-semibold text-gray-900 mb-3">Upcoming Consultations</h3>
          <div className="space-y-2">
            {upcomingConsultations.slice(0, 5).map(patient => {
              const consultations = [
                { date: patient.consultation1Date, status: patient.consultation1Status, number: 1 },
                { date: patient.consultation2Date, status: patient.consultation2Status, number: 2 },
                { date: patient.consultation3Date, status: patient.consultation3Status, number: 3 },
                { date: patient.consultation4Date, status: patient.consultation4Status, number: 4 }
              ].filter(c => {
                if (!c.date || c.status === 'completed') return false;
                const consultationDate = new Date(c.date);
                const diffTime = consultationDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays > 0 && diffDays <= 7;
              });
              
              return consultations.map(consultation => {
                const consultationDate = new Date(consultation.date!);
                const diffTime = consultationDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={`${patient._id}-${consultation.number}`} className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{patient.firstName} {patient.lastName}</p>
                        <p className="text-sm text-gray-600">
                          Consultation {consultation.number} - {consultationDate.toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <span className="text-sm text-blue-800 font-medium">
                        {diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`}
                      </span>
                    </div>
                  </div>
                );
              });
            })}
          </div>
        </div>
      )}
    </div>
  );
}
