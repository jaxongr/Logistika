@echo off
echo Building Yo'lda Driver APK...
echo.

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not installed or not in PATH
    pause
    exit /b 1
)

REM Install dependencies
echo Installing dependencies...
call npm install

REM Check if gradlew exists
if not exist "android\gradlew.bat" (
    echo Error: Gradle wrapper not found
    echo Please make sure you have React Native properly set up
    pause
    exit /b 1
)

REM Create keystore directory if it doesn't exist
if not exist "android\app\keystore" mkdir "android\app\keystore"

REM Build the APK
echo Building Release APK...
cd android
call gradlew assembleRelease

if %errorlevel% equ 0 (
    echo.
    echo APK built successfully!
    echo APK location: android\app\build\outputs\apk\release\app-release.apk
    echo.
    
    REM Try to copy APK to desktop
    if exist "app\build\outputs\apk\release\app-release.apk" (
        copy "app\build\outputs\apk\release\app-release.apk" "..\..\Yolda-Driver.apk"
        echo APK copied to: Yolda-Driver.apk
    )
) else (
    echo.
    echo Build failed! Check the error messages above.
)

echo.
pause