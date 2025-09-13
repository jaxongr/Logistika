# Yo'lda Driver App

Professional Android mobile application for drivers in the Yo'lda logistics platform.

## Features

### ✅ Completed Features

- **Professional Yandex Go-level Design** - Modern, intuitive UI/UX
- **Real-time Location Tracking** - GPS-based location services
- **Live Order Sync** - Real-time order notifications from the bot
- **Professional Navigation** - Integrated maps with route planning
- **Driver Status Management** - Online/Offline/Busy status control
- **Order Management** - Accept/Decline orders with detailed information
- **Socket Integration** - Real-time communication with the bot server

### 🔧 Technical Stack

- **React Native 0.72+** - Cross-platform framework
- **TypeScript** - Type-safe development
- **Socket.IO** - Real-time communication
- **React Navigation** - Professional navigation
- **React Native Maps** - Google Maps integration
- **Location Services** - Background location tracking
- **Push Notifications** - Order alerts and updates
- **Linear Gradients** - Modern UI effects

### 📱 Screens

1. **SplashScreen** - Beautiful animated loading screen
2. **LoginScreen** - Phone number authentication
3. **HomeScreen** - Main dashboard with orders
4. **MapScreen** - Professional navigation interface
5. **ProfileScreen** - Driver profile management
6. **OrderDetailsScreen** - Detailed order information
7. **OrderHistoryScreen** - Past orders history

### 🔗 Bot Integration

The app seamlessly integrates with the Telegram bot system:

- **API Endpoints** - RESTful API for data exchange
- **Socket Communication** - Real-time order updates
- **Driver Authentication** - Login with registered phone number
- **Order Synchronization** - Orders from bot appear instantly in app
- **Status Updates** - Driver availability synced with bot

## Installation

### Prerequisites

- Node.js 16+
- React Native CLI
- Android Studio
- Java JDK 11+

### Setup

1. **Install Dependencies**
   ```bash
   cd android-driver-app
   npm install
   ```

2. **Android Setup**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

3. **Run Development**
   ```bash
   npm run start
   npm run android
   ```

4. **Build Release**
   ```bash
   npm run build
   ```

## API Integration

### Base Configuration

The app connects to the bot server at `http://localhost:3000` by default.

Update `src/services/ApiService.ts` to change the server URL.

### Authentication

- Login with phone number registered in the bot
- Token-based authentication
- Automatic session management

### Real-time Features

- Socket.IO connection to bot server
- Live order notifications
- Real-time location updates
- Driver status synchronization

## Permissions

### Required Android Permissions

- `ACCESS_FINE_LOCATION` - GPS location
- `ACCESS_COARSE_LOCATION` - Network location
- `ACCESS_BACKGROUND_LOCATION` - Background tracking
- `INTERNET` - Network communication
- `VIBRATE` - Notification vibration
- `WAKE_LOCK` - Keep app active

## Professional Features

### Yandex Go-Level Design

- **Modern Material Design** - Clean, professional interface
- **Smooth Animations** - Fluid transitions and interactions
- **Gradient Backgrounds** - Beautiful visual effects
- **Professional Typography** - Clear, readable text
- **Intuitive Navigation** - Easy-to-use interface

### Advanced Location Services

- **High-Accuracy GPS** - Precise location tracking
- **Background Tracking** - Location updates when app is closed
- **Battery Optimization** - Efficient location management
- **Route Calculation** - Distance and time estimation

### Real-time Communication

- **Instant Notifications** - New orders appear immediately
- **Socket Integration** - Live connection to bot
- **Sound Alerts** - Audio notifications for new orders
- **Status Sync** - Real-time status updates

## Development Status

### ✅ Completed
- Mobile app architecture
- Professional UI/UX design
- Real-time location tracking
- Socket communication
- Bot integration
- API endpoints
- Professional screens
- Build configuration

### 🚀 Ready for Production
The app is production-ready with all core features implemented and thoroughly tested.

## Build Configuration

### Development Build
```bash
npm run android
```

### Production Build
```bash
cd android
./gradlew assembleRelease
```

The APK will be generated at:
`android/app/build/outputs/apk/release/app-release.apk`

## Support

For technical support or questions:
- Bot: @YoldaLogisticsBot
- Email: support@yolda.uz

---

**© 2025 Yo'lda - Professional Logistics Platform**