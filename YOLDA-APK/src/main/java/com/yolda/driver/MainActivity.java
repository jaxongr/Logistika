package com.yolda.driver;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.content.Context;
import android.location.LocationManager;
import android.content.pm.PackageManager;
import android.Manifest;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends Activity {
    private WebView webView;
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setGeolocationEnabled(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);
        
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
        });

        // Check for location permissions
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, LOCATION_PERMISSION_REQUEST_CODE);
        }
        
        String htmlContent = "<!DOCTYPE html>" +
            "<html><head>" +
            "<meta charset='utf-8'>" +
            "<meta name='viewport' content='width=device-width, initial-scale=1, user-scalable=no'>" +
            "<title>Yo'lda Driver</title>" +
            "<style>" +
            "* { margin: 0; padding: 0; box-sizing: border-box; }" +
            "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; overflow-x: hidden; }" +
            ".container { min-height: 100vh; display: flex; flex-direction: column; }" +
            ".header { background: rgba(0,0,0,0.1); padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; }" +
            ".logo { display: flex; align-items: center; }" +
            ".logo-icon { font-size: 2em; margin-right: 10px; }" +
            ".logo-text { font-size: 1.4em; font-weight: 600; }" +
            ".status { display: flex; align-items: center; }" +
            ".status-dot { width: 8px; height: 8px; border-radius: 50%; background: #4CAF50; margin-right: 8px; }" +
            ".main-content { flex: 1; padding: 20px; }" +
            ".login-screen { text-align: center; padding-top: 60px; }" +
            ".welcome-text { font-size: 2.2em; font-weight: 300; margin-bottom: 10px; }" +
            ".subtitle { font-size: 1.1em; opacity: 0.8; margin-bottom: 50px; }" +
            ".login-form { background: rgba(255,255,255,0.1); border-radius: 20px; padding: 30px; margin: 0 auto; max-width: 320px; backdrop-filter: blur(10px); }" +
            ".input-group { margin-bottom: 20px; }" +
            ".input { width: 100%; padding: 15px; border: none; border-radius: 12px; font-size: 16px; background: rgba(255,255,255,0.9); color: #333; }" +
            ".btn { width: 100%; padding: 15px; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s; }" +
            ".btn-primary { background: #4CAF50; color: white; }" +
            ".btn-primary:hover { background: #45a049; transform: translateY(-2px); }" +
            ".dashboard { display: none; }" +
            ".stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }" +
            ".stat-card { background: rgba(255,255,255,0.1); border-radius: 15px; padding: 20px; text-align: center; backdrop-filter: blur(10px); }" +
            ".stat-number { font-size: 2em; font-weight: bold; color: #FFD700; }" +
            ".stat-label { font-size: 0.9em; opacity: 0.8; margin-top: 5px; }" +
            ".orders-section { }" +
            ".section-title { font-size: 1.3em; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; }" +
            ".section-icon { margin-right: 10px; }" +
            ".order-card { background: rgba(255,255,255,0.1); border-radius: 15px; padding: 20px; margin-bottom: 15px; backdrop-filter: blur(10px); }" +
            ".order-route { font-size: 1.2em; font-weight: 600; margin-bottom: 10px; }" +
            ".order-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 15px; }" +
            ".detail-item { display: flex; align-items: center; font-size: 0.9em; }" +
            ".detail-icon { margin-right: 8px; }" +
            ".order-price { font-size: 1.3em; font-weight: bold; color: #FFD700; margin-bottom: 15px; }" +
            ".btn-accept { background: #4CAF50; }" +
            ".btn-reject { background: #f44336; margin-left: 10px; }" +
            ".bottom-nav { background: rgba(0,0,0,0.2); padding: 15px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }" +
            ".nav-btn { background: rgba(255,255,255,0.1); border: none; border-radius: 12px; padding: 12px; color: white; font-size: 0.8em; cursor: pointer; text-align: center; }" +
            ".nav-btn.active { background: #4CAF50; }" +
            ".hidden { display: none !important; }" +
            "@media (max-width: 480px) {" +
            "  .main-content { padding: 15px; }" +
            "  .login-form { padding: 25px; }" +
            "  .order-details { grid-template-columns: 1fr; }" +
            "}" +
            "</style>" +
            "</head><body>" +
            "<div class='container'>" +
            "<div class='header'>" +
            "<div class='logo'>" +
            "<div class='logo-icon'>🚛</div>" +
            "<div class='logo-text'>Yo'lda Driver</div>" +
            "</div>" +
            "<div id='status' class='status hidden'>" +
            "<div class='status-dot'></div>" +
            "<span>Online</span>" +
            "</div>" +
            "</div>" +
            "<div class='main-content'>" +
            "<div id='loginScreen' class='login-screen'>" +
            "<div class='welcome-text'>Xush kelibsiz!</div>" +
            "<div class='subtitle'>Professional haydovchilar platformasi</div>" +
            "<div class='login-form'>" +
            "<div class='input-group'>" +
            "<input type='tel' id='phone' class='input' placeholder='+998 XX XXX XX XX' maxlength='13'>" +
            "</div>" +
            "<button class='btn btn-primary' onclick='login()'>Tizimga kirish</button>" +
            "</div>" +
            "</div>" +
            "<div id='dashboard' class='dashboard'>" +
            "<div class='stats-row'>" +
            "<div class='stat-card'>" +
            "<div class='stat-number'>12</div>" +
            "<div class='stat-label'>Bugungi reyslar</div>" +
            "</div>" +
            "<div class='stat-card'>" +
            "<div class='stat-number'>85%</div>" +
            "<div class='stat-label'>Qabul darajasi</div>" +
            "</div>" +
            "<div class='stat-card'>" +
            "<div class='stat-number'>4.8</div>" +
            "<div class='stat-label'>Reyting</div>" +
            "</div>" +
            "</div>" +
            "<div class='orders-section'>" +
            "<div class='section-title'>" +
            "<span class='section-icon'>📦</span>" +
            "Yangi buyurtmalar" +
            "</div>" +
            "<div class='order-card'>" +
            "<div class='order-route'>Toshkent → Samarqand</div>" +
            "<div class='order-details'>" +
            "<div class='detail-item'><span class='detail-icon'>🚛</span>Mebel</div>" +
            "<div class='detail-item'><span class='detail-icon'>⚖️</span>15 tonna</div>" +
            "<div class='detail-item'><span class='detail-icon'>📅</span>Bugun</div>" +
            "<div class='detail-item'><span class='detail-icon'>🕐</span>14:00</div>" +
            "</div>" +
            "<div class='order-price'>2,500,000 so'm</div>" +
            "<button class='btn btn-accept' onclick='acceptOrder(1)'>Qabul qilish</button>" +
            "<button class='btn btn-reject' onclick='rejectOrder(1)'>Rad etish</button>" +
            "</div>" +
            "<div class='order-card'>" +
            "<div class='order-route'>Nukus → Toshkent</div>" +
            "<div class='order-details'>" +
            "<div class='detail-item'><span class='detail-icon'>🚛</span>Oziq-ovqat</div>" +
            "<div class='detail-item'><span class='detail-icon'>⚖️</span>8 tonna</div>" +
            "<div class='detail-item'><span class='detail-icon'>📅</span>Ertaga</div>" +
            "<div class='detail-item'><span class='detail-icon'>🕐</span>09:00</div>" +
            "</div>" +
            "<div class='order-price'>1,800,000 so'm</div>" +
            "<button class='btn btn-accept' onclick='acceptOrder(2)'>Qabul qilish</button>" +
            "<button class='btn btn-reject' onclick='rejectOrder(2)'>Rad etish</button>" +
            "</div>" +
            "</div>" +
            "</div>" +
            "</div>" +
            "<div id='bottomNav' class='bottom-nav hidden'>" +
            "<button class='nav-btn active'>📦<br>Buyurtmalar</button>" +
            "<button class='nav-btn'>📍<br>Xarita</button>" +
            "<button class='nav-btn'>📊<br>Statistika</button>" +
            "<button class='nav-btn'>👤<br>Profil</button>" +
            "</div>" +
            "</div>" +
            "<script>" +
            "function login() {" +
            "  var phone = document.getElementById('phone').value;" +
            "  if (phone.length > 8) {" +
            "    document.getElementById('loginScreen').classList.add('hidden');" +
            "    document.getElementById('dashboard').classList.remove('hidden');" +
            "    document.getElementById('status').classList.remove('hidden');" +
            "    document.getElementById('bottomNav').classList.remove('hidden');" +
            "    alert('Tizimga muvaffaqiyatli kirildi!');" +
            "  } else {" +
            "    alert('Telefon raqamni to\\'g\\'ri kiriting');" +
            "  }" +
            "}" +
            "function acceptOrder(id) {" +
            "  alert('Buyurtma #' + id + ' qabul qilindi!');" +
            "}" +
            "function rejectOrder(id) {" +
            "  alert('Buyurtma #' + id + ' rad etildi.');" +
            "}" +
            "</script>" +
            "</body></html>";

        webView.loadData(htmlContent, "text/html", "UTF-8");
        setContentView(webView);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}