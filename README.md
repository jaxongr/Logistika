# Group AutoPoster Bot

Telegram bot bilan guruhlar uchun avtomatik xabar yuborish tizimi. NestJS, PostgreSQL, Redis va Telegram Mini-App texnologiyalari bilan yaratilgan.

## Xususiyatlar

- 🤖 **Telegram Bot Integration**: Telegram Bot API va Mini-App
- 📝 **Message Composer**: Matn, rasm, video va fayllar uchun xabar yaratish
- 👥 **Group Management**: Guruhlarni tanlash va boshqarish
- ⏰ **Scheduling**: Darhol yoki belgilangan vaqtda yuborish
- 🛡️ **Anti-Spam**: Random delay, flood control, cooldown
- 💰 **Subscription System**: Pullik obuna tizimi
- 🔧 **Admin Panel**: Foydalanuvchilar va to'lovlarni boshqarish
- 🚀 **Docker Support**: Docker Compose bilan deploy

## Texnologiyalar

- **Backend**: NestJS (TypeScript)
- **Database**: PostgreSQL (TypeORM)
- **Queue**: Redis (BullMQ)
- **Frontend**: Vanilla JS (Telegram Mini-App)
- **Deployment**: Docker Compose, Nginx, HTTPS

## 🚀 Tezkor Ishga Tushirish

### Windows uchun (Eng oson):
```bash
# scripts papkasiga o'ting va ishga tushiring
scripts\quick-start.bat
```

### Linux/Mac uchun:
```bash
# Barcha kerakli configuratsiyalar bilan avtomatik setup
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Manual o'rnatish:

1. **Loyihani tayorlash:**
```bash
git clone <repository-url>
cd avtohabarbot
```

2. **Tezkor ishga tushirish:**
```bash
# Environment file allaqachon sozlangan
# Bot token: 8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q

# Docker bilan ishga tushirish
docker-compose up -d --build

# 15 soniya kutib, webhook sozlash
curl -X POST "https://api.telegram.org/bot8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q/setWebhook" \
  -d "url=https://localhost/webhook"
```

3. **Development uchun:**
```bash
chmod +x scripts/start-local.sh
./scripts/start-local.sh
```

## Foydalanish

### Telegram Bot

1. Telegram'da botni toping va `/start` buyrug'ini yuboring
2. "Open App" tugmasini bosing
3. Mini-app ochiladi

### Mini-App

1. **Compose**: Xabar yozish va media yuklash
2. **Groups**: Guruhlarni tanlash
3. **Schedule**: Yuborish vaqtini belgilash
4. **Premium**: Obuna sotib olish

### Admin Panel

Admin panelga kirish: `https://yourdomain.com/admin.html`

- Username: `admin` (default)
- Password: `.env` faylida belgilangan

## Tariflar

- **Bepul**: 10 ta xabar
- **1 kun**: 7,000 so'm
- **1 hafta**: 20,000 so'm  
- **1 oy**: 60,000 so'm

## API Endpoints

### Webhook
- `POST /webhook` - Telegram webhook

### WebApp
- `GET /webapp/user/:telegramId` - Foydalanuvchi ma'lumotlari
- `GET /webapp/groups/:telegramId` - Foydalanuvchi guruhlari
- `POST /webapp/campaign` - Kampaniya yaratish
- `POST /webapp/payment` - To'lov yuklash
- `GET /webapp/subscription/:telegramId` - Obuna holati

### Admin
- `POST /auth/login` - Admin login
- `GET /admin/dashboard` - Dashboard statistikalar
- `GET /users` - Foydalanuvchilar ro'yxati
- `GET /payments` - To'lovlar ro'yxati
- `GET /campaigns` - Kampaniyalar ro'yxati

## Deployment

### Production uchun

1. **SSL Sertifikat**: Let's Encrypt yoki boshqa sertifikat olish
2. **Domain**: Real domain sozlash
3. **Environment**: Production o'zgaruvchilarini sozlash
4. **Backup**: Ma'lumotlar bazasini backup qilish

```bash
# SSL sertifikat (Let's Encrypt)
certbot --nginx -d yourdomain.com

# Backup
docker-compose exec postgres pg_dump -U postgres autoposter_bot > backup.sql
```

### Monitoring

```bash
# Loglarni ko'rish
docker-compose logs -f

# Container statusini tekshirish
docker-compose ps

# Resurslar holati
docker stats
```

## Development

### Local ishga tushirish

```bash
# Dependencies o'rnatish
npm install

# Database ishga tushirish
docker-compose up postgres redis -d

# Migrations
npm run migration:run

# Dev server
npm run start:dev
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Loyiha tuzilishi

```
avtohabarbot/
├── src/
│   ├── admin/              # Admin panel
│   ├── auth/               # Authentication
│   ├── campaign/           # Kampaniya boshqaruvi
│   ├── database/           # Database config
│   ├── group/              # Guruhlar
│   ├── payment/            # To'lovlar
│   ├── queue/              # BullMQ queues
│   ├── subscription/       # Obuna
│   ├── telegram/           # Telegram bot
│   ├── user/               # Foydalanuvchilar
│   └── webapp/             # Mini-app API
├── public/                 # Static files
│   ├── index.html          # Mini-app frontend
│   ├── admin.html          # Admin panel
│   ├── styles.css          # CSS
│   └── app.js              # JavaScript
├── docker-compose.yml      # Docker config
├── Dockerfile              # App container
├── nginx.conf              # Nginx config
└── scripts/deploy.sh       # Deployment script
```

## Xatoliklarni bartaraf etish

### Keng uchraydigan muammolar

1. **Bot webhook ishlamayotgan**
   ```bash
   # Webhook URL tekshirish
   curl -X POST "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```

2. **Database connection**
   ```bash
   # Database holati
   docker-compose exec postgres pg_isready -U postgres
   ```

3. **Redis connection**
   ```bash
   # Redis holati
   docker-compose exec redis redis-cli ping
   ```

## Hissa qo'shish

1. Fork qiling
2. Feature branch yarating (`git checkout -b feature/amazing-feature`)
3. Commit qiling (`git commit -m 'Add amazing feature'`)
4. Branch'ni push qiling (`git push origin feature/amazing-feature`)
5. Pull Request oching

## Litsenziya

MIT License

## Qo'llab-quvvatlash

Muammolar bo'yicha: [Issues](https://github.com/username/avtohabarbot/issues)

---

© 2024 Group AutoPoster Bot. Barcha huquqlar himoyalangan.