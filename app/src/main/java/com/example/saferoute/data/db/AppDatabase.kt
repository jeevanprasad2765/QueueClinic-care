package com.example.saferoute.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        EmergencyContactEntity::class,
        TripHistoryEntity::class,
        SavedPlaceEntity::class,
        UserProfileEntity::class,
        RouteOverpassCacheEntity::class
    ],
    version = 3,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun emergencyContactDao(): EmergencyContactDao
    abstract fun tripHistoryDao(): TripHistoryDao
    abstract fun savedPlaceDao(): SavedPlaceDao
    abstract fun userProfileDao(): UserProfileDao
    abstract fun routeOverpassCacheDao(): RouteOverpassCacheDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "saferoute_db"
                )
                    .fallbackToDestructiveMigration(true)
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
