@echo off
echo ===============================================
echo   HAYDOVCHI TRACKER APK YARATISH
echo ===============================================

echo.
echo 1. Dependencies o'rnatish...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Dependencies o'rnatishda xatolik!
    pause
    exit /b 1
)

echo.
echo 2. Android loyihani tozalash...
cd android
call gradlew.bat clean

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Android loyihani tozalashda xatolik!
    pause
    exit /b 1
)

echo.
echo 3. APK yaratish (Release version)...
call gradlew.bat assembleRelease

if %ERRORLEVEL% NEQ 0 (
    echo ❌ APK yaratishda xatolik!
    pause
    exit /b 1
)

cd ..

echo.
echo ✅ APK muvaffaqiyatli yaratildi!
echo.
echo 📁 APK manzil: android\app\build\outputs\apk\release\app-release.apk
echo.
echo ===============================================
echo   O'RNATISH YO'RIQNOMASI
echo ===============================================
echo.
echo 1. APK faylni telefoniga ko'chiring
echo 2. Telefondan APK faylni oching
echo 3. "Noma'lum manbalardan o'rnatishga ruxsat" bering
echo 4. Ilovani o'rnating
echo 5. Bot orqali berilgan ID ni kiriting
echo 6. GPS va kontakt ruxsatlarini bering
echo 7. Internetni yoqib tracking-ni boshlang
echo.
echo ⚠️  DIQQAT: Ilovani yopmang, aks holda bot zakazlar bermaydi!
echo.
pause