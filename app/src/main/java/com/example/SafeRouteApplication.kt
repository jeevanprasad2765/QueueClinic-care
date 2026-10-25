package com.example

import android.app.Application
import android.util.Log
import com.example.saferoute.data.firebase.FirebaseConnectionManager

class SafeRouteApplication : Application() {

    companion object {
        lateinit var appContext: Application
            private set
    }

    override fun onCreate() {
        super.onCreate()
        appContext = this
        try {
            org.maplibre.android.MapLibre.getInstance(this)
            Log.i("SafeRouteApp", "MapLibre initialized successfully")
        } catch (t: Throwable) {
            Log.w("SafeRouteApp", "MapLibre native initialization: ${t.message}")
        }

        try {
            FirebaseConnectionManager.init(this)
            Log.i("SafeRouteApp", "SafeRouteApplication started. Firebase state: ${FirebaseConnectionManager.statusInfo.value.state}")
        } catch (e: Exception) {
            Log.e("SafeRouteApp", "Failed to initialize Firebase on app start: ${e.message}")
        }
    }
}
