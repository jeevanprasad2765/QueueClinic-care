package com.example.saferoute.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.SafetyRed
import com.example.ui.theme.SafetyRedContainer
import com.example.ui.theme.bounceClick

@Composable
fun SosFab(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    expanded: Boolean = true
) {
    val infiniteTransition = rememberInfiniteTransition(label = "SosPulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.18f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "SosPulseScale"
    )
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.45f,
        targetValue = 0.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "SosPulseAlpha"
    )

    Box(
        modifier = modifier.testTag("sos_button"),
        contentAlignment = Alignment.Center
    ) {
        // Outer pulsing glow ring
        Box(
            modifier = Modifier
                .matchParentSize()
                .scale(pulseScale)
                .clip(RoundedCornerShape(32.dp))
                .background(SafetyRed.copy(alpha = pulseAlpha))
        )

        // Main SOS Button
        Box(
            modifier = Modifier
                .bounceClick(scaleDown = 0.92f) { onClick() }
                .clip(RoundedCornerShape(26.dp))
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(
                            Color(0xFFFF3B30),
                            Color(0xFFE02424)
                        )
                    )
                )
                .border(1.5.dp, Color(0x66FFFFFF), RoundedCornerShape(26.dp))
                .padding(horizontal = if (expanded) 18.dp else 14.dp, vertical = 12.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Shield,
                    contentDescription = "Emergency SOS Alert",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
                if (expanded) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "SOS",
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp,
                        letterSpacing = 0.8.sp,
                        color = Color.White
                    )
                }
            }
        }
    }
}
