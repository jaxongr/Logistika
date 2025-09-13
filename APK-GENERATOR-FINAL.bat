@echo off
title Final APK Generator for Yo'lda Driver
color 0B
cls

echo.
echo ═══════════════════════════════════════════════════════════════════
echo                     YO'LDA DRIVER APK GENERATOR
echo                           FINAL VERSION                          
echo ═══════════════════════════════════════════════════════════════════
echo.

REM Set working directory
set WORK_DIR=%~dp0
cd /d "%WORK_DIR%"

echo [1] Creating APK directory structure...
if not exist "YOLDA-APK" mkdir "YOLDA-APK"
cd "YOLDA-APK"

REM Create Android project structure
echo [2] Setting up Android project...
if not exist "src\main\java\com\yolda\driver" mkdir "src\main\java\com\yolda\driver"
if not exist "src\main\res\values" mkdir "src\main\res\values"
if not exist "src\main\res\mipmap-hdpi" mkdir "src\main\res\mipmap-hdpi"
if not exist "src\main\assets" mkdir "src\main\assets"

REM Create AndroidManifest.xml
echo [3] Creating Android Manifest...
(
echo ^<?xml version="1.0" encoding="utf-8"?^>
echo ^<manifest xmlns:android="http://schemas.android.com/apk/res/android"
echo     package="com.yolda.driver"
echo     android:versionCode="1"
echo     android:versionName="1.0.0"^>
echo.
echo     ^<uses-permission android:name="android.permission.INTERNET" /^>
echo     ^<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" /^>
echo     ^<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" /^>
echo     ^<uses-permission android:name="android.permission.VIBRATE" /^>
echo.
echo     ^<application
echo         android:allowBackup="true"
echo         android:icon="@mipmap/ic_launcher"
echo         android:label="@string/app_name"
echo         android:theme="@android:style/Theme.Material.Light"^>
echo.
echo         ^<activity
echo             android:name=".MainActivity"
echo             android:exported="true"
echo             android:label="@string/app_name"^>
echo             ^<intent-filter^>
echo                 ^<action android:name="android.intent.action.MAIN" /^>
echo                 ^<category android:name="android.intent.category.LAUNCHER" /^>
echo             ^</intent-filter^>
echo         ^</activity^>
echo     ^</application^>
echo ^</manifest^>
) > "src\main\AndroidManifest.xml"

REM Create strings.xml
echo [4] Creating string resources...
(
echo ^<?xml version="1.0" encoding="utf-8"?^>
echo ^<resources^>
echo     ^<string name="app_name"^>Yo'lda Driver^</string^>
echo ^</resources^>
) > "src\main\res\values\strings.xml"

REM Create MainActivity.java
echo [5] Creating MainActivity...
(
echo package com.yolda.driver;
echo.
echo import android.app.Activity;
echo import android.os.Bundle;
echo import android.webkit.WebView;
echo import android.webkit.WebViewClient;
echo import android.webkit.WebSettings;
echo.
echo public class MainActivity extends Activity {
echo     @Override
echo     protected void onCreate^(Bundle savedInstanceState^) {
echo         super.onCreate^(savedInstanceState^);
echo.
echo         WebView webView = new WebView^(this^);
echo         WebSettings webSettings = webView.getSettings^(^);
echo         webSettings.setJavaScriptEnabled^(true^);
echo         webSettings.setDomStorageEnabled^(true^);
echo         
echo         webView.setWebViewClient^(new WebViewClient^(^)^);
echo         
echo         String htmlContent = "^<!DOCTYPE html^>" +
echo             "^<html^>^<head^>" +
echo             "^<meta charset='utf-8'^>" +
echo             "^<meta name='viewport' content='width=device-width, initial-scale=1'^>" +
echo             "^<title^>Yo'lda Driver^</title^>" +
echo             "^<style^>" +
echo             "* { margin: 0; padding: 0; box-sizing: border-box; }" +
echo             "body { font-family: Arial, sans-serif; background: linear-gradient^(135deg, #2196F3, #1976D2^); color: white; }" +
echo             ".container { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; }" +
echo             ".logo { font-size: 4em; margin-bottom: 20px; }" +
echo             ".title { font-size: 2.5em; font-weight: bold; margin-bottom: 10px; }" +
echo             ".subtitle { font-size: 1.2em; opacity: 0.8; margin-bottom: 40px; }" +
echo             ".login-form { background: rgba^(255,255,255,0.1^); border-radius: 15px; padding: 30px; width: 100%%; max-width: 400px; }" +
echo             ".input { width: 100%%; padding: 15px; margin: 10px 0; border: none; border-radius: 8px; font-size: 16px; }" +
echo             ".button { width: 100%%; padding: 15px; margin: 20px 0; border: none; border-radius: 8px; background: #4CAF50; color: white; font-size: 16px; font-weight: bold; cursor: pointer; }" +
echo             ".orders { margin-top: 30px; width: 100%%; max-width: 400px; }" +
echo             ".order-card { background: rgba^(255,255,255,0.1^); border-radius: 10px; padding: 20px; margin: 10px 0; }" +
echo             ".route { font-size: 1.2em; font-weight: bold; margin-bottom: 10px; }" +
echo             ".price { font-size: 1.1em; color: #FFD700; font-weight: bold; }" +
echo             ".hidden { display: none; }" +
echo             "^</style^>" +
echo             "^</head^>^<body^>" +
echo             "^<div class='container'^>" +
echo             "^<div class='logo'^>🚛^</div^>" +
echo             "^<div class='title'^>Yo'lda Driver^</div^>" +
echo             "^<div class='subtitle'^>Professional haydovchilar platformasi^</div^>" +
echo             "^<div id='loginForm' class='login-form'^>" +
echo             "^<input type='tel' id='phone' class='input' placeholder='+998 XX XXX XX XX' maxlength='13'^>" +
echo             "^<button class='button' onclick='login()'^>Kirish^</button^>" +
echo             "^</div^>" +
echo             "^<div id='dashboard' class='hidden'^>" +
echo             "^<div style='text-align: center; margin-bottom: 20px;'^>" +
echo             "^<span style='color: #4CAF50; font-weight: bold;'^>● Online^</span^>" +
echo             "^</div^>" +
echo             "^<div class='orders'^>" +
echo             "^<div class='order-card'^>" +
echo             "^<div class='route'^>Toshkent → Samarqand^</div^>" +
echo             "^<div^>🚛 Mebel^</div^>" +
echo             "^<div^>📅 Bugun^</div^>" +
echo             "^<div class='price'^>2,500,000 so'm^</div^>" +
echo             "^<button class='button' onclick='acceptOrder()'^>Qabul qilish^</button^>" +
echo             "^</div^>" +
echo             "^<div class='order-card'^>" +
echo             "^<div class='route'^>Nukus → Toshkent^</div^>" +
echo             "^<div^>🚛 Oziq-ovqat^</div^>" +
echo             "^<div^>📅 Ertaga^</div^>" +
echo             "^<div class='price'^>1,800,000 so'm^</div^>" +
echo             "^<button class='button' onclick='acceptOrder()'^>Qabul qilish^</button^>" +
echo             "^</div^>" +
echo             "^</div^>" +
echo             "^</div^>" +
echo             "^</div^>" +
echo             "^<script^>" +
echo             "function login^(^) {" +
echo             "  var phone = document.getElementById^('phone'^).value;" +
echo             "  if ^(phone.length ^> 8^) {" +
echo             "    document.getElementById^('loginForm'^).classList.add^('hidden'^);" +
echo             "    document.getElementById^('dashboard'^).classList.remove^('hidden'^);" +
echo             "    alert^('Tizimga muvaffaqiyatli kirildi!'^);" +
echo             "  } else {" +
echo             "    alert^('Telefon raqamni to\\'g\\'ri kiriting'^);" +
echo             "  }" +
echo             "}" +
echo             "function acceptOrder^(^) {" +
echo             "  alert^('Buyurtma qabul qilindi!'^);" +
echo             "}" +
echo             "^</script^>" +
echo             "^</body^>^</html^>";
echo.
echo         webView.loadData^(htmlContent, "text/html", "UTF-8"^);
echo         setContentView^(webView^);
echo     }
echo }
) > "src\main\java\com\yolda\driver\MainActivity.java"

REM Create build.gradle
echo [6] Creating build configuration...
(
echo apply plugin: 'com.android.application'
echo.
echo android {
echo     compileSdkVersion 33
echo     defaultConfig {
echo         applicationId "com.yolda.driver"
echo         minSdkVersion 21
echo         targetSdkVersion 33
echo         versionCode 1
echo         versionName "1.0.0"
echo     }
echo     buildTypes {
echo         release {
echo             minifyEnabled false
echo         }
echo     }
echo }
) > "build.gradle"

echo [7] ✅ All files created successfully!
echo.
echo 📱 APK Structure Ready:
echo    - Android Manifest: ✅
echo    - MainActivity: ✅  
echo    - Resources: ✅
echo    - Build Config: ✅
echo.
echo 🔧 To build APK:
echo    1. Install Android SDK
echo    2. Run: gradlew assembleRelease
echo.
echo 📍 Project location: %CD%
echo.
pause