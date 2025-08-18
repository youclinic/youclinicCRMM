const CONVEX_URL = "https://rare-ant-887.convex.site/import-lead";

// Kısa isimleri CRM'deki userId ve tam isimle eşleştir
const SALESPEOPLE = {
  "yunus": { userId: "k17b8r7g0bx4c7re0b5dtt5r8x7jkrde", name: "Yunus Emre Nerez" },
  "sıla": { userId: "k17b247q88xh1671yxd20crqxd7jkgpr", name: "Sıla" },
  "gökmen": { userId: "k17686pdm1q1xgkkb2z8ba3fxd7jk9x7", name: "Gökmen Korap" },
  "elif": { userId: "k1705f7q6spxpdtdn5889j61dn7jk21c", name: "Elif Atabek" },
  "çağla": { userId: "k177j3sekhs6g5dg89nnsnt9417jk61m", name: "Çağla Dişel" },
  "sarah": { userId: "k17fbbry670m97hyd501qh65p17jgbja", name: "sarah johnson" }
};

// İsmi normalize et (küçük harf, boşluksuz)
function normalizeName(name) {
  return String(name).toLowerCase().replace(/\s+/g, "");
}

// Test fonksiyonu - manuel test için
function testLeadImport() {
  Logger.log("=== TEST FONKSİYONU BAŞLATILDI ===");
  
  // Test verisi
  var testPayload = {
    fullName: "Test User",
    phone: 40722763017,
    email: "test@example.com",
    assignedTo: "k17b8r7g0bx4c7re0b5dtt5r8x7jkrde",
    salesPerson: "Yunus Emre Nerez",
    adName: "Test Advertisement",
    notes: "Test notes"
  };
  
  Logger.log("📤 Test Payload: " + JSON.stringify(testPayload, null, 2));
  
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(testPayload),
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(CONVEX_URL, options);
    Logger.log("📡 Test Response Code: " + response.getResponseCode());
    Logger.log("📡 Test Response: " + response.getContentText());
    
    if (response.getResponseCode() === 200) {
      Logger.log("✅ Test başarılı!");
    } else {
      Logger.log("❌ Test başarısız!");
    }
  } catch (err) {
    Logger.log("❌ Test hatası: " + err);
  }
}

function onEditInstallable(e) {
  Logger.log("=== onEdit tetiklendi ===");
  
  if (!e || !e.range || !e.source) {
    Logger.log("❌ Event geçersiz, çıkılıyor");
    return;
  }
  
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  
  Logger.log("📊 Sheet name: " + sheet.getName());
  Logger.log("📊 Range: " + range.getA1Notation());
  Logger.log("📊 NumRows: " + range.getNumRows());
  
  if (!range.getNumRows) {
    Logger.log("❌ Range geçersiz, çıkılıyor");
    return;
  }
  
  for (var i = 0; i < range.getNumRows(); i++) {
    var rowIdx = range.getRow() + i;
    Logger.log("🔄 İşlenen satır: " + rowIdx);
    
    // E, F, G, H sütunlarını oku
    var fullName = sheet.getRange(rowIdx, 5).getValue(); // E sütunu
    var phone = sheet.getRange(rowIdx, 6).getValue(); // F sütunu
    var email = sheet.getRange(rowIdx, 7).getValue(); // G sütunu
    var adName = sheet.getRange(rowIdx, 8).getValue(); // H sütunu
    
    // C ve D sütunlarını oku (sadece notes için)
    var howOld = sheet.getRange(rowIdx, 3).getValue(); // C sütunu
    var hasYourChild = sheet.getRange(rowIdx, 4).getValue(); // D sütunu
    
    Logger.log("📖 Ham veriler:");
    Logger.log("  - fullName (E" + rowIdx + "): '" + fullName + "' (tip: " + typeof fullName + ")");
    Logger.log("  - phone (F" + rowIdx + "): '" + phone + "' (tip: " + typeof phone + ")");
    Logger.log("  - email (G" + rowIdx + "): '" + email + "' (tip: " + typeof email + ")");
    Logger.log("  - adName (H" + rowIdx + "): '" + adName + "' (tip: " + typeof adName + ")");
    Logger.log("  - howOld (C" + rowIdx + "): '" + howOld + "' (tip: " + typeof howOld + ")");
    Logger.log("  - hasYourChild (D" + rowIdx + "): '" + hasYourChild + "' (tip: " + typeof hasYourChild + ")");
    
    // Sayısal değerleri string'e çevir
    if (typeof phone === 'number') {
      phone = phone.toString();
      Logger.log("  🔄 phone string'e çevrildi: '" + phone + "'");
    }
    if (typeof howOld === 'number') {
      howOld = howOld.toString();
      Logger.log("  🔄 howOld string'e çevrildi: '" + howOld + "'");
    }
    if (typeof hasYourChild === 'number') {
      hasYourChild = hasYourChild.toString();
      Logger.log("  🔄 hasYourChild string'e çevrildi: '" + hasYourChild + "'");
    }
    
    // L sütunundan satıcı ismini al ve normalize et
    var salespersonRaw = sheet.getRange(rowIdx, 12).getValue();
    var salespersonKey = normalizeName(salespersonRaw);
    var salesperson = SALESPEOPLE[salespersonKey];
    
    Logger.log("👤 Satıcı bilgileri:");
    Logger.log("  - salespersonRaw (L" + rowIdx + "): '" + salespersonRaw + "'");
    Logger.log("  - salespersonKey: '" + salespersonKey + "'");
    Logger.log("  - salesperson: " + (salesperson ? JSON.stringify(salesperson) : "❌ bulunamadı"));
    
    // Notes alanını oluştur (C ve D sütunlarını dahil et)
    var notes = "";
    if (howOld && howOld !== "undefined" && howOld !== "") {
      notes += "How old is she: " + howOld + ".";
      Logger.log("  📝 howOld notes'a eklendi");
    }
    if (hasYourChild && hasYourChild !== "undefined" && hasYourChild !== "") {
      if (notes) notes += " ";
      notes += "Has your child: " + hasYourChild + ".";
      Logger.log("  📝 hasYourChild notes'a eklendi");
    }
    
    Logger.log("📝 Final notes: '" + notes + "'");
    
    // Eğer gerekli alanlar doluysa, CRM'e gönder
    if (fullName && phone && salesperson) {
      Logger.log("✅ Gerekli alanlar dolu, CRM'e gönderiliyor...");
      
      var payload = {
        fullName: fullName,
        phone: phone,
        email: email || "",
        assignedTo: salesperson.userId,
        salesPerson: salesperson.name,
        adName: adName || "",
        notes: notes
      };
      
      Logger.log("📤 Payload: " + JSON.stringify(payload, null, 2));
      
      try {
        var response = UrlFetchApp.fetch(CONVEX_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          payload: JSON.stringify(payload)
        });
        
        Logger.log("📡 Response Code: " + response.getResponseCode());
        Logger.log("📡 Response: " + response.getContentText());
        
        if (response.getResponseCode() === 200) {
          Logger.log("✅ Lead başarıyla gönderildi: " + fullName);
          // Başarılı gönderim sonrası satırı işaretle (opsiyonel)
          sheet.getRange(rowIdx, 13).setValue("Gönderildi"); // M sütunu
          Logger.log("✅ M sütununa 'Gönderildi' yazıldı");
        } else {
          Logger.log("❌ Hata: " + response.getContentText());
          Logger.log("❌ Response Code: " + response.getResponseCode());
        }
      } catch (error) {
        Logger.log("❌ Hata oluştu: " + error.toString());
        Logger.log("❌ Payload: " + JSON.stringify(payload));
      }
    } else {
      Logger.log("❌ Eksik veri:");
      Logger.log("  - fullName: " + (fullName ? "✅ mevcut" : "❌ eksik"));
      Logger.log("  - phone: " + (phone ? "✅ mevcut" : "❌ eksik"));
      Logger.log("  - salesperson: " + (salesperson ? "✅ mevcut" : "❌ eksik"));
    }
    
    Logger.log("=== Satır işlemi tamamlandı ===");
  }
}
