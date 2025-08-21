import { format, addHours, isValid } from "date-fns";

/**
 * Türkiye saati ile tarih oluştur
 * @param date - Opsiyonel tarih, verilmezse şu anki zaman kullanılır
 * @returns Türkiye saati ile ayarlanmış Date objesi
 */
export function getTurkeyDate(date?: Date): Date {
  const now = date || new Date();
  // Türkiye saati için +3 saat ekle
  return addHours(now, 3);
}

/**
 * Tarih string'ini Türkiye saati ile formatla
 * @param dateStr - Formatlanacak tarih string'i
 * @returns Türkçe formatında tarih string'i (dd/MM/yyyy)
 */
export function formatDateTR(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    // Eğer dateStr bir timestamp ise, önce Date objesine çevir
    if (typeof dateStr === 'number' || !isNaN(Number(dateStr))) {
      const date = new Date(Number(dateStr));
      return date.toLocaleDateString('tr-TR');
    }
    
    // Eğer ISO string formatında ise
    if (dateStr.includes('T')) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('tr-TR');
    }
    
    // Eğer yyyy-MM-dd formatında ise
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    }
    
    return dateStr;
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateStr || "";
  }
}

/**
 * Verilen tarih bugün mü kontrol et (Timezone-aware)
 * @param dateStr - Kontrol edilecek tarih string'i
 * @returns true eğer bugün ise, false değilse
 */
export function isTodayTR(dateStr?: string): boolean {
  if (!dateStr) return false;
  try {
    const today = getTurkeyDate();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Eğer dateStr bir timestamp ise
    if (typeof dateStr === 'number' || !isNaN(Number(dateStr))) {
      const date = new Date(Number(dateStr));
      const dateStrFormatted = format(date, 'yyyy-MM-dd');
      return dateStrFormatted === todayStr;
    }
    
    // Eğer ISO string formatında ise
    if (dateStr.includes('T')) {
      const date = new Date(dateStr);
      const dateStrFormatted = format(date, 'yyyy-MM-dd');
      return dateStrFormatted === todayStr;
    }
    
    // Eğer yyyy-MM-dd formatında ise
    if (dateStr.includes('-')) {
      return dateStr === todayStr;
    }
    
    return false;
  } catch (error) {
    console.error('Date comparison error:', error);
    return false;
  }
}

/**
 * Tarih string'ini Türkiye saati ile parse et
 * @param dateStr - Parse edilecek tarih string'i
 * @returns Türkiye saati ile ayarlanmış Date objesi veya null
 */
export function parseTurkeyDate(dateStr: string): Date | null {
  try {
    const date = new Date(dateStr);
    // Eğer tarih geçerliyse, Türkiye saati ile döndür
    if (isValid(date)) {
      return getTurkeyDate(date);
    }
    return null;
  } catch (error) {
    console.error('Date parsing error:', error);
    return null;
  }
}

/**
 * İki tarih arasındaki gün farkını hesapla (Türkiye saati ile)
 * @param date1 - İlk tarih
 * @param date2 - İkinci tarih (opsiyonel, verilmezse bugün)
 * @returns Gün farkı
 */
export function getDaysDifference(date1: Date | string, date2?: Date | string): number {
  try {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = date2 ? (typeof date2 === 'string' ? new Date(date2) : date2) : new Date();
    
    const turkeyDate1 = getTurkeyDate(d1);
    const turkeyDate2 = getTurkeyDate(d2);
    
    const diffTime = turkeyDate1.getTime() - turkeyDate2.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('Days difference calculation error:', error);
    return 0;
  }
}

/**
 * Şu anki ayın başlangıç ve bitiş tarihlerini al (Türkiye saati ile)
 * @returns Ayın başlangıç ve bitiş tarihleri
 */
export function getCurrentMonthDates(): { start: Date; end: Date } {
  const now = getTurkeyDate();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: startOfMonth, end: endOfMonth };
}

/**
 * Geçen ayın başlangıç ve bitiş tarihlerini al (Türkiye saati ile)
 * @returns Geçen ayın başlangıç ve bitiş tarihleri
 */
export function getLastMonthDates(): { start: Date; end: Date } {
  const now = getTurkeyDate();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  return { start: startOfLastMonth, end: endOfLastMonth };
}
