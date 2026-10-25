package com.example.saferoute.util

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.net.Uri
import android.provider.Settings
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

object LocationHelper {
    private const val TAG = "LocationHelper"

    // Default Coimbatore city center coordinates fallback
    val DEFAULT_COIMBATORE_COORDINATES = Pair(11.0168, 76.9558)

    fun hasLocationPermission(context: Context): Boolean {
        val fine = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    fun isGpsEnabled(context: Context): Boolean {
        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return false
        return locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
    }

    @SuppressLint("MissingPermission")
    suspend fun getCurrentCoordinates(context: Context): Pair<Double, Double>? = withContext(Dispatchers.IO) {
        if (!hasLocationPermission(context)) {
            Log.w(TAG, "Location permission not granted.")
            return@withContext null
        }

        try {
            val fusedLocationClient: FusedLocationProviderClient =
                LocationServices.getFusedLocationProviderClient(context)

            // 1. Try getCurrentLocation with high accuracy
            val cts = CancellationTokenSource()
            val currentLocation: Location? = try {
                fusedLocationClient.getCurrentLocation(
                    Priority.PRIORITY_HIGH_ACCURACY,
                    cts.token
                ).await()
            } catch (e: Exception) {
                Log.w(TAG, "Fused getCurrentLocation failed: ${e.message}")
                null
            }

            if (currentLocation != null) {
                Log.i(TAG, "Acquired live location: (${currentLocation.latitude}, ${currentLocation.longitude})")
                return@withContext Pair(currentLocation.latitude, currentLocation.longitude)
            }

            // 2. Fallback to lastLocation
            val lastLocation: Location? = try {
                fusedLocationClient.lastLocation.await()
            } catch (e: Exception) {
                Log.w(TAG, "Fused lastLocation failed: ${e.message}")
                null
            }

            if (lastLocation != null) {
                Log.i(TAG, "Acquired last known location: (${lastLocation.latitude}, ${lastLocation.longitude})")
                return@withContext Pair(lastLocation.latitude, lastLocation.longitude)
            }

            // 3. Fallback to Android native LocationManager
            val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            val gpsLoc = try { locationManager?.getLastKnownLocation(LocationManager.GPS_PROVIDER) } catch (_: SecurityException) { null }
            val netLoc = try { locationManager?.getLastKnownLocation(LocationManager.NETWORK_PROVIDER) } catch (_: SecurityException) { null }
            val best = gpsLoc ?: netLoc

            if (best != null) {
                Log.i(TAG, "Acquired location from LocationManager: (${best.latitude}, ${best.longitude})")
                return@withContext Pair(best.latitude, best.longitude)
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error acquiring location", e)
        }

        return@withContext null
    }

    fun openAppSettings(context: Context) {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", context.packageName, null)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open app settings: ${e.message}")
        }
    }
}
