package com.example.saferoute.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.example.saferoute.data.model.GroupMember
import com.example.saferoute.data.model.IncidentZone
import com.example.saferoute.data.model.RouteOption

/**
 * Native Google Maps Aubergine Engine Canvas for SafeRoute.
 * Direct bridge to GoogleMapView providing the custom dark "Night/Aubergine" theme style,
 * strict Coimbatore coordinate bounds, #00E676 safe corridor polyline rendering, #FF5252 cautionary areas,
 * and clean Google Maps controls without CartoDB attribution or synthetic heatmap grids.
 */
@Composable
fun MapViewCanvas(
    routes: List<RouteOption>,
    selectedRouteId: String?,
    onRouteSelected: (String) -> Unit,
    incidentZones: List<IncidentZone> = emptyList(),
    modifier: Modifier = Modifier,
    isNavigating: Boolean = false,
    activeInstructionText: String? = null,
    groupMembers: List<GroupMember> = emptyList(),
    showControls: Boolean = true
) {
    GoogleMapView(
        routes = routes,
        selectedRouteId = selectedRouteId,
        onRouteSelected = onRouteSelected,
        incidentZones = incidentZones,
        modifier = modifier,
        isNavigating = isNavigating,
        activeInstructionText = activeInstructionText,
        groupMembers = groupMembers,
        showControls = showControls
    )
}
