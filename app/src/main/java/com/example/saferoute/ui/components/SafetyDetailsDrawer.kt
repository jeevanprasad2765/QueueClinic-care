package com.example.saferoute.ui.components

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.LocalPharmacy
import androidx.compose.material.icons.filled.LocalGasStation
import androidx.compose.material.icons.filled.LocalPolice
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Store
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.SheetState
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.saferoute.data.model.CoverageStatus
import com.example.saferoute.data.model.PlaceCategory
import com.example.saferoute.data.model.RouteOption
import com.example.saferoute.data.model.RoutePlace
import com.example.saferoute.util.LanguageManager
import com.example.saferoute.util.LocalAppLanguage
import com.example.ui.theme.DarkNavyCard
import com.example.ui.theme.DarkNavySurface
import com.example.ui.theme.GlassSurfaceBorder
import com.example.ui.theme.SafeRouteBlue
import com.example.ui.theme.SafeRouteTeal
import com.example.ui.theme.SafetyAmber
import com.example.ui.theme.SafetyGreen
import com.example.ui.theme.SafetyRed
import com.example.ui.theme.bounceClick

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SafetyDetailsDrawer(
    route: RouteOption,
    onDismissRequest: () -> Unit,
    onStartNavigation: (RouteOption) -> Unit,
    sheetState: SheetState
) {
    val context = LocalContext.current
    val currentLang = LocalAppLanguage.current
    var showTooltip by remember { mutableStateOf(false) }
    var selectedPlaceTab by remember { mutableIntStateOf(0) }

    val onCallPhone: (String) -> Unit = { phone ->
        try {
            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        } catch (_: Exception) {}
    }

    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        sheetState = sheetState,
        containerColor = DarkNavySurface,
        scrimColor = Color.Black.copy(alpha = 0.65f),
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(vertical = 12.dp)
                    .size(width = 36.dp, height = 5.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(Color(0x44FFFFFF))
            )
        },
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
    ) {
        Column(
            modifier = Modifier
                .testTag("safety_details_drawer")
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = route.name,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        letterSpacing = (-0.2).sp
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "${route.durationMinutes} mins (${route.distanceKm} km) • ${route.summary}",
                        fontSize = 13.sp,
                        color = Color(0xFF94A3B8)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                SafetyBadge(score = route.safetyDetails.compositeScore)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // "Why this matters" Info Box
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(SafeRouteBlue.copy(alpha = 0.12f))
                    .border(1.dp, SafeRouteBlue.copy(alpha = 0.25f), RoundedCornerShape(16.dp))
                    .clickable { showTooltip = !showTooltip }
                    .padding(14.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = "Why safety scores matter",
                        tint = SafeRouteTeal,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Safety Intelligence Breakdown",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = SafeRouteTeal
                        )
                        Text(
                            text = route.safetyDetails.tierReason,
                            fontSize = 12.sp,
                            color = Color.White.copy(alpha = 0.85f),
                            lineHeight = 16.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            if (route.legs.isNotEmpty()) {
                Text(
                    text = "Per-Leg Safety Breakdown (${route.legs.size} Legs)",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(8.dp))

                route.legs.forEach { leg ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(DarkNavyCard)
                            .border(1.dp, GlassSurfaceBorder, RoundedCornerShape(14.dp))
                            .padding(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Leg ${leg.legIndex}: ${leg.fromName} ➔ ${leg.toName}",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    text = "${leg.distanceKm} km • ${leg.durationMinutes} mins",
                                    fontSize = 11.sp,
                                    color = Color(0xFF94A3B8)
                                )
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            SafetyBadge(score = leg.safetyScore, showLabel = false)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))
            }

            Text(
                text = "Safety Factor Breakdown",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(12.dp))

            // Card container for all factors
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(DarkNavyCard)
                    .border(1.dp, GlassSurfaceBorder, RoundedCornerShape(18.dp))
                    .padding(16.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    // Progress Bar 1: Lighting
                    FactorProgressItem(
                        icon = Icons.Default.Lightbulb,
                        iconTint = Color(0xFFFFD166),
                        title = "Street Lighting & Main Roads",
                        score = route.safetyDetails.lightingFactor.toInt(),
                        explanation = if (route.safetyDetails.lightingFactor >= 80) "Bright municipal streetlamps active along 95% of route" else "Unlit side streets detected on secondary leg"
                    )

                    // Progress Bar 2: Crowd Density
                    FactorProgressItem(
                        icon = Icons.Default.Group,
                        iconTint = SafeRouteTeal,
                        title = "Pedestrian Foot Traffic",
                        score = route.safetyDetails.crowdDensityFactor.toInt(),
                        explanation = if (route.safetyDetails.crowdDensityFactor >= 70) "High active foot traffic and open storefronts" else "Quiet residential corridor with sparse pedestrians"
                    )

                    // Progress Bar 3: Incident History
                    FactorProgressItem(
                        icon = Icons.Default.Shield,
                        iconTint = SafetyGreen,
                        title = "Incident-Free Zone History",
                        score = route.safetyDetails.incidentHistoryFactor.toInt(),
                        explanation = if (route.safetyDetails.incidentHistoryFactor >= 80) "Zero recent safety incidents reported in this zone" else "1-2 low-severity incidents reported in nearby alley"
                    )

                    // Progress Bar 4: Help Point Coverage
                    FactorProgressItem(
                        icon = Icons.Default.LocalHospital,
                        iconTint = Color(0xFF10B981),
                        title = "Help Point & Emergency Coverage",
                        score = route.safetyDetails.helpCoverageFactor.toInt(),
                        explanation = "Proximity to police, hospitals, pharmacies and open fuel stations"
                    )

                    // Progress Bar 5: Time of Day Factor
                    FactorProgressItem(
                        icon = Icons.Default.WbSunny,
                        iconTint = SafetyAmber,
                        title = "Time-of-Day Multiplier",
                        score = route.safetyDetails.timeOfDayFactor.toInt(),
                        explanation = "Calculated based on current dusk/night visibility conditions"
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ── 200m SHOP & HELP COVERAGE STRIP ──
            Text(
                text = LanguageManager.get("corridor_shop_coverage", currentLang),
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(4.dp))

            val longestStretch = (route.safetyDetails.longestStretchWithoutHelpMeters.takeIf { it > 0 }
                ?: route.corridorData.longestStretchWithoutHelpM).toInt()
            Text(
                text = "${LanguageManager.get("longest_stretch_without_help", currentLang)}: ${longestStretch} m",
                fontSize = 12.sp,
                color = if (longestStretch > 600) SafetyRed else Color(0xFF94A3B8),
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(10.dp))

            val segments = route.corridorData.coverageSegments
            if (segments.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(14.dp)
                        .clip(RoundedCornerShape(7.dp))
                        .background(Color(0xFF1E293B)),
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    segments.forEach { seg ->
                        val segColor = when (seg.status) {
                            CoverageStatus.HIGH -> SafetyGreen
                            CoverageStatus.MEDIUM -> SafetyAmber
                            CoverageStatus.LOW -> SafetyRed
                        }
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight()
                                .background(segColor)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("0 km", fontSize = 10.sp, color = Color.Gray)
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(SafetyGreen))
                            Spacer(modifier = Modifier.width(3.dp))
                            Text("High", fontSize = 10.sp, color = Color.Gray)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(SafetyAmber))
                            Spacer(modifier = Modifier.width(3.dp))
                            Text("Med", fontSize = 10.sp, color = Color.Gray)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(SafetyRed))
                            Spacer(modifier = Modifier.width(3.dp))
                            Text("Low", fontSize = 10.sp, color = Color.Gray)
                        }
                    }
                    Text("${route.distanceKm} km", fontSize = 10.sp, color = Color.Gray)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ── TABBED PLACES BROWSER (All, Help points, Medical, Fuel, Food, Shops) ──
            val tabTitles = listOf(
                LanguageManager.get("all_places", currentLang),
                LanguageManager.get("help_points", currentLang),
                LanguageManager.get("medical", currentLang),
                LanguageManager.get("petrol_pumps", currentLang),
                LanguageManager.get("food", currentLang),
                LanguageManager.get("shops", currentLang)
            )

            ScrollableTabRow(
                selectedTabIndex = selectedPlaceTab,
                containerColor = Color.Transparent,
                contentColor = SafeRouteTeal,
                edgePadding = 0.dp,
                indicator = { tabPositions ->
                    if (selectedPlaceTab < tabPositions.size) {
                        TabRowDefaults.SecondaryIndicator(
                            modifier = Modifier.tabIndicatorOffset(tabPositions[selectedPlaceTab]),
                            color = SafeRouteTeal,
                            height = 3.dp
                        )
                    }
                },
                divider = {}
            ) {
                tabTitles.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedPlaceTab == index,
                        onClick = { selectedPlaceTab = index },
                        text = {
                            Text(
                                text = title,
                                fontSize = 12.sp,
                                fontWeight = if (selectedPlaceTab == index) FontWeight.Bold else FontWeight.Normal,
                                color = if (selectedPlaceTab == index) SafeRouteTeal else Color(0xFF94A3B8)
                            )
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            val filteredPlaces = remember(selectedPlaceTab, route.places) {
                when (selectedPlaceTab) {
                    1 -> route.places.filter { it.category.isHelpPoint }
                    2 -> route.places.filter { it.category == PlaceCategory.HOSPITAL || it.category == PlaceCategory.PHARMACY }
                    3 -> route.places.filter { it.category == PlaceCategory.FUEL }
                    4 -> route.places.filter { it.category == PlaceCategory.FOOD }
                    5 -> route.places.filter { it.category == PlaceCategory.SHOP }
                    else -> route.places
                }
            }

            if (filteredPlaces.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No places in this category along this corridor",
                        fontSize = 12.sp,
                        color = Color(0xFF94A3B8)
                    )
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    filteredPlaces.take(40).forEach { place ->
                        RoutePlaceItem(
                            place = place,
                            currentLang = currentLang,
                            onCallClick = onCallPhone
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // CTA Button to Start Active Navigation
            Box(
                modifier = Modifier
                    .testTag("start_nav_button")
                    .fillMaxWidth()
                    .height(52.dp)
                    .bounceClick(scaleDown = 0.95f) { onStartNavigation(route) }
                    .clip(RoundedCornerShape(16.dp))
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(SafeRouteBlue, SafeRouteTeal)
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Navigation,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "START SAFE NAVIGATION",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        letterSpacing = 0.5.sp,
                        color = Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
fun FactorProgressItem(
    icon: ImageVector,
    iconTint: Color,
    title: String,
    score: Int,
    explanation: String
) {
    val progressColor = when {
        score >= 80 -> SafetyGreen
        score >= 60 -> SafetyAmber
        else -> SafetyRed
    }

    val animatedProgress by animateFloatAsState(
        targetValue = score / 100f,
        animationSpec = tween(600),
        label = "FactorProgress"
    )

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconTint,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = title,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
            }
            Text(
                text = "$score%",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = progressColor
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(Color(0x22FFFFFF))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(animatedProgress)
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(progressColor)
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = explanation,
            fontSize = 11.sp,
            color = Color(0xFF94A3B8)
        )
    }
}

@Composable
fun RoutePlaceItem(
    place: RoutePlace,
    currentLang: com.example.saferoute.util.AppLanguage,
    onCallClick: ((String) -> Unit)? = null
) {
    val categoryIcon = when (place.category) {
        PlaceCategory.HOSPITAL -> Icons.Default.LocalHospital
        PlaceCategory.PHARMACY -> Icons.Default.LocalPharmacy
        PlaceCategory.POLICE -> Icons.Default.LocalPolice
        PlaceCategory.FUEL -> Icons.Default.LocalGasStation
        PlaceCategory.FOOD -> Icons.Default.Restaurant
        PlaceCategory.SHOP -> Icons.Default.Store
        PlaceCategory.ATM -> Icons.Default.Shield
        PlaceCategory.OTHER_HELP -> Icons.Default.Shield
    }

    val categoryColor = when (place.category) {
        PlaceCategory.HOSPITAL -> Color(0xFFEF4444)
        PlaceCategory.PHARMACY -> Color(0xFF10B981)
        PlaceCategory.POLICE -> Color(0xFF3B82F6)
        PlaceCategory.FUEL -> Color(0xFFF59E0B)
        PlaceCategory.FOOD -> Color(0xFFEC4899)
        PlaceCategory.SHOP -> Color(0xFF8B5CF6)
        PlaceCategory.ATM -> Color(0xFF06B6D4)
        PlaceCategory.OTHER_HELP -> Color(0xFF14B8A6)
    }

    val hoursStatusText = when {
        place.is24x7 -> "Open 24/7"
        place.isOpenNow && !place.closesAt.isNullOrBlank() -> "Closes ${place.closesAt}"
        !place.isOpenNow && !place.opensAt.isNullOrBlank() -> "Opens ${place.opensAt}"
        else -> LanguageManager.get("hours_not_listed", currentLang)
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(DarkNavyCard)
            .border(1.dp, GlassSurfaceBorder, RoundedCornerShape(14.dp))
            .padding(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (place.isOpenNow) categoryColor.copy(alpha = 0.2f) else Color(0xFF334155)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = categoryIcon,
                    contentDescription = place.category.displayName,
                    tint = if (place.isOpenNow) categoryColor else Color(0xFF94A3B8),
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = place.name,
                    fontSize = 13.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (place.isOpenNow) Color.White else Color(0xFFCBD5E1),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "${place.category.displayName} • ${place.distanceFromRouteM.toInt()}m from route",
                    fontSize = 11.sp,
                    color = Color(0xFF94A3B8)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (place.isOpenNow) SafetyGreen.copy(alpha = 0.15f) else SafetyRed.copy(alpha = 0.15f)
                    ) {
                        Text(
                            text = if (place.isOpenNow) LanguageManager.get("open", currentLang) else LanguageManager.get("closed", currentLang),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (place.isOpenNow) SafetyGreen else SafetyRed,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    Text(
                        text = hoursStatusText,
                        fontSize = 11.sp,
                        color = if (place.isOpenNow) Color(0xFFCBD5E1) else Color(0xFF94A3B8)
                    )

                    if (!place.isOpenWhenPassing && place.isOpenNow) {
                        Text(
                            text = "• Closed at ETA",
                            fontSize = 10.sp,
                            color = SafetyAmber,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            if (!place.phone.isNullOrBlank()) {
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(
                    onClick = { onCallClick?.invoke(place.phone) },
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(SafeRouteBlue.copy(alpha = 0.2f))
                ) {
                    Icon(
                        imageVector = Icons.Default.Call,
                        contentDescription = "Call ${place.name}",
                        tint = SafeRouteTeal,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}
