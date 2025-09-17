# Haydovchi Tracking Ilovasi

Bu ilova haydovchilar uchun mo'ljallangan bo'lib, real vaqtda lokatsiya ma'lumotlarini server ga yuboradi va bot bilan integratsiya qiladi.

## Xususiyatlari

- 📍 Real-time GPS tracking
- 📱 Kontakt ma'lumotlarini olish
- 🔄 Background'da ishlov berish
- 🤖 Bot bilan to'liq integratsiya
- ⚠️ Ilova yopilganda haydovchiga ogohlantirish

## APK yaratish

```bash
# Build script ishga tushirish
build-apk.bat
```

## O'rnatish yo'riqnomasi

1. **APK Build qiling**:
   - `build-apk.bat` faylni ishga tushiring
   - APK fayl `android/app/build/outputs/apk/release/app-release.apk` da yaratiladi

2. **Telefonga o'rnatish**:
   - APK faylni telefoniga ko'chiring
   - Telefondan APK faylni oching
   - "Noma'lum manbalardan o'rnatishga ruxsat" bering
   - Ilovani o'rnating

3. **Sozlash**:
   - Bot orqali berilgan haydovchi ID sini kiriting
   - GPS lokatsiya ruxsatini bering
   - Kontaktlar ruxsatini bering
   - Background ishlov berish ruxsatini bering

4. **Tracking boshlash**:
   - Internet ulanishini yoqing
   - "Boshlash" tugmasini bosing
   - Ilova har 30 soniyada lokatsiya yuboradi

## ⚠️ MUHIM OGOHLANTIRISHLAR

- **Ilovani yopmang!** - Agar ilova yopilsa, bot haydovchiga zakazlar bermaydi
- **Internet doim yoqiq bo'lsin** - Lokatsiya yuborish uchun
- **GPS doim faol bo'lsin** - Aniq lokatsiya uchun
- **Batareya optimallashtiruvini o'chiring** - Ilova to'xtatilmasligi uchun

## Server URL sozlash

`App.js` faylida `SERVER_URL` ni o'zgartiring:

```javascript
const SERVER_URL = 'http://your-server-url.com'; // Bu yerda o'z server URL ni kiriting
```

## Texnik tafsilotlar

- **Platform**: React Native
- **Target SDK**: Android 33
- **Min SDK**: Android 21 (5.0+)
- **Permissions**: GPS, Kontaktlar, Internet, Background
- **Location Interval**: 30 soniya

## Troubleshooting

1. **APK yaratilmaydi**:
   - Java JDK 11+ o'rnatilganligini tekshiring
   - Android SDK o'rnatilganligini tekshiring
   - Node.js va npm o'rnatilganligini tekshiring

2. **Lokatsiya yuborilmaydi**:
   - Internet aloqasini tekshiring
   - GPS ruxsatini tekshiring
   - Server URL to'g'riligini tekshiring

3. **Bot zakazlar bermaydi**:
   - Ilova yopilgan bo'lishi mumkin - qayta oching
   - Haydovchi ID to'g'riligini tekshiring
   - Server bilan ulanishni tekshiring

## Support

Muammolar yuzaga kelsa, bot orqali admin bilan bog'laning.