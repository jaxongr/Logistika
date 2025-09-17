# 🚛 HAYDOVCHI TRACKER - SERVER DEPLOYMENT

## 📦 KERAKLI FAYLLAR

### 🗂️ Backend Files
- `dist/` - Build qilingan backend kodi
- `package.json` - Dependencies
- `node_modules/` - Packages (yoki `npm install` orqali)
- `src/public/` - Static files va APK
- `uploads/` - Media files
- `user-data.json` - Database file

### ⚙️ Configuration Files
- `.env` - Environment variables
- `docker-compose.yml` - Docker config (ixtiyoriy)

## 🌐 SERVER REQUIREMENTS

### System Requirements
- **OS:** Ubuntu 20.04+ / CentOS 7+
- **Node.js:** v16+
- **NPM:** v8+
- **Memory:** 1GB RAM minimum
- **Storage:** 5GB minimum

### Portlar
- **3004** - Main server
- **80/443** - Nginx (ixtiyoriy)

## 🚀 DEPLOYMENT QADAMLARI

### 1. Serverga ulanish
```bash
ssh root@SERVER_IP
```

### 2. Node.js o'rnatish
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
```

### 3. Proyektni yuklash
```bash
mkdir /opt/haydovchi-tracker
cd /opt/haydovchi-tracker
```

### 4. Fayllarni ko'chirish
- `dist/` papkasini serverga yuklang
- `package.json` ni yuklang
- `src/public/` ni yuklang
- `user-data.json` ni yuklang

### 5. Dependencies o'rnatish
```bash
npm install --production
```

### 6. Environment o'rnatish
```bash
export NODE_ENV=production
export PORT=3004
export BOT_TOKEN="8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q"
```

### 7. Serverni ishga tushirish
```bash
node dist/main.js
```

### 8. PM2 bilan avtomatik ishga tushirish
```bash
npm install -g pm2
pm2 start dist/main.js --name "haydovchi-tracker"
pm2 startup
pm2 save
```

## 🔧 NGINX KONFIGURATSIYASI (Ixtiyoriy)

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN.COM;

    location / {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📱 APK KONFIGURATSIYASI

APK ichidagi server URLini o'zgartiring:
- Fayl: `src/services/api.js`
- O'zgartiring: `http://localhost:3004` → `http://YOUR_SERVER_IP:3004`

## 🔒 XAVFSIZLIK

### Firewall
```bash
ufw allow 3004
ufw allow 22
ufw enable
```

### SSL Certificate (Ixtiyoriy)
```bash
certbot --nginx -d YOUR_DOMAIN.COM
```

## 📊 MONITORING

### Log ko'rish
```bash
pm2 logs haydovchi-tracker
```

### Status tekshirish
```bash
pm2 status
```

### Qayta ishga tushirish
```bash
pm2 restart haydovchi-tracker
```

## 🔗 ACCESS POINTS

- **Dashboard:** http://YOUR_SERVER_IP:3004/dashboard
- **APK Download:** http://YOUR_SERVER_IP:3004/yolda-driver.apk
- **API:** http://YOUR_SERVER_IP:3004/api

## 📞 TELEGRAM BOT WEBHOOK

Bot webhookini yangi serverga o'rnatish:
```bash
curl -X POST "https://api.telegram.org/bot8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q/setWebhook" \
-H "Content-Type: application/json" \
-d '{"url": "http://YOUR_SERVER_IP:3004/webhook"}'
```

---

**SERVER IP VA LOGIN MA'LUMOTLARINI BERING - HAMMANI O'RNATIB BERAMAN!** 🚀