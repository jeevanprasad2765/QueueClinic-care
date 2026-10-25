package com.example

import com.example.saferoute.data.model.IncidentZone
import com.example.saferoute.data.model.RouteSegment
import com.example.saferoute.data.model.TimeOfDay
import com.example.saferoute.safety.SafetyCalculator
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SafetyCalculatorTest {

    @Test
    fun testTwoRoutesWithDifferentGeometryGetDifferentScores() {
        // Incident zone near the secondary route
        val incidentZones = listOf(
            IncidentZone(
                id = "iz_1",
                latitude = 11.0210,
                longitude = 76.9560,
                radiusMeters = 200.0,
                severity = 4,
                category = "Low Lighting / Isolated",
                timestamp = "Recent"
            )
        )

        // Route A: Primary Main Arterial Road (High Lighting, High Crowd, Main Road, No Incident)
        val routeASegments = listOf(
            RouteSegment(
                id = "seg_a1",
                name = "Avinashi Road Expressway",
                distanceMeters = 2500,
                isMainRoad = true,
                lightingScore = 98f,
                crowdDensity = 92f,
                incidentCount = 0,
                startLat = 11.0168,
                startLng = 76.9558,
                endLat = 11.0250,
                endLng = 76.9800
            ),
            RouteSegment(
                id = "seg_a2",
                name = "Avinashi Road Corridor East",
                distanceMeters = 2800,
                isMainRoad = true,
                lightingScore = 95f,
                crowdDensity = 90f,
                incidentCount = 0,
                startLat = 11.0250,
                startLng = 76.9800,
                endLat = 11.0280,
                endLng = 77.0050
            )
        )

        // Route B: Local Alley & Cut-Through (Dim Lighting, Low Crowd, Not Main Road, Passes Incident Zone)
        val routeBSegments = listOf(
            RouteSegment(
                id = "seg_b1",
                name = "Back-Alley Service Track",
                distanceMeters = 1800,
                isMainRoad = false,
                lightingScore = 48f,
                crowdDensity = 35f,
                incidentCount = 1,
                startLat = 11.0205,
                startLng = 76.9555, // Very close to incident zone iz_1 (11.0210, 76.9560)
                endLat = 11.0230,
                endLng = 76.9700
            ),
            RouteSegment(
                id = "seg_b2",
                name = "Narrow Industrial Link",
                distanceMeters = 2200,
                isMainRoad = false,
                lightingScore = 42f,
                crowdDensity = 30f,
                incidentCount = 0,
                startLat = 11.0230,
                startLng = 76.9700,
                endLat = 11.0280,
                endLng = 77.0050
            )
        )

        val scoreA = SafetyCalculator.calculateRouteSafety(routeASegments, TimeOfDay.DUSK, incidentZones, "route_a")
        val scoreB = SafetyCalculator.calculateRouteSafety(routeBSegments, TimeOfDay.DUSK, incidentZones, "route_b")

        println("Route A Composite Score: ${scoreA.compositeScore} (Lighting=${scoreA.lightingFactor}, Crowd=${scoreA.crowdDensityFactor}, Incident=${scoreA.incidentHistoryFactor})")
        println("Route B Composite Score: ${scoreB.compositeScore} (Lighting=${scoreB.lightingFactor}, Crowd=${scoreB.crowdDensityFactor}, Incident=${scoreB.incidentHistoryFactor})")

        // Assert that the scores are significantly different and not identical
        assertNotEquals("Composite safety scores must not be equal", scoreA.compositeScore, scoreB.compositeScore)
        assertTrue("Route A score (${scoreA.compositeScore}) should be substantially higher than Route B (${scoreB.compositeScore})", scoreA.compositeScore > scoreB.compositeScore + 20)
        assertTrue("Route A should fall into High Safety tier (>=80)", scoreA.compositeScore >= 80)
        assertTrue("Route B should fall into Caution/Risk tier (<60)", scoreB.compositeScore < 60)
    }
}
