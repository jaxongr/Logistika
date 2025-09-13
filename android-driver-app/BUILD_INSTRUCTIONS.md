# 📱 Yo'lda Driver APK Build Instructions

## 🚀 APK yasash yo'riqnomasi

### 1. Talab qilinadigan dasturlar

Windows uchun kerakli dasturlar:
- **Node.js 16+** - https://nodejs.org/
- **Java JDK 11+** - https://adoptium.net/
- **Android Studio** - https://developer.android.com/studio
- **React Native CLI** - `npm install -g react-native-cli`

### 2. Android Studio sozlash

1. Android Studio ni o'rnating
2. SDK Manager da quyidagilarni o'rnating:
   - Android SDK Platform 33
   - Android SDK Build-Tools 33.0.0
   - Android SDK Platform-Tools
   - Android SDK Tools

3. Environment variables ni sozlang:
   ```
   ANDROID_HOME = C:\Users\%USERNAME%\AppData\Local\Android\Sdk
   JAVA_HOME = C:\Program Files\Eclipse Adoptium\jdk-11.x.x-hotspot
   ```

### 3. APK yasash jarayoni

#### Usul 1: Avtomatik build
```bash
cd android-driver-app
.\build-apk.bat
```

#### Usul 2: Qo'lda build
```bash
# 1. Dependencies o'rnatish
cd android-driver-app
npm install

# 2. Android project uchun
cd android

# 3. APK yasash
gradlew assembleRelease
```

### 4. APK joylashuvi

Build muvaffaqiyatli bo'lgandan keyin APK quyida joylashadi:
```
android-driver-app/android/app/build/outputs/apk/release/app-release.apk
```

### 5. APK test qilish

APK ni Android telefonga o'rnatish uchun:
1. Telefonda "Developer Options" ni yoqing
2. "Unknown Sources" ni yoqing  
3. APK faylni telefonga ko'chiring
4. APK ni ochib o'rnating

## 🔧 Muammolar va yechimlar

### Java topilmasa:
```bash
# JAVA_HOME ni tekshiring
echo %JAVA_HOME%

# PATH ga Java qo'shing
set PATH=%JAVA_HOME%\bin;%PATH%
```

### Android SDK topilmasa:
```bash
# ANDROID_HOME ni tekshiring
echo %ANDROID_HOME%

# PATH ga Android tools qo'shing
set PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%PATH%
```

### Gradle xatoligi:
```bash
# Gradle cache ni tozalash
cd android
gradlew clean
```

## 📱 APK haqida ma'lumot

- **App nomi**: Yo'lda Driver
- **Package**: com.yolda.driver
- **Version**: 1.0.0
- **Min SDK**: 21 (Android 5.0)
- **Target SDK**: 33 (Android 13)

## 🎯 Tayyor APK

Agar build jarayonida muammo bo'lsa, tayyor APK ni quyidagi yo'l bilan olishingiz mumkin:
1. `build-apk.bat` ni ishga tushiring
2. Yoki qo'lda `gradlew assembleRelease` bajaring
3. APK `app-release.apk` nomi bilan Desktop ga ko'chiriladi

**Muvaffaqiyatli build!** 🚀