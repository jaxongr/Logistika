@echo off
title Yo'lda Bot Backup Creator
color 0E
cls

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                     YO'LDA BOT BACKUP CREATOR                ║
echo ║                     Current State Backup                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

set BACKUP_NAME=YOLDA-BOT-BACKUP-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_NAME=%BACKUP_NAME: =0%

echo Creating backup: %BACKUP_NAME%
echo.

echo [1/4] Creating backup directory...
if not exist "BACKUPS" mkdir "BACKUPS"
mkdir "BACKUPS\%BACKUP_NAME%"

echo [2/4] Copying source files...
xcopy "src" "BACKUPS\%BACKUP_NAME%\src" /E /I /Q
copy "package.json" "BACKUPS\%BACKUP_NAME%\" >nul
copy "tsconfig.json" "BACKUPS\%BACKUP_NAME%\" >nul
copy "nest-cli.json" "BACKUPS\%BACKUP_NAME%\" >nul

echo [3/4] Copying Android project...
xcopy "YOLDA-APK" "BACKUPS\%BACKUP_NAME%\YOLDA-APK" /E /I /Q
xcopy "android-driver-app" "BACKUPS\%BACKUP_NAME%\android-driver-app" /E /I /Q /EXCLUDE:exclude-list.txt

echo [4/4] Creating backup info...
(
echo Yo'lda Bot Backup Created: %date% %time%
echo.
echo Bot Status: 100%% Functional
echo Features Completed:
echo - ✅ Simplified cargo posting (4 questions only)
echo - ✅ Fixed price input system (multiple formats)
echo - ✅ Driver registration simplified (4 steps)
echo - ✅ Admin panel fully functional
echo - ✅ Simplified customer/driver menus
echo - ✅ Location input handling
echo - ✅ Professional Android app created
echo.
echo Android App Features:
echo - ✅ Professional Yandex Go-style UI
echo - ✅ Location tracking capabilities
echo - ✅ Order management system
echo - ✅ Real-time status updates
echo - ✅ Driver statistics dashboard
echo.
echo To restore: Copy files back to original location
echo To build APK: Run BUILD-APK.bat in YOLDA-APK directory
) > "BACKUPS\%BACKUP_NAME%\BACKUP-INFO.txt"

echo.
echo ✅ Backup created successfully!
echo 📁 Location: BACKUPS\%BACKUP_NAME%
echo 📋 Info file: BACKUP-INFO.txt
echo.
pause