package com.example.saferoute.safety

/**
 * Configuration of weights and benchmark thresholds for SafeRoute composite safety scoring.
 * 
 * Safety Score Architecture:
 * 1. Street Lighting & Road Infrastructure: 35%
 * 2. Active Commercial Presence & Pedestrian Footfall: 25%
 * 3. Emergency / Medical Help Coverage: 20%
 * 4. Incident Density Risk Proximity: 20%
 * 
 * Scaled by Time-of-Day Multiplier (Day: 1.0, Dusk: 0.85, Night: 0.70, Late Night: 0.55).
 */
object SafetyWeightConfig {

    // Component Weights (Sum = 1.0)
    const val WEIGHT_LIGHTING = 0.35f
    const val WEIGHT_ACTIVITY = 0.25f
    const val WEIGHT_HELP_COVERAGE = 0.20f
    const val WEIGHT_INCIDENT_HISTORY = 0.20f

    // Benchmark Normalization Constants
    /**
     * Target density of open businesses (shops, dining, ATMs) per 100 meters of route corridor
     * for full (100%) pedestrian activity score. (1.5 places per 100m ≈ 15 places per km).
     */
    const val TARGET_OPEN_PLACES_PER_100M = 1.2f

    /**
     * Maximum distance to an emergency/medical help point before help coverage score approaches zero.
     */
    const val MAX_HELP_DISTANCE_BENCHMARK_M = 1200.0

    /**
     * Threshold length of an unlit or isolated stretch without open businesses or help points
     * before severe penalty is deducted.
     */
    const val MAX_UNHELPED_STRETCH_THRESHOLD_M = 400.0

    /**
     * Highway classification safety scores used when direct OSM lit=* tags are missing.
     */
    val HIGHWAY_CLASS_PROXY_SCORES: Map<String, Float> = mapOf(
        "motorway" to 95f,
        "trunk" to 95f,
        "primary" to 92f,
        "primary_link" to 90f,
        "secondary" to 82f,
        "secondary_link" to 80f,
        "tertiary" to 72f,
        "tertiary_link" to 70f,
        "residential" to 62f,
        "living_street" to 60f,
        "service" to 45f,
        "unclassified" to 50f,
        "pedestrian" to 70f,
        "footway" to 35f,
        "path" to 30f,
        "track" to 25f
    )
}
