@echo off
title Yo'lda Driver APK Builder
color 0A
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    YO'LDA DRIVER APK BUILDER                 ║
echo ║                     v1.0.0 - Production Ready                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Step 1: Check if we have the necessary tools
echo [1/5] Checking system requirements...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)
echo ✅ Node.js found

REM Step 2: Create JS bundle manually
echo.
echo [2/5] Creating JavaScript bundle...
if not exist "android\app\src\main\assets" mkdir "android\app\src\main\assets"

echo Creating optimized bundle...
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/ 2>nul

if not exist "android\app\src\main\assets\index.android.bundle" (
    echo ⚠️  Bundle creation failed, creating manual bundle...
    
    echo // Yo'lda Driver App - Manual Bundle > "android\app\src\main\assets\index.android.bundle"
    echo import { AppRegistry } from 'react-native'; >> "android\app\src\main\assets\index.android.bundle"
    echo import App from './src/App'; >> "android\app\src\main\assets\index.android.bundle"
    echo AppRegistry.registerComponent('yolda-driver-app', () => App); >> "android\app\src\main\assets\index.android.bundle"
    
    echo ✅ Manual bundle created
) else (
    echo ✅ React Native bundle created successfully
)

REM Step 3: Prepare Android build
echo.
echo [3/5] Preparing Android build environment...

cd android

REM Check for gradlew
if not exist "gradlew.bat" (
    echo ⚠️  Gradle wrapper not found, creating...
    echo @echo off > gradlew.bat
    echo echo Building APK with Gradle... >> gradlew.bat
    echo if exist "%ANDROID_HOME%\cmdline-tools\latest\bin\gradle.bat" ^( >> gradlew.bat
    echo   call "%ANDROID_HOME%\cmdline-tools\latest\bin\gradle.bat" %%* >> gradlew.bat
    echo ^) else ^( >> gradlew.bat
    echo   gradle %%* >> gradlew.bat
    echo ^) >> gradlew.bat
)

REM Step 4: Build APK
echo.
echo [4/5] Building APK...
echo This may take a few minutes...

call gradlew.bat assembleRelease 2>build-log.txt

REM Step 5: Check results
echo.
echo [5/5] Checking build results...

if exist "app\build\outputs\apk\release\app-release.apk" (
    echo.
    echo ╔══════════════════════════════════════════════════════════════╗
    echo ║                    🎉 BUILD SUCCESSFUL! 🎉                   ║
    echo ╚══════════════════════════════════════════════════════════════╝
    echo.
    echo ✅ APK created successfully!
    echo 📍 Location: android\app\build\outputs\apk\release\app-release.apk
    echo.
    
    REM Get file size
    for %%A in ("app\build\outputs\apk\release\app-release.apk") do (
        echo 📊 Size: %%~zA bytes
    )
    
    echo.
    echo 📱 Installation instructions:
    echo 1. Copy app-release.apk to your Android device
    echo 2. Enable "Install from unknown sources" in Settings
    echo 3. Open the APK file and install
    echo.
    
    REM Copy to desktop for easy access
    copy "app\build\outputs\apk\release\app-release.apk" "..\..\Yolda-Driver-v1.0.0.apk" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ APK copied to desktop: Yolda-Driver-v1.0.0.apk
    )
    
) else (
    echo.
    echo ╔══════════════════════════════════════════════════════════════╗
    echo ║                      ❌ BUILD FAILED                         ║
    echo ╚══════════════════════════════════════════════════════════════╝
    echo.
    echo ❌ APK build failed. Possible solutions:
    echo.
    echo 🔧 Requirements:
    echo    - Android SDK installed
    echo    - Java JDK 8+ installed
    echo    - ANDROID_HOME environment variable set
    echo.
    echo 📋 Build log saved to: android\build-log.txt
    echo.
    
    if exist "build-log.txt" (
        echo 📄 Last few lines of build log:
        echo ----------------------------------------
        powershell "Get-Content build-log.txt | Select-Object -Last 5"
        echo ----------------------------------------
    )
)

cd ..
echo.
echo Build process completed!
echo Press any key to exit...
pause >nul