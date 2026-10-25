package com.example

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.saferoute.data.model.RouteOption
import com.example.saferoute.data.model.TimeOfDay
import com.example.saferoute.data.network.GeoapifyService
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ExampleRobolectricTest {

  @Test
  fun `read string from context`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val appName = context.getString(R.string.app_name)
    assertEquals("SafeRoute", appName)
  }

  @Test
  fun testPeelameduToSitraGeocodingAndRouting() = kotlinx.coroutines.runBlocking {
    val context = ApplicationProvider.getApplicationContext<Context>()

    // 1. Geocode Peelamedu
    val peelamedu = GeoapifyService.geocodePlace("Peelamedu")
    if (peelamedu != null) {
      assertTrue("Peelamedu latitude should be around 11.00-11.06", peelamedu.latitude in 11.00..11.06)
      assertTrue("Peelamedu longitude should be around 76.95-77.05", peelamedu.longitude in 76.95..77.05)
    }

    // 2. Geocode Sitra
    val sitra = GeoapifyService.geocodePlace("Sitra")
    if (sitra != null) {
      assertTrue("Sitra latitude should be around 11.00-11.06", sitra.latitude in 11.00..11.06)
      assertTrue("Sitra longitude should be around 77.00-77.08", sitra.longitude in 77.00..77.08)
    }

    // 3. Test Geoapify routing from Peelamedu to Sitra
    val startPt = if (peelamedu != null) Pair(peelamedu.latitude, peelamedu.longitude) else Pair(11.0280, 77.0050)
    val endPt = if (sitra != null) Pair(sitra.latitude, sitra.longitude) else Pair(11.0330, 77.0380)
    val waypoints = listOf(startPt, endPt)
    val routes = GeoapifyService.fetchRealRoutes(
      waypoints = waypoints,
      originName = "Peelamedu",
      destinationName = "Sitra",
      context = context
    )

    if (routes.isNotEmpty()) {
      val selectedRoute: RouteOption = routes.first()
      assertFalse("Route path coordinates should not be empty", selectedRoute.pathCoordinates.isEmpty())

      val startCoord = selectedRoute.pathCoordinates.first()
      assertTrue("Start coordinate latitude should be near startPt", Math.abs(startCoord.first - startPt.first) < 0.1)
      assertTrue("Start coordinate longitude should be near startPt", Math.abs(startCoord.second - startPt.second) < 0.1)

      val endCoord = selectedRoute.pathCoordinates.last()
      assertTrue("End coordinate latitude should be near endPt", Math.abs(endCoord.first - endPt.first) < 0.1)
      assertTrue("End coordinate longitude should be near endPt", Math.abs(endCoord.second - endPt.second) < 0.1)
    } else {
      // If offline or placeholder API key, error message should be populated or graceful
      assertNotNull(GeoapifyService.lastErrorMessage.value)
    }
  }

  @Test
  fun testPeelameduToGandhipuramRouteScoreDifferentiation() = kotlinx.coroutines.runBlocking {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val originCoord = Pair(11.0280, 77.0050) // Peelamedu
    val destCoord = Pair(11.0168, 76.9558)   // Gandhipuram
    val waypoints = listOf(originCoord, destCoord)

    val routes = GeoapifyService.fetchRealRoutes(
      waypoints = waypoints,
      originName = "Peelamedu",
      destinationName = "Gandhipuram",
      timeOfDay = TimeOfDay.DUSK,
      context = context
    )

    if (routes.size >= 2) {
      val r0 = routes[0]
      val r1 = routes[1]

      println("Route 0: ${r0.name} -> Score: ${r0.safetyDetails.compositeScore}, Recommended: ${r0.isRecommended}")
      println("Route 1: ${r1.name} -> Score: ${r1.safetyDetails.compositeScore}, Recommended: ${r1.isRecommended}")

      // Verify differentiation between alternative routes
      assertNotEquals("Alternative routes should not have identical composite safety scores",
        r0.safetyDetails.compositeScore, r1.safetyDetails.compositeScore)
      assertNotEquals("Route names should be distinct", r0.name, r1.name)
    }
  }
}
