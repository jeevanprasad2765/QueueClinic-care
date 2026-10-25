package com.example.saferoute.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "emergency_contacts")
data class EmergencyContactEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val phone: String,
    val relationship: String,
    val isPrimary: Boolean = false
)

@Entity(tableName = "trip_history")
data class TripHistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val originName: String,
    val destinationName: String,
    val timestamp: Long = System.currentTimeMillis(),
    val durationSeconds: Long,
    val distanceKm: Double,
    val avgSafetyScore: Int,
    val routeTypeName: String, // e.g., "Illuminated Main Street"
    val userRating: Int = 0, // 1 to 5 stars
    val feedbackNote: String = "",
    val sharedWithContact: String = ""
)

@Entity(tableName = "saved_places")
data class SavedPlaceEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String, // e.g., "Home", "Work", "Gym", "Subway Station"
    val address: String,
    val iconName: String, // "home", "work", "star", "fitness", "train"
    val latitude: Double,
    val longitude: Double
)

@Entity(tableName = "user_profile")
data class UserProfileEntity(
    @PrimaryKey val id: Long = 1,
    val userId: String = "guest_default",
    val name: String = "Alex Taylor",
    val email: String = "alex.taylor@saferoute.io",
    val phone: String = "+91 98765 43210",
    val languagePreference: String = "en",
    val isLoggedIn: Boolean = false,
    val isGuest: Boolean = true,
    val safetyPreference: String = "ALWAYS_SAFETY", // "ALWAYS_SAFETY", "BALANCED", "SPEED_FIRST"
    val autoShareSosLocation: Boolean = true,
    val highContrastMode: Boolean = false,
    val isPlusMember: Boolean = false,
    val completedOnboarding: Boolean = false
)
