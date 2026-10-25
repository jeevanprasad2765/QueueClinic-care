package com.example.saferoute.data.db

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query

@Entity(tableName = "route_overpass_cache")
data class RouteOverpassCacheEntity(
    @PrimaryKey
    val routeGeometryHash: String,
    val rawJson: String,
    val cachedAtEpochMs: Long
)

@Dao
interface RouteOverpassCacheDao {
    @Query("SELECT * FROM route_overpass_cache WHERE routeGeometryHash = :hash LIMIT 1")
    suspend fun getCache(hash: String): RouteOverpassCacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCache(cache: RouteOverpassCacheEntity)

    @Query("DELETE FROM route_overpass_cache WHERE :currentEpochMs - cachedAtEpochMs > 86400000")
    suspend fun deleteExpired(currentEpochMs: Long)
}
