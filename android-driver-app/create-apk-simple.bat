@echo off
echo =============================================
echo    Yo'lda Driver APK Generator
echo =============================================
echo.

REM Create a simple React Native bundle
echo 1. Creating React Native JavaScript bundle...

if not exist "android\app\src\main\assets" mkdir "android\app\src\main\assets"

REM Create a simplified index.bundle manually
echo Creating JavaScript bundle...
(
echo // Yo'lda Driver App Bundle - Simplified
echo import { AppRegistry } from 'react-native';
echo import App from './src/App';
echo AppRegistry.registerComponent^('yolda-driver-app', ^(^) =^> App^);
) > "android\app\src\main\assets\index.android.bundle"

echo 2. JavaScript bundle created successfully!
echo.

REM Check if we have Java/Android SDK
echo 3. Checking Android SDK...
if not defined ANDROID_HOME (
    echo Warning: ANDROID_HOME not set. Using default Android SDK location...
    set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
)

echo ANDROID_HOME: %ANDROID_HOME%

REM Check if gradlew exists, if not create a simple one
if not exist "android\gradlew.bat" (
    echo 4. Creating Gradle wrapper...
    echo @echo off > "android\gradlew.bat"
    echo echo Running Gradle build... >> "android\gradlew.bat"
    echo gradlew %%* >> "android\gradlew.bat"
)

echo 5. Building APK...
cd android

REM Try different ways to build
if exist "gradlew.bat" (
    echo Using Gradle wrapper...
    call gradlew.bat assembleRelease
) else (
    echo Using system Gradle...
    gradle assembleRelease
)

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo     APK BUILD SUCCESSFUL!
    echo ============================================
    echo.
    if exist "app\build\outputs\apk\release\app-release.apk" (
        echo APK Location: android\app\build\outputs\apk\release\app-release.apk
        echo.
        echo Copying APK to desktop...
        copy "app\build\outputs\apk\release\app-release.apk" "..\..\Yolda-Driver-v1.0.0.apk"
        echo.
        echo APK saved as: Yolda-Driver-v1.0.0.apk
        echo Size: 
        dir "..\..\Yolda-Driver-v1.0.0.apk" | find "apk"
    ) else (
        echo APK file not found in expected location.
        echo Searching for APK files...
        dir /s *.apk
    )
) else (
    echo.
    echo ============================================
    echo     BUILD FAILED
    echo ============================================
    echo.
    echo Error details:
    echo - Make sure Android SDK is installed
    echo - Make sure Java JDK is installed  
    echo - Check ANDROID_HOME environment variable
    echo.
    echo Current environment:
    echo ANDROID_HOME: %ANDROID_HOME%
    echo JAVA_HOME: %JAVA_HOME%
    echo.
)

cd ..
echo.
echo Build process completed!
pause