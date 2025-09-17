# 🚚 HAYDOVCHI TRACKER ILOVASI - TO'LIQ YO'RIQNOMA

## 📱 Ilova haqida

Bu maxsus Android ilovasi haydovchilarning real-time lokatsiyasini kuzatish va bot bilan integratsiya qilish uchun yaratilgan. Ilova yordamida haydovchilar:

- ✅ Real vaqtda o'z lokatsiyalarini yuboradi
- ✅ Bot bilan bevosita bog'lanadi
- ✅ Zakaz olish uchun faol holatda turishadi
- ⚠️ Ilovani yopsa, bot zakazlar bermaydi

---

## 🛠 HAYDOVCHI UCHUN O'RNATISH YO'RIQNOMASI

### 1-qadam: APK faylni olish

Administrator sizga APK fayl beradi yoki quyidagi yo'l bilan:
```
android/app/build/outputs/apk/release/app-release.apk
```

### 2-qadam: Telefonga o'rnatish

1. APK faylni telefoniga ko'chiring (USB, Bluetooth yoki cloud orqali)
2. Fayl menejerdan APK faylni toping
3. APK faylga bossangiz "Noma'lum manbalar" haqida ogohlantirish chiqadi
4. **"Sozlamalar"** ga o'ting va **"Noma'lum manbalardan o'rnatishga ruxsat"** ni yoqing
5. Qaytib kelib APK ni o'rnating

### 3-qadam: Ruxsatlar berish

Ilova ochilganda quyidagi ruxsatlarni so'raydi:

- 📍 **GPS Lokatsiya** - MAJBURIY! (Faol va background ham)
- 📱 **Kontaktlarni o'qish** - MAJBURIY!
- 🌐 **Internet** - MAJBURIY!
- 🔄 **Background ishlov** - MAJBURIY!

**BARCHA RUXSATLARNI BERING!** Aks holda ilova ishlamaydi.

### 4-qadam: Haydovchi ID ni kiriting

1. Bot orqali **ro'yxatdan o'ting**
2. Bot sizga **maxsus ID** beradi
3. Ilovani ochib bu **ID ni kiriting**
4. ID saqlangandan so'ng tracking ishlay boshlaydi

### 5-qadam: Tracking boshlash

1. **Internetni yoqing** (WiFi yoki mobile data)
2. **GPS ni yoqing**
3. Ilovada **"Boshlash"** tugmasini bosing
4. Ilova har **30 soniyada** lokatsiya yuboradi

---

## ⚠️ MUHIM OGOHLANTIRISHLAR

### 🚨 ILOVANI YOPMANG!

- Agar ilovani yopsangiz, bot sizga **ZAKAZLAR BERMAYDI**
- Har doim ilovani **background-da** ochiq qoldiring
- Telefon ekrani o'chib tursa ham ilova ishlaydi

### 🔋 Batareya sozlamalari

Android telefonlarda batareya tejash uchun ilovani to'xtatishi mumkin:

**Samsung telefonlarda:**
1. Sozlamalar → Ilova va bildirishnomalar
2. Haydovchi Tracker ilovasini toping
3. Batareya → Batareya optimallashtiruvini o'chiring
4. "Har doim faol" holatini yoqing

**Xiaomi telefonlarda:**
1. Sozlamalar → Ilovalar → Ilovalarni boshqarish
2. Haydovchi Tracker → Batareya tejash
3. "Cheklovsiz" holatini tanlang

**Huawei telefonlarda:**
1. Sozlamalar → Batareya → Ishga tushirish
2. Haydovchi Tracker ilovasini toping
3. "Qo'lda boshqarish" ni yoqing va barcha ruxsatlarni bering

---

## 📊 ILOVA INTERFEYSI

### Bosh ekran ma'lumotlari:

- **Haydovchi ID:** Sizning noyob ID raqamingiz
- **Holat:** 🟢 Faol / 🔴 Nofaol
- **Oxirgi lokatsiya:** Eng so'nggi yuborilgan GPS koordinatlari
- **Vaqt:** Oxirgi yangilanish vaqti

### Tugmalar:

- 🟢 **Boshlash** - Tracking ni ishga tushirish
- 🔴 **To'xtatish** - Tracking ni to'xtatish (TAVSIYA ETILMAYDI!)
- 🔧 **ID o'zgartirish** - Yangi haydovchi ID kiritish

---

## 🆘 MUAMMOLARNI TUZATISH

### ❌ "Lokatsiya yuborilmaydi"

**Tekshiring:**
- Internet aloqasi bor-yo'qligini
- GPS yoqilganligini
- Ilova ruxsatlari berilganligini
- Server bilan aloqa borligini

**Yechim:**
1. Telefonni qayta ishga tushiring
2. GPS ni o'chib-yoqing
3. Ilovani qayta oching
4. Internetni tekshiring

### ❌ "Bot zakazlar bermaydi"

**Sabablari:**
- Ilova yopiq bo'lishi mumkin
- Lokatsiya yuborilmayotgani
- Haydovchi ID noto'g'ri kiritilgani
- Internet aloqasi uzilgani

**Yechim:**
1. Ilovani tekshiring - ochiqmi?
2. Tracking faolmi - yashil rangdami?
3. ID to'g'riligini tekshiring
4. Bot orqali admin bilan bog'laning

### ❌ "Ilova tez-tez yopiladi"

**Yechim:**
1. Batareya optimallashtiruvini o'chiring
2. "Har doim faol" holatini yoqing
3. RAM tozalagichlardan ilovani istisno qiling
4. Background'da ishlash ruxsatini bering

---

## 🔧 ADMINISTRATOR UCHUN

### APK yaratish:

```bash
cd driver-tracker-app
build-apk.bat
```

### Server URL o'zgartirish:

`App.js` faylida:
```javascript
const SERVER_URL = 'http://your-server-url.com';
```

### API endpointlar:

- `POST /api/dashboard/driver/location` - Lokatsiya qabul qilish
- `POST /api/dashboard/driver/contacts` - Kontaktlar qabul qilish
- `GET /api/dashboard/driver/check/:driverId` - Haydovchi holatini tekshirish

---

## 📞 YORDAM

**Muammolar bo'lsa:**
1. Bot orqali admin bilan bog'laning
2. Telegram: @admin_username
3. Telefon: +998 XX XXX XX XX

**Tez-tez so'raladigan savollar:**

**S: Nima uchun batareya tez tugaydi?**
J: GPS va background tracking batareya sarflaydi. Power bank ishlating yoki avtomobildan quvvat oling.

**S: Qancha internet trafik sarflaydi?**
J: Juda kam - kuniga taxminan 5-10 MB.

**S: Bir necha haydovchi bir telefondan foydalanishi mumkinmi?**
J: Yo'q, har bir haydovchi o'z telefonidan foydalanishi kerak.

**S: Ilova bepulmi?**
J: Ha, haydovchilar uchun mutlaqo bepul.

---

## 🏁 XULOSA

Bu ilova sizning ish faoliyatingizni yaxshilash va ko'proq zakaz olish uchun ishlab chiqilgan. To'g'ri foydalansangiz:

✅ Ko'proq zakaz olasiz
✅ Mijozlar sizni oson topadi
✅ Ish jarayoni avtomatlashadi
✅ Vaqt va kuch tejaysiz

**E'tibor bering:** Faqat ilovani yopmay, internetni yoqib, GPS faol holda qoldiring!

---

*Haydovchi Tracker v1.0 - Bot integratsiyasi bilan*