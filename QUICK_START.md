# 🚀 Group AutoPoster Bot - Tezkor Ishga Tushirish

Bot token allaqachon sozlangan: `8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q`

## 1️⃣ Windows uchun (1 klik):

```bash
# Faqat shu faylni ishga tushiring
scripts\quick-start.bat
```

Hammasi avtomatik bo'ladi! 🎉

## 2️⃣ Linux/Mac uchun:

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

## 3️⃣ Manual (agar scriptlar ishlamasa):

```bash
# 1. Docker containers ishga tushirish
docker-compose up -d --build

# 2. 15 soniya kutish (database uchun)
sleep 15

# 3. Telegram webhook sozlash
curl -X POST "https://api.telegram.org/bot8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q/setWebhook" \
  -d "url=https://localhost/webhook"
```

## ✅ Tayyor!

**Access pointlar:**
- 🌐 Main App: https://localhost
- 🔧 Admin Panel: https://localhost/admin.html
- 📱 Mini-App: https://localhost/webapp

**Admin login:**
- Username: `admin`
- Password: `admin123`

**Bot Telegram'da:**
- @YourBotUsername (token orqali topishingiz mumkin)
- `/start` buyrug'ini yuboring

## 🔧 Boshqarish:

```bash
# Loglarni ko'rish
docker-compose logs -f

# Restart qilish
docker-compose restart

# To'xtatish
docker-compose down
```

## 🔥 Muhim eslatmalar:

1. **HTTPS**: Self-signed certificate ishlatiladi (browser warning beradi, "Advanced" > "Proceed" bosing)

2. **Webhook**: Agar ishlamasa, qo'lda o'rnating:
   ```bash
   curl -X POST "https://api.telegram.org/bot8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q/setWebhook" -d "url=https://localhost/webhook"
   ```

3. **Database**: PostgreSQL va Redis avtomatik ishga tushadi

4. **Ports**: 80, 443, 3000, 5432, 6379 portlar ishlatiladi

## 🎯 Test qilish:

1. Telegram'da botni toping
2. `/start` yuboring
3. "Open App" tugmasini bosing
4. Mini-app ochilishi kerak
5. Xabar yozib, guruhlarni tanlang
6. Send tugmasini bosing

**Hammasi tayyor! 🚀**