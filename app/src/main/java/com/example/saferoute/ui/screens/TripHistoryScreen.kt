package com.example.saferoute.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.saferoute.data.db.TripHistoryEntity
import com.example.saferoute.ui.components.SafetyBadge
import com.example.ui.theme.DarkNavyBackground
import com.example.ui.theme.DarkNavyCard
import com.example.ui.theme.DarkNavySurface
import com.example.ui.theme.GlassSurfaceBorder
import com.example.ui.theme.SafeRouteBlue
import com.example.ui.theme.SafeRouteTeal
import com.example.ui.theme.bounceClick
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun TripHistoryScreen(
    trips: List<TripHistoryEntity>,
    onSelectTrip: (TripHistoryEntity) -> Unit,
    onNavigateHome: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var sortBy by remember { mutableStateOf("DATE") } // "DATE", "SAFETY", "DISTANCE"

    val filteredTrips = remember(trips, searchQuery, sortBy) {
        val list = trips.filter {
            it.destinationName.contains(searchQuery, ignoreCase = true) ||
                    it.originName.contains(searchQuery, ignoreCase = true)
        }
        when (sortBy) {
            "SAFETY" -> list.sortedByDescending { it.avgSafetyScore }
            "DISTANCE" -> list.sortedByDescending { it.distanceKm }
            else -> list.sortedByDescending { it.timestamp }
        }
    }

    val dateFormat = remember { SimpleDateFormat("EEEE, MMM d, yyyy", Locale.getDefault()) }

    Column(
        modifier = Modifier
            .testTag("trip_history_screen")
            .fillMaxSize()
            .background(DarkNavyBackground)
            .padding(horizontal = 20.dp, vertical = 16.dp)
    ) {
        Text(
            text = "Trip Logs & Audits",
            fontSize = 24.sp,
            fontWeight = FontWeight.Black,
            color = Color.White,
            letterSpacing = (-0.5).sp
        )

        Spacer(modifier = Modifier.height(14.dp))

        // SEARCH & FILTER ROW
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Filter past trips...", fontSize = 13.sp, color = Color(0xFF64748B)) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = SafeRouteTeal, modifier = Modifier.size(18.dp)) },
                modifier = Modifier
                    .testTag("history_search_input")
                    .weight(1f),
                shape = RoundedCornerShape(16.dp),
                singleLine = true,
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = DarkNavyCard,
                    unfocusedContainerColor = DarkNavyCard,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedIndicatorColor = SafeRouteTeal,
                    unfocusedIndicatorColor = GlassSurfaceBorder
                )
            )

            Box(
                modifier = Modifier
                    .bounceClick(scaleDown = 0.92f) {
                        sortBy = when (sortBy) {
                            "DATE" -> "SAFETY"
                            "SAFETY" -> "DISTANCE"
                            else -> "DATE"
                        }
                    }
                    .clip(RoundedCornerShape(16.dp))
                    .background(DarkNavyCard)
                    .border(1.dp, GlassSurfaceBorder, RoundedCornerShape(16.dp))
                    .padding(horizontal = 14.dp, vertical = 14.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.FilterList, contentDescription = "Sort", tint = SafeRouteTeal, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = sortBy,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // EMPTY STATE
        if (filteredTrips.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(24.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(76.dp)
                            .clip(CircleShape)
                            .background(SafeRouteTeal.copy(alpha = 0.15f))
                            .border(1.dp, SafeRouteTeal.copy(alpha = 0.35f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.History,
                            contentDescription = "Empty History",
                            tint = SafeRouteTeal,
                            modifier = Modifier.size(40.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "No Saved Trips Found",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "Whenever you navigate using SafeRoute, your route safety metrics and history will appear here.",
                        fontSize = 13.sp,
                        color = Color(0xFF94A3B8)
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Box(
                        modifier = Modifier
                            .testTag("start_first_trip_button")
                            .bounceClick(scaleDown = 0.94f) { onNavigateHome() }
                            .clip(RoundedCornerShape(14.dp))
                            .background(
                                Brush.horizontalGradient(
                                    colors = listOf(SafeRouteBlue, SafeRouteTeal)
                                )
                            )
                            .padding(horizontal = 24.dp, vertical = 14.dp)
                    ) {
                        Text("TAKE YOUR FIRST SAFE TRIP", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 13.sp)
                    }
                }
            }
        } else {
            // LIST OF PAST TRIPS
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(filteredTrips) { trip ->
                    Box(
                        modifier = Modifier
                            .testTag("history_trip_item_${trip.id}")
                            .fillMaxWidth()
                            .bounceClick(scaleDown = 0.96f) { onSelectTrip(trip) }
                            .clip(RoundedCornerShape(20.dp))
                            .background(DarkNavyCard)
                            .border(1.dp, GlassSurfaceBorder, RoundedCornerShape(20.dp))
                            .padding(16.dp)
                    ) {
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = dateFormat.format(Date(trip.timestamp)),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF94A3B8)
                                )
                                SafetyBadge(score = trip.avgSafetyScore, showLabel = false)
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Text(
                                text = "${trip.originName} → ${trip.destinationName}",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )

                            Spacer(modifier = Modifier.height(6.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "${trip.routeTypeName} • ${trip.distanceKm} km • ${trip.durationSeconds / 60}m",
                                    fontSize = 12.sp,
                                    color = Color(0xFF94A3B8)
                                )

                                if (trip.userRating > 0) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFD166), modifier = Modifier.size(13.dp))
                                        Spacer(modifier = Modifier.width(3.dp))
                                        Text("${trip.userRating}/5", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
