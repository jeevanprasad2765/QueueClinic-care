package com.example.saferoute.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Navigation
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.GlassSurfaceBorder
import com.example.ui.theme.GlassSurfaceDark
import com.example.ui.theme.SafeRouteBlue
import com.example.ui.theme.SafeRouteTeal
import com.example.ui.theme.TextSecondaryDark
import com.example.ui.theme.bounceClick

sealed class NavTab(
    val route: String,
    val title: String,
    val activeIcon: ImageVector,
    val inactiveIcon: ImageVector,
    val tag: String
) {
    object Home : NavTab("home", "Home", Icons.Filled.Home, Icons.Outlined.Home, "nav_home")
    object Navigate : NavTab("navigate", "Navigate", Icons.Filled.Navigation, Icons.Outlined.Navigation, "nav_navigate")
    object History : NavTab("history", "History", Icons.Filled.History, Icons.Outlined.History, "nav_history")
    object Profile : NavTab("profile", "Profile", Icons.Filled.Person, Icons.Outlined.Person, "nav_profile")
}

@Composable
fun BottomNavBar(
    currentRoute: String,
    onTabSelected: (NavTab) -> Unit,
    modifier: Modifier = Modifier
) {
    val tabs = listOf(NavTab.Home, NavTab.Navigate, NavTab.History, NavTab.Profile)

    Surface(
        modifier = modifier
            .testTag("bottom_nav_bar")
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.navigationBars),
        color = Color.Transparent
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            GlassSurfaceDark.copy(alpha = 0.95f)
                        )
                    )
                )
                .padding(horizontal = 16.dp, vertical = 6.dp)
        ) {
            // Floating Frosted Glass Dock
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(26.dp))
                    .background(GlassSurfaceDark)
                    .border(1.dp, GlassSurfaceBorder, RoundedCornerShape(26.dp))
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                tabs.forEach { tab ->
                    val isSelected = currentRoute == tab.route

                    val iconScale by animateFloatAsState(
                        targetValue = if (isSelected) 1.12f else 1.0f,
                        animationSpec = spring(dampingRatio = 0.6f, stiffness = 380f),
                        label = "TabIconScale"
                    )

                    val tintColor by animateColorAsState(
                        targetValue = if (isSelected) SafeRouteBlue else TextSecondaryDark,
                        animationSpec = tween(durationMillis = 200),
                        label = "TabTintColor"
                    )

                    val pillAlpha by animateFloatAsState(
                        targetValue = if (isSelected) 1f else 0f,
                        animationSpec = tween(durationMillis = 200),
                        label = "TabPillAlpha"
                    )

                    val displayTitle = com.example.saferoute.util.appText(tab.route)

                    Box(
                        modifier = Modifier
                            .testTag(tab.tag)
                            .clip(RoundedCornerShape(18.dp))
                            .bounceClick(scaleDown = 0.92f) { onTabSelected(tab) }
                            .padding(horizontal = 14.dp, vertical = 6.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        // Background active pill
                        if (pillAlpha > 0f) {
                            Box(
                                modifier = Modifier
                                    .matchParentSize()
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(SafeRouteBlue.copy(alpha = 0.12f * pillAlpha))
                            )
                        }

                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = if (isSelected) tab.activeIcon else tab.inactiveIcon,
                                contentDescription = displayTitle,
                                tint = tintColor,
                                modifier = Modifier
                                    .size(24.dp)
                                    .scale(iconScale)
                            )
                            Spacer(modifier = Modifier.height(3.dp))
                            Text(
                                text = displayTitle,
                                fontSize = 11.sp,
                                lineHeight = 14.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = tintColor,
                                letterSpacing = 0.1.sp
                            )
                        }
                    }
                }
            }
        }
    }
}
