package com.example.saferoute.data.firebase

import android.content.Context
import android.util.Log
import com.example.saferoute.data.db.EmergencyContactEntity
import com.example.saferoute.data.db.SavedPlaceEntity
import com.example.saferoute.data.db.TripHistoryEntity
import com.example.saferoute.data.db.UserProfileEntity
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

enum class FirebaseConnectionState {
    CONNECTED,
    CONNECTING,
    DISCONNECTED,
    ERROR
}

data class FirebaseStatusInfo(
    val state: FirebaseConnectionState = FirebaseConnectionState.DISCONNECTED,
    val projectId: String = "",
    val applicationId: String = "",
    val isAuthAvailable: Boolean = false,
    val isFirestoreAvailable: Boolean = false,
    val currentUserId: String? = null,
    val lastSyncTimeMillis: Long = 0L,
    val syncedItemsCount: Int = 0,
    val statusMessage: String = "Firebase not initialized"
)

object FirebaseConnectionManager {
    private const val TAG = "FirebaseConnManager"
    private const val PREFS_NAME = "firebase_connection_prefs"
    private const val KEY_PROJECT_ID = "pref_project_id"
    private const val KEY_API_KEY = "pref_api_key"
    private const val KEY_APP_ID = "pref_app_id"
    private const val KEY_CUSTOM_CONFIGURED = "pref_is_custom"

    private val _statusInfo = MutableStateFlow(FirebaseStatusInfo())
    val statusInfo: StateFlow<FirebaseStatusInfo> = _statusInfo.asStateFlow()

    private var _isCustomConfigured: Boolean = false
    val isCustomConfigured: Boolean
        get() = _isCustomConfigured

    val isConnected: Boolean
        get() = _statusInfo.value.state == FirebaseConnectionState.CONNECTED

    fun init(context: Context) {
        try {
            _statusInfo.value = _statusInfo.value.copy(state = FirebaseConnectionState.CONNECTING, statusMessage = "Connecting to Firebase...")

            // Check if Firebase was initialized automatically by google-services
            val apps = FirebaseApp.getApps(context)
            if (apps.isNotEmpty()) {
                val app = FirebaseApp.getInstance()
                val options = app.options
                val projId = options.projectId ?: "saferoute-navsec"
                val appId = options.applicationId

                updateConnectionSuccess(
                    projectId = projId,
                    appId = appId,
                    message = "Connected to Firebase ($projId)"
                )
                Log.i(TAG, "Firebase initialized via Google Services. Project: $projId")
                return
            }

            // Check if saved credentials exist in preferences
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val isCustom = prefs.getBoolean(KEY_CUSTOM_CONFIGURED, false)
            val savedProjId = prefs.getString(KEY_PROJECT_ID, null)
            val savedApiKey = prefs.getString(KEY_API_KEY, null)
            val savedAppId = prefs.getString(KEY_APP_ID, null)

            if (isCustom && !savedProjId.isNullOrBlank() && !savedApiKey.isNullOrBlank() && !savedAppId.isNullOrBlank()) {
                _isCustomConfigured = true
                initProgrammatic(context, savedProjId, savedApiKey, savedAppId)
                return
            }

            _isCustomConfigured = false
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing Firebase", e)
            _statusInfo.value = _statusInfo.value.copy(
                state = FirebaseConnectionState.ERROR,
                statusMessage = "Firebase initialization error: ${e.localizedMessage}"
            )
        }
    }

    private fun initProgrammatic(
        context: Context,
        projectId: String,
        apiKey: String,
        applicationId: String
    ) {
        try {
            val existing = FirebaseApp.getApps(context)
            if (existing.isNotEmpty()) {
                updateConnectionSuccess(projectId, applicationId, "Connected to Firebase ($projectId)")
                return
            }

            val options = FirebaseOptions.Builder()
                .setProjectId(projectId)
                .setApiKey(apiKey)
                .setApplicationId(applicationId)
                .setStorageBucket("$projectId.firebasestorage.app")
                .build()

            FirebaseApp.initializeApp(context.applicationContext, options)
            updateConnectionSuccess(projectId, applicationId, "Connected to Firebase ($projectId)")
            Log.i(TAG, "Programmatically initialized Firebase for project: $projectId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed programmatic Firebase init", e)
            _statusInfo.value = _statusInfo.value.copy(
                state = FirebaseConnectionState.ERROR,
                statusMessage = "Failed to connect: ${e.message}"
            )
        }
    }

    private fun updateConnectionSuccess(projectId: String, appId: String, message: String) {
        var authOk = false
        var firestoreOk = false
        var currentUid: String? = null

        try {
            val auth = FirebaseAuth.getInstance()
            authOk = true
            currentUid = auth.currentUser?.uid
        } catch (e: Exception) {
            Log.w(TAG, "Auth check: ${e.message}")
        }

        try {
            val db = FirebaseFirestore.getInstance(FirebaseFirestoreManager.DATABASE_ID)
            firestoreOk = db != null
        } catch (e: Exception) {
            Log.w(TAG, "Firestore check: ${e.message}")
        }

        _statusInfo.value = FirebaseStatusInfo(
            state = FirebaseConnectionState.CONNECTED,
            projectId = projectId,
            applicationId = appId,
            isAuthAvailable = authOk,
            isFirestoreAvailable = firestoreOk,
            currentUserId = currentUid,
            lastSyncTimeMillis = System.currentTimeMillis(),
            statusMessage = message
        )
    }

    suspend fun configureCustomFirebase(
        context: Context,
        projectId: String,
        apiKey: String,
        applicationId: String
    ): Result<String> {
        val trimmedProj = projectId.trim()
        val trimmedKey = apiKey.trim()
        val trimmedAppId = applicationId.trim()

        if (trimmedProj.isBlank() || trimmedKey.isBlank() || trimmedAppId.isBlank()) {
            return Result.failure(IllegalArgumentException("All Firebase fields (Project ID, API Key, App ID) are required."))
        }

        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putString(KEY_PROJECT_ID, trimmedProj)
                .putString(KEY_API_KEY, trimmedKey)
                .putString(KEY_APP_ID, trimmedAppId)
                .putBoolean(KEY_CUSTOM_CONFIGURED, true)
                .apply()

            // Re-init
            val apps = FirebaseApp.getApps(context)
            if (apps.isEmpty()) {
                val options = FirebaseOptions.Builder()
                    .setProjectId(trimmedProj)
                    .setApiKey(trimmedKey)
                    .setApplicationId(trimmedAppId)
                    .build()
                FirebaseApp.initializeApp(context.applicationContext, options)
            }

            _isCustomConfigured = true
            updateConnectionSuccess(trimmedProj, trimmedAppId, "Successfully connected to custom Firebase ($trimmedProj)")
            Result.success("Connected to Firebase project $trimmedProj")
        } catch (e: Exception) {
            Log.e(TAG, "Custom Firebase connection failed", e)
            _statusInfo.value = _statusInfo.value.copy(
                state = FirebaseConnectionState.ERROR,
                statusMessage = "Custom connection failed: ${e.message}"
            )
            Result.failure(e)
        }
    }

    suspend fun triggerFullCloudSync(
        userId: String,
        profile: UserProfileEntity,
        contacts: List<EmergencyContactEntity>,
        places: List<SavedPlaceEntity>,
        trips: List<TripHistoryEntity>
    ): Result<Int> {
        if (userId.isBlank()) {
            return Result.failure(IllegalStateException("Must be logged in to sync with Firebase"))
        }

        return try {
            var syncedCount = 0

            // 1. Profile
            val profileOk = FirebaseFirestoreManager.saveUserProfile(
                userId = userId,
                name = profile.name,
                email = profile.email,
                phone = profile.phone,
                language = profile.languagePreference,
                safetyPreference = profile.safetyPreference,
                isPlusMember = profile.isPlusMember
            )
            if (profileOk) syncedCount++

            // 2. Contacts
            val contactsOk = FirebaseFirestoreManager.syncEmergencyContacts(userId, contacts)
            if (contactsOk) syncedCount += contacts.size

            // 3. Places
            val placesOk = FirebaseFirestoreManager.syncSavedPlaces(userId, places)
            if (placesOk) syncedCount += places.size

            // 4. Trips (sync recent)
            trips.take(10).forEach { trip ->
                val tripOk = FirebaseFirestoreManager.saveTripToFirestore(userId, trip)
                if (tripOk) syncedCount++
            }

            _statusInfo.value = _statusInfo.value.copy(
                lastSyncTimeMillis = System.currentTimeMillis(),
                syncedItemsCount = syncedCount,
                statusMessage = "Last synced $syncedCount items to Firebase"
            )

            Result.success(syncedCount)
        } catch (e: Exception) {
            Log.e(TAG, "Manual full cloud sync error", e)
            Result.failure(e)
        }
    }
}
