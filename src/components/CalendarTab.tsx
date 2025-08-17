import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { format, parse, isValid, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar, Plus, Edit, Trash2, Check, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface CalendarEvent {
  _id: Id<"calendarEvents">;
  title: string;
  description?: string;
  eventDate: string;
  eventTime?: string;
  isCompleted: boolean;
  priority: "low" | "medium" | "high";
  createdAt: number;
  updatedAt: number;
}

export function CalendarTab() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    eventDate: "",
    eventTime: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  // Queries
  const events = useQuery(api.calendar.list, {
    startDate: format(startOfMonth(currentDate), "yyyy-MM-dd"),
    endDate: format(endOfMonth(currentDate), "yyyy-MM-dd"),
  });
  const todayEvents = useQuery(api.calendar.getToday);
  const stats = useQuery(api.calendar.getStats);

  // Mutations
  const createEvent = useMutation(api.calendar.create);
  const updateEvent = useMutation(api.calendar.update);
  const markCompleted = useMutation(api.calendar.markCompleted);
  const removeEvent = useMutation(api.calendar.remove);

  // Takvim günlerini oluştur - Ayın ilk haftasının pazartesi gününden başla
  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  
  // Ayın ilk gününün haftanın hangi günü olduğunu bul (0 = Pazar, 1 = Pazartesi, ...)
  const firstDayWeekday = firstDayOfMonth.getDay();
  
  // Takvimin başlangıç günü: Ayın ilk gününden önceki pazartesi
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(firstDayOfMonth.getDate() - (firstDayWeekday === 0 ? 6 : firstDayWeekday - 1));
  
  // Takvimin bitiş günü: Ayın son gününden sonraki pazar
  const lastDayWeekday = lastDayOfMonth.getDay();
  const endDate = new Date(lastDayOfMonth);
  endDate.setDate(lastDayOfMonth.getDate() + (lastDayWeekday === 0 ? 0 : 7 - lastDayWeekday));
  
  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  // Belirli bir gündeki etkinlikleri getir
  const getEventsForDate = (date: Date) => {
    if (!events) return [];
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter(event => event.eventDate === dateStr);
  };

  // Öncelik rengini getir
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-100";
      case "medium": return "text-yellow-600 bg-yellow-100";
      case "low": return "text-green-600 bg-green-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  // Öncelik ikonunu getir
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return <AlertTriangle className="w-3 h-3" />;
      case "medium": return <Clock className="w-3 h-3" />;
      case "low": return <CheckCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  // Form temizle
  const resetForm = () => {
    setEventForm({
      title: "",
      description: "",
      eventDate: "",
      eventTime: "",
      priority: "medium",
    });
    setEditingEvent(null);
  };

  // Modal aç
  const openEventModal = (date?: Date) => {
    if (date) {
      setEventForm(prev => ({
        ...prev,
        eventDate: format(date, "yyyy-MM-dd"),
      }));
      setSelectedDate(date);
    }
    setShowEventModal(true);
  };

  // Modal kapat
  const closeEventModal = () => {
    setShowEventModal(false);
    resetForm();
    setSelectedDate(null);
  };

  // Etkinlik oluştur/güncelle
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventForm.title.trim()) {
      toast.error("Etkinlik başlığı gereklidir");
      return;
    }

    if (!eventForm.eventDate) {
      toast.error("Etkinlik tarihi gereklidir");
      return;
    }

    try {
      if (editingEvent) {
        await updateEvent({
          id: editingEvent._id,
          ...eventForm,
        });
        toast.success("Etkinlik güncellendi!");
      } else {
        await createEvent(eventForm);
        toast.success("Etkinlik oluşturuldu!");
      }
      closeEventModal();
    } catch (error) {
      toast.error("Bir hata oluştu");
      console.error(error);
    }
  };

  // Etkinlik düzenle
  const handleEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || "",
      eventDate: event.eventDate,
      eventTime: event.eventTime || "",
      priority: event.priority,
    });
    setShowEventModal(true);
  };

  // Etkinlik sil
  const handleDelete = async (eventId: Id<"calendarEvents">) => {
    if (confirm("Bu etkinliği silmek istediğinizden emin misiniz?")) {
      try {
        await removeEvent({ id: eventId });
        toast.success("Etkinlik silindi!");
      } catch (error) {
        toast.error("Bir hata oluştu");
      }
    }
  };

  // Etkinlik tamamlandı olarak işaretle
  const handleToggleComplete = async (eventId: Id<"calendarEvents">, isCompleted: boolean) => {
    try {
      await markCompleted({ id: eventId, isCompleted: !isCompleted });
      toast.success(isCompleted ? "Etkinlik tamamlanmadı olarak işaretlendi" : "Etkinlik tamamlandı!");
    } catch (error) {
      toast.error("Bir hata oluştu");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Takvim</h2>
        <button
          onClick={() => openEventModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Etkinlik
        </button>
      </div>

      {/* İstatistikler */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Bugün</div>
            <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Bekleyen</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Tamamlanan</div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Yüksek Öncelik</div>
            <div className="text-2xl font-bold text-red-600">{stats.highPriority}</div>
          </div>
        </div>
      )}

      {/* Bugünkü etkinlikler */}
      {todayEvents && todayEvents.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-3">Bugünkü Etkinlikler</h3>
          <div className="space-y-2">
            {todayEvents.map((event) => (
              <div
                key={event._id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  event.isCompleted ? "bg-gray-50" : "bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleComplete(event._id, event.isCompleted)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      event.isCompleted
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300"
                    }`}
                  >
                    {event.isCompleted && <Check className="w-3 h-3" />}
                  </button>
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
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(event.priority)}`}>
                    {getPriorityIcon(event.priority)}
                  </span>
                  <button
                    onClick={() => handleEdit(event)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(event._id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Takvim */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex items-center justify-between p-4 border-b">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded"
          >
            ←
          </button>
          <h3 className="text-lg font-semibold">
            {format(currentDate, "MMMM yyyy", { locale: tr })}
          </h3>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {/* Gün başlıkları */}
          {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => (
            <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}

          {/* Takvim günleri */}
          {calendarDays.map((day) => {
            const dayEvents = getEventsForDate(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={day.toString()}
                className={`min-h-[100px] p-2 cursor-pointer hover:bg-gray-50 ${
                  isToday ? "bg-blue-50 border-2 border-blue-200" : ""
                } ${!isCurrentMonth ? "bg-gray-100 text-gray-400" : "bg-white"}`}
                onClick={() => openEventModal(day)}
              >
                <div className={`text-sm font-medium mb-1 ${!isCurrentMonth ? "text-gray-400" : ""}`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event._id}
                      className={`text-xs p-1 rounded truncate ${
                        event.isCompleted
                          ? "bg-gray-200 text-gray-500 line-through"
                          : getPriorityColor(event.priority)
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(event);
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{dayEvents.length - 3} daha
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Etkinlik Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingEvent ? "Etkinlik Düzenle" : "Yeni Etkinlik"}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Başlık *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Örn: Maryam'ı Ara"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Etkinlik detayları..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tarih *
                  </label>
                  <input
                    type="date"
                    value={eventForm.eventDate}
                    onChange={(e) => setEventForm(prev => ({ ...prev, eventDate: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Saat
                  </label>
                  <input
                    type="time"
                    value={eventForm.eventTime}
                    onChange={(e) => setEventForm(prev => ({ ...prev, eventTime: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Öncelik
                </label>
                <select
                  value={eventForm.priority}
                  onChange={(e) => setEventForm(prev => ({ ...prev, priority: e.target.value as "low" | "medium" | "high" }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Düşük</option>
                  <option value="medium">Orta</option>
                  <option value="high">Yüksek</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingEvent ? "Güncelle" : "Oluştur"}
                </button>
                <button
                  type="button"
                  onClick={closeEventModal}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
