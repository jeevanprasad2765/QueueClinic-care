package com.example.saferoute.data.model

/**
 * Standard categories for places and amenities identified along a route corridor.
 */
enum class PlaceCategory(
    val id: String,
    val displayName: String,
    val isHelpPoint: Boolean
) {
    HOSPITAL("hospital", "Hospital / Clinic", true),
    PHARMACY("pharmacy", "Medical Store", true),
    POLICE("police", "Police Station", true),
    FUEL("fuel", "Petrol Pump", true),
    SHOP("shop", "Shop", false),
    FOOD("food", "Food & Dining", false),
    ATM("atm", "ATM / Bank", false),
    OTHER_HELP("other_help", "Other Help", true)
}

/**
 * A place of interest (amenity, shop, hospital, help point) located along the route corridor.
 */
data class RoutePlace(
    val id: String,
    val name: String,
    val category: PlaceCategory,
    val lat: Double,
    val lng: Double,
    val distanceFromRouteM: Double,
    val positionAlongRouteM: Double,
    val openingHoursRaw: String?,
    val isOpenNow: Boolean,
    val opensAt: String? = null,
    val closesAt: String? = null,
    val is24x7: Boolean = false,
    val isOpenWhenPassing: Boolean = true,
    val phone: String? = null
)

enum class CoverageStatus {
    HIGH,    // Well-covered with active businesses and nearby help
    MEDIUM,  // Moderate activity
    LOW      // Isolated / dark stretch requiring caution
}

data class CoverageSegment(
    val index: Int,
    val startMeters: Double,
    val endMeters: Double,
    val status: CoverageStatus,
    val openPlacesCount: Int,
    val hasHelpPoint: Boolean
)

/**
 * Aggregated corridor attributes derived from OpenStreetMap Overpass (or Geoapify fallback).
 */
data class RouteCorridorData(
    val places: List<RoutePlace> = emptyList(),
    val litRatio: Float = 0.85f,
    val isLitEstimated: Boolean = false,
    val openPlacesCount: Int = 0,
    val totalPlacesCount: Int = 0,
    val openShopsDensityPer100m: Float = 0f,
    val longestStretchWithoutHelpM: Double = 0.0,
    val helpCoverageScore: Float = 80f,
    val coverageSegments: List<CoverageSegment> = emptyList()
)
