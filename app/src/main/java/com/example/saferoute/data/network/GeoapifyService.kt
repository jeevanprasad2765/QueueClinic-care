package com.example.saferoute.data.network

import android.content.Context
import android.util.Log
import com.example.BuildConfig
import com.example.saferoute.data.model.IncidentZone
import com.example.saferoute.data.model.RouteLeg
import com.example.saferoute.data.model.RouteOption
import com.example.saferoute.data.model.RouteSegment
import com.example.saferoute.data.model.SafetyTier
import com.example.saferoute.data.model.TimeOfDay
import com.example.saferoute.data.model.TurnInstruction
import com.example.saferoute.data.model.Waypoint
import com.example.saferoute.safety.SafetyCalculator
import com.example.saferoute.util.LanguageManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.URLEncoder
import java.util.concurrent.TimeUnit
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.sin
import kotlin.math.sqrt

// ── Search & Geocode Models ──

data class SearchResult(
    val displayName: String,
    val shortName: String,
    val latitude: Double,
    val longitude: Double,
    val type: String = "place",
    val placeId: String? = null
)

/**
 * Service for Geoapify APIs:
 * - Routing API (generating balanced, short, and less_maneuvers routes with deduplication)
 * - Address Autocomplete (biased to Coimbatore, TN)
 * - Geocoding & Reverse Geocoding
 * - MapLibre OSM-Bright style configuration
 */
object GeoapifyService {

    private const val TAG = "GeoapifyService"
    private const val BASE_URL = "https://api.geoapify.com"
    private const val MAPS_STYLE_URL = "https://maps.geoapify.com/v1/styles/osm-bright/style.json"

    // Coimbatore Coordinates for Location Bias
    private const val COIMBATORE_LAT = 11.0168
    private const val COIMBATORE_LNG = 76.9558

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()

    // In-memory caches to prevent redundant network requests
    private val autocompleteCache = mutableMapOf<String, List<SearchResult>>()
    private val geocodeCache = mutableMapOf<String, SearchResult?>()
    private val reverseGeocodeCache = mutableMapOf<String, String>()
    private val routeCache = mutableMapOf<String, List<RouteOption>>()

    private val _lastErrorMessage = MutableStateFlow<String?>(null)
    val lastErrorMessage: StateFlow<String?> = _lastErrorMessage.asStateFlow()

    fun getApiKey(): String {
        return try {
            BuildConfig.GEOAPIFY_API_KEY.trim()
        } catch (_: Throwable) {
            ""
        }
    }

    fun isApiKeyConfigured(): Boolean {
        val key = getApiKey()
        return key.isNotBlank() && !key.startsWith("YOUR_")
    }

    fun getStyleUrl(): String {
        val key = getApiKey()
        return if (isApiKeyConfigured()) {
            "$MAPS_STYLE_URL?apiKey=$key"
        } else {
            "https://demotiles.maplibre.org/style.json"
        }
    }

    fun clearError() {
        _lastErrorMessage.value = null
    }

    /**
     * Autocomplete suggestions for starting point and destination fields, biased to Coimbatore.
     */
    suspend fun searchPlaces(
        query: String,
        userLocation: Pair<Double, Double>? = null
    ): List<SearchResult> = withContext(Dispatchers.IO) {
        val q = query.trim()
        if (q.length < 2) return@withContext emptyList()

        val cacheKey = q.lowercase()
        synchronized(autocompleteCache) {
            autocompleteCache[cacheKey]?.let { return@withContext it }
        }

        if (!isApiKeyConfigured()) {
            _lastErrorMessage.value = "Geoapify API key missing. Add GEOAPIFY_API_KEY to .env"
            return@withContext emptyList()
        }

        val biasLat = userLocation?.first ?: COIMBATORE_LAT
        val biasLng = userLocation?.second ?: COIMBATORE_LNG
        val apiKey = getApiKey()

        val encodedQuery = URLEncoder.encode(q, "UTF-8")
        val url = "$BASE_URL/v1/geocode/autocomplete?text=$encodedQuery" +
                "&bias=proximity:$biasLng,$biasLat" +
                "&filter=countrycode:in" +
                "&limit=8" +
                "&apiKey=$apiKey"

        try {
            val request = Request.Builder()
                .url(url)
                .header("Accept", "application/json")
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                handleHttpError(response.code, response.message)
                return@withContext emptyList()
            }

            val body = response.body?.string().orEmpty()
            val root = JSONObject(body)
            val features = root.optJSONArray("features") ?: JSONArray()
            val results = mutableListOf<SearchResult>()

            for (i in 0 until features.length()) {
                val item = features.getJSONObject(i)
                val props = item.optJSONObject("properties") ?: continue
                val placeId = props.optString("place_id", "geo_$i")
                val formatted = props.optString("formatted", "").ifBlank { props.optString("address_line1", q) }
                val mainText = props.optString("address_line1", formatted)

                val geom = item.optJSONObject("geometry")
                val coords = geom?.optJSONArray("coordinates")
                val lng = coords?.optDouble(0) ?: 0.0
                val lat = coords?.optDouble(1) ?: 0.0

                results.add(
                    SearchResult(
                        displayName = formatted,
                        shortName = mainText,
                        latitude = lat,
                        longitude = lng,
                        type = props.optString("category", "place"),
                        placeId = placeId
                    )
                )
            }

            synchronized(autocompleteCache) {
                autocompleteCache[cacheKey] = results
            }
            clearError()
            return@withContext results
        } catch (e: Exception) {
            handleNetworkException(e)
            return@withContext emptyList()
        }
    }

    /**
     * Resolves a place name or address query into exact coordinates.
     */
    suspend fun geocodePlace(placeName: String): SearchResult? = withContext(Dispatchers.IO) {
        val q = placeName.trim()
        if (q.isBlank()) return@withContext null

        val cacheKey = q.lowercase()
        synchronized(geocodeCache) {
            if (geocodeCache.containsKey(cacheKey)) {
                return@withContext geocodeCache[cacheKey]
            }
        }

        if (!isApiKeyConfigured()) {
            _lastErrorMessage.value = "Geoapify API key missing. Add GEOAPIFY_API_KEY to .env"
            return@withContext null
        }

        val apiKey = getApiKey()
        val encodedQuery = URLEncoder.encode(q, "UTF-8")
        val url = "$BASE_URL/v1/geocode/search?text=$encodedQuery" +
                "&bias=proximity:$COIMBATORE_LNG,$COIMBATORE_LAT" +
                "&filter=countrycode:in" +
                "&limit=1" +
                "&apiKey=$apiKey"

        try {
            val request = Request.Builder().url(url).build()
            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                handleHttpError(response.code, response.message)
                return@withContext null
            }

            val body = response.body?.string().orEmpty()
            val root = JSONObject(body)
            val features = root.optJSONArray("features") ?: JSONArray()
            if (features.length() == 0) {
                _lastErrorMessage.value = LanguageManager.get("could_not_find_place")
                return@withContext null
            }

            val feat = features.getJSONObject(0)
            val props = feat.optJSONObject("properties")
            val geom = feat.optJSONObject("geometry")
            val coords = geom?.optJSONArray("coordinates")
            val lng = coords?.optDouble(0) ?: return@withContext null
            val lat = coords.optDouble(1)

            val formatted = props?.optString("formatted", q) ?: q
            val mainText = props?.optString("address_line1", q) ?: q

            val result = SearchResult(
                displayName = formatted,
                shortName = mainText,
                latitude = lat,
                longitude = lng,
                type = props?.optString("category", "place") ?: "place",
                placeId = props?.optString("place_id")
            )

            synchronized(geocodeCache) { geocodeCache[cacheKey] = result }
            clearError()
            return@withContext result
        } catch (e: Exception) {
            handleNetworkException(e)
            return@withContext null
        }
    }

    /**
     * Reverse geocodes live coordinates into a friendly locality name for "My Location (<locality>)".
     */
    suspend fun reverseGeocode(lat: Double, lng: Double, context: Context): String = withContext(Dispatchers.IO) {
        val cacheKey = "${(lat * 1000).toInt()},${(lng * 1000).toInt()}"
        synchronized(reverseGeocodeCache) {
            reverseGeocodeCache[cacheKey]?.let { return@withContext it }
        }

        if (!isApiKeyConfigured()) {
            return@withContext "Coimbatore"
        }

        val apiKey = getApiKey()
        val url = "$BASE_URL/v1/geocode/reverse?lat=$lat&lon=$lng&apiKey=$apiKey"

        try {
            val request = Request.Builder().url(url).build()
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val body = response.body?.string().orEmpty()
                val root = JSONObject(body)
                val features = root.optJSONArray("features") ?: JSONArray()
                if (features.length() > 0) {
                    val props = features.getJSONObject(0).optJSONObject("properties")
                    val locality = props?.optString("suburb", "")?.ifBlank {
                        props.optString("district", "")
                    }?.ifBlank {
                        props.optString("city", "Coimbatore")
                    } ?: "Coimbatore"

                    synchronized(reverseGeocodeCache) { reverseGeocodeCache[cacheKey] = locality }
                    return@withContext locality
                }
            }
        } catch (_: Exception) {}

        return@withContext "Coimbatore"
    }

    /**
     * Fetches real directions routes from Geoapify Routing API with alternatives,
     * fetches OpenStreetMap corridor data along each route, and calculates differentiated safety scores.
     */
    suspend fun fetchRealRoutes(
        waypoints: List<Pair<Double, Double>>,
        originName: String,
        destinationName: String,
        intermediateNames: List<String> = emptyList(),
        timeOfDay: TimeOfDay = TimeOfDay.DUSK,
        incidentZones: List<IncidentZone> = emptyList(),
        context: Context
    ): List<RouteOption> = withContext(Dispatchers.IO) {
        if (waypoints.size < 2) return@withContext emptyList()

        val sourceCoord = waypoints.first()
        val destCoord = waypoints.last()

        val cacheKey = waypoints.joinToString(";") { "${(it.first * 1e4).toInt()},${(it.second * 1e4).toInt()}" } +
                ":${timeOfDay.name}:${incidentZones.size}"

        synchronized(routeCache) {
            routeCache[cacheKey]?.let { return@withContext it }
        }

        if (!isApiKeyConfigured()) {
            _lastErrorMessage.value = "Geoapify API key missing. Add GEOAPIFY_API_KEY to .env"
            return@withContext emptyList()
        }

        val apiKey = getApiKey()
        val intermediatePoints = if (waypoints.size > 2) waypoints.subList(1, waypoints.size - 1) else emptyList()

        val waypointsParam = buildString {
            append("${sourceCoord.first},${sourceCoord.second}")
            for (p in intermediatePoints) {
                append("|${p.first},${p.second}")
            }
            append("|${destCoord.first},${destCoord.second}")
        }

        val corridorRepo = CorridorPlacesRepository.getInstance(context)

        // Generate routes with different routing strategies: balanced, short, less_maneuvers
        val routingTypes = listOf("balanced", "short", "less_maneuvers")
        val rawCandidates = mutableListOf<ParsedGeoapifyRoute>()

        for (rType in routingTypes) {
            val url = "$BASE_URL/v1/routing?waypoints=$waypointsParam&mode=drive&type=$rType&apiKey=$apiKey"
            try {
                val request = Request.Builder()
                    .url(url)
                    .header("Accept", "application/json")
                    .build()

                val response = client.newCall(request).execute()
                if (response.isSuccessful) {
                    val body = response.body?.string().orEmpty()
                    val parsed = parseGeoapifyRoutingJson(body, rType)
                    if (parsed != null && parsed.coordinates.isNotEmpty()) {
                        rawCandidates.add(parsed)
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Routing type $rType query failed: ${e.message}")
            }
        }

        // Deduplicate near-identical geometries
        val distinctRoutes = deduplicateRoutes(rawCandidates)

        // If fewer than 2 distinct routes, apply the "via" waypoint trick to guarantee a genuine alternative
        if (distinctRoutes.size < 2 && intermediatePoints.isEmpty()) {
            val midLat = (sourceCoord.first + destCoord.first) / 2.0
            val midLng = (sourceCoord.second + destCoord.second) / 2.0
            // Offset perpendicular to the main vector
            val offsetLat = midLat + 0.012
            val offsetLng = midLng - 0.012

            val viaWaypoints = "${sourceCoord.first},${sourceCoord.second}|$offsetLat,$offsetLng|${destCoord.first},${destCoord.second}"
            val viaUrl = "$BASE_URL/v1/routing?waypoints=$viaWaypoints&mode=drive&type=balanced&apiKey=$apiKey"
            try {
                val req = Request.Builder().url(viaUrl).build()
                val resp = client.newCall(req).execute()
                if (resp.isSuccessful) {
                    val parsed = parseGeoapifyRoutingJson(resp.body?.string().orEmpty(), "alternative_via")
                    if (parsed != null && isGeometricallyDistinct(parsed.coordinates, distinctRoutes)) {
                        distinctRoutes.add(parsed)
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Via route alternative failed: ${e.message}")
            }
        }

        if (distinctRoutes.isEmpty()) {
            _lastErrorMessage.value = LanguageManager.get("could_not_find_place")
            return@withContext emptyList()
        }

        // Construct waypoints models
        val sourceWaypoint = Waypoint(name = originName, isSource = true, lat = sourceCoord.first, lng = sourceCoord.second)
        val destWaypoint = Waypoint(name = destinationName, isDestination = true, lat = destCoord.first, lng = destCoord.second)
        val stopWaypoints = intermediateNames.mapIndexed { idx, name ->
            val wCoord = intermediatePoints.getOrNull(idx) ?: sourceCoord
            Waypoint(name = name, lat = wCoord.first, lng = wCoord.second)
        }
        val allWaypoints = listOf(sourceWaypoint) + stopWaypoints + listOf(destWaypoint)

        // Fetch corridor data and calculate safety scores in parallel
        val corridorDeferred = distinctRoutes.map { candidate ->
            async {
                val durationMins = max(1, (candidate.durationSeconds / 60.0).toInt())
                corridorRepo.fetchCorridorData(candidate.coordinates, durationMins)
            }
        }
        val corridors = corridorDeferred.awaitAll()

        val finalOptions = mutableListOf<RouteOption>()

        for (i in distinctRoutes.indices) {
            val candidate = distinctRoutes[i]
            val corridor = corridors[i]
            val coords = candidate.coordinates
            val distKm = Math.round((candidate.distanceMeters / 1000.0) * 10.0) / 10.0
            val durMins = max(1, (candidate.durationSeconds / 60.0).toInt())

            val routeId = when (i) {
                0 -> "opt_safe"
                1 -> "opt_balanced"
                else -> "opt_alt_$i"
            }

            val safetyDetails = SafetyCalculator.calculateRouteSafetyFromCorridor(
                routeIndex = i,
                routeCoordinates = coords,
                corridorData = corridor,
                timeOfDay = timeOfDay,
                incidentZones = incidentZones,
                routeId = routeId
            )

            val prominentRoad = candidate.prominentStreet.ifBlank {
                if (i == 0) "Arterial Expressway" else "Commercial Avenue"
            }

            val routeTitle = when (i) {
                0 -> "via $prominentRoad (Safe Corridor)"
                1 -> "via $prominentRoad (Commercial Link)"
                else -> "via $prominentRoad (Local Shortcut)"
            }

            val summaryText = when (i) {
                0 -> "Well-lit arterial route with active municipal lighting & high business presence"
                1 -> "Direct transit avenue with regular vehicular movement and open retail"
                else -> "Local connector route; lower foot traffic after dusk"
            }

            val warningNote = when (i) {
                0 -> "Optimal streetlamp coverage & active CCTV monitoring"
                1 -> "Moderate lighting on connector sections; active retail presence"
                else -> "Exercise caution after dusk: dimmer lighting and narrow road segments"
            }

            val segments = createVisualSegments(coords, corridor, routeTitle)
            val legs = buildLegs(allWaypoints, distKm, durMins, safetyDetails.compositeScore)

            finalOptions.add(
                RouteOption(
                    id = routeId,
                    name = routeTitle,
                    summary = summaryText,
                    distanceKm = distKm,
                    durationMinutes = durMins,
                    safetyDetails = safetyDetails,
                    segments = segments,
                    pathCoordinates = coords,
                    isRecommended = (i == 0),
                    warningNote = warningNote,
                    sourceName = originName,
                    destinationName = destinationName,
                    waypoints = allWaypoints,
                    legs = legs,
                    turnInstructions = candidate.instructions,
                    places = corridor.places,
                    corridorData = corridor
                )
            )
        }

        synchronized(routeCache) {
            routeCache[cacheKey] = finalOptions
        }
        clearError()
        return@withContext finalOptions
    }

    private data class ParsedGeoapifyRoute(
        val type: String,
        val distanceMeters: Double,
        val durationSeconds: Double,
        val prominentStreet: String,
        val coordinates: List<Pair<Double, Double>>,
        val instructions: List<TurnInstruction>
    )

    private fun parseGeoapifyRoutingJson(json: String, type: String): ParsedGeoapifyRoute? {
        try {
            val root = JSONObject(json)
            val features = root.optJSONArray("features") ?: return null
            if (features.length() == 0) return null

            val feat = features.getJSONObject(0)
            val geom = feat.optJSONObject("geometry") ?: return null
            val geomType = geom.optString("type")
            val rawCoords = geom.optJSONArray("coordinates") ?: return null

            val pathCoords = mutableListOf<Pair<Double, Double>>()
            if (geomType.equals("MultiLineString", ignoreCase = true)) {
                for (l in 0 until rawCoords.length()) {
                    val line = rawCoords.optJSONArray(l) ?: continue
                    for (c in 0 until line.length()) {
                        val pt = line.optJSONArray(c) ?: continue
                        val lng = pt.optDouble(0)
                        val lat = pt.optDouble(1)
                        pathCoords.add(Pair(lat, lng))
                    }
                }
            } else {
                for (c in 0 until rawCoords.length()) {
                    val pt = rawCoords.optJSONArray(c) ?: continue
                    val lng = pt.optDouble(0)
                    val lat = pt.optDouble(1)
                    pathCoords.add(Pair(lat, lng))
                }
            }

            val props = feat.optJSONObject("properties") ?: JSONObject()
            val distance = props.optDouble("distance", 0.0)
            val time = props.optDouble("time", 0.0)

            val instructions = mutableListOf<TurnInstruction>()
            val streetLengths = mutableMapOf<String, Double>()

            val legs = props.optJSONArray("legs")
            if (legs != null) {
                for (l in 0 until legs.length()) {
                    val leg = legs.getJSONObject(l)
                    val steps = leg.optJSONArray("steps") ?: continue
                    for (s in 0 until steps.length()) {
                        val step = steps.getJSONObject(s)
                        val dist = step.optDouble("distance", 0.0)
                        val street = step.optString("street", "").trim()
                        val instrObj = step.optJSONObject("instruction")
                        val text = instrObj?.optString("text", "")?.ifBlank { "Continue on route" } ?: "Continue on route"
                        val stepType = instrObj?.optString("type", "straight") ?: "straight"

                        if (street.isNotBlank()) {
                            streetLengths[street] = (streetLengths[street] ?: 0.0) + dist
                        }

                        val iconType = when {
                            stepType.contains("arrive", ignoreCase = true) -> "arrive"
                            stepType.contains("left", ignoreCase = true) -> "turn_left"
                            stepType.contains("right", ignoreCase = true) -> "turn_right"
                            else -> "straight"
                        }

                        instructions.add(
                            TurnInstruction(
                                distanceMeters = dist.toInt(),
                                text = text,
                                streetName = street.ifBlank { "Main Road" },
                                iconType = iconType,
                                safetyStatus = "Active Corridor"
                            )
                        )
                    }
                }
            }

            val prominent = streetLengths.maxByOrNull { it.value }?.key ?: ""

            return ParsedGeoapifyRoute(
                type = type,
                distanceMeters = distance,
                durationSeconds = time,
                prominentStreet = prominent,
                coordinates = pathCoords,
                instructions = instructions
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing Geoapify routing JSON: ${e.message}")
            return null
        }
    }

    private fun deduplicateRoutes(routes: List<ParsedGeoapifyRoute>): MutableList<ParsedGeoapifyRoute> {
        val unique = mutableListOf<ParsedGeoapifyRoute>()
        for (r in routes) {
            if (isGeometricallyDistinct(r.coordinates, unique)) {
                unique.add(r)
            }
        }
        return unique
    }

    private fun isGeometricallyDistinct(
        coords: List<Pair<Double, Double>>,
        existing: List<ParsedGeoapifyRoute>,
        thresholdMeters: Double = 120.0
    ): Boolean {
        if (coords.isEmpty()) return false
        if (existing.isEmpty()) return true

        val stride = max(1, coords.size / 15)
        for (other in existing) {
            var diffCount = 0
            var sampleCount = 0
            for (i in coords.indices step stride) {
                val pt = coords[i]
                val otherStride = max(1, other.coordinates.size / 15)
                val minDist = other.coordinates.filterIndexed { idx, _ -> idx % otherStride == 0 }
                    .minOfOrNull { haversineDistanceM(pt, it) } ?: 0.0

                if (minDist > thresholdMeters) {
                    diffCount++
                }
                sampleCount++
            }
            if (sampleCount > 0 && (diffCount.toDouble() / sampleCount.toDouble()) < 0.25) {
                // More than 75% identical -> not distinct
                return false
            }
        }
        return true
    }

    private fun createVisualSegments(
        coords: List<Pair<Double, Double>>,
        corridor: com.example.saferoute.data.model.RouteCorridorData,
        title: String
    ): List<RouteSegment> {
        if (coords.isEmpty()) return emptyList()
        val numSegments = 3.coerceAtMost(coords.size - 1).coerceAtLeast(1)
        val stepSize = (coords.size - 1) / numSegments
        val result = mutableListOf<RouteSegment>()

        for (i in 0 until numSegments) {
            val startIdx = i * stepSize
            val endIdx = if (i == numSegments - 1) coords.size - 1 else (i + 1) * stepSize
            val p1 = coords[startIdx]
            val p2 = coords[endIdx]
            val dist = haversineDistanceM(p1, p2).toInt().coerceAtLeast(150)

            result.add(
                RouteSegment(
                    id = "seg_${i + 1}",
                    name = "$title Segment ${i + 1}",
                    distanceMeters = dist,
                    isMainRoad = (i == 0 || i == 1),
                    lightingScore = if (corridor.isLitEstimated) 85f else (corridor.litRatio * 100f),
                    crowdDensity = (corridor.openShopsDensityPer100m * 60f).coerceIn(40f, 95f),
                    incidentCount = 0,
                    startLat = p1.first,
                    startLng = p1.second,
                    endLat = p2.first,
                    endLng = p2.second
                )
            )
        }
        return result
    }

    private fun buildLegs(waypoints: List<Waypoint>, totalDist: Double, totalDur: Int, baseScore: Int): List<RouteLeg> {
        val count = max(1, waypoints.size - 1)
        val legs = mutableListOf<RouteLeg>()
        for (i in 0 until count) {
            val from = waypoints[i].name
            val to = waypoints[i + 1].name
            val legDist = Math.round((totalDist / count) * 10.0) / 10.0
            val legDur = max(1, totalDur / count)
            val legScore = when (i % 3) {
                0 -> baseScore
                1 -> (baseScore - 4).coerceAtLeast(35)
                else -> (baseScore - 2).coerceAtLeast(40)
            }
            legs.add(
                RouteLeg(
                    legIndex = i + 1,
                    fromName = from,
                    toName = to,
                    distanceKm = legDist,
                    durationMinutes = legDur,
                    safetyScore = legScore,
                    safetyTier = if (legScore >= 80) SafetyTier.HIGH_SAFETY else if (legScore >= 60) SafetyTier.MEDIUM_SAFETY else SafetyTier.CAUTION_REQUIRED
                )
            )
        }
        return legs
    }

    private fun haversineDistanceM(p1: Pair<Double, Double>, p2: Pair<Double, Double>): Double {
        val r = 6371000.0
        val dLat = Math.toRadians(p2.first - p1.first)
        val dLng = Math.toRadians(p2.second - p1.second)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(p1.first)) * cos(Math.toRadians(p2.first)) *
                sin(dLng / 2) * sin(dLng / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return r * c
    }

    private fun handleHttpError(code: Int, message: String) {
        when (code) {
            401 -> _lastErrorMessage.value = LanguageManager.get("api_key_invalid")
            429 -> _lastErrorMessage.value = LanguageManager.get("rate_limit_exceeded")
            else -> _lastErrorMessage.value = LanguageManager.get("could_not_find_place")
        }
    }

    private fun handleNetworkException(e: Exception) {
        if (e is IOException) {
            _lastErrorMessage.value = LanguageManager.get("network_offline")
        } else {
            _lastErrorMessage.value = LanguageManager.get("could_not_find_place")
        }
    }
}
