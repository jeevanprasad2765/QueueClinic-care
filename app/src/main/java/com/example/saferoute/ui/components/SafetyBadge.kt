package com.example.saferoute.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.SafetyAmber
import com.example.ui.theme.SafetyGreen
import com.example.ui.theme.SafetyRed

@Composable
fun SafetyBadge(
    score: Int,
    modifier: Modifier = Modifier,
    showLabel: Boolean = true
) {
    val (badgeColor, containerColor, labelPrefix) = when {
        score >= 80 -> Triple(SafetyGreen, SafetyGreen.copy(alpha = 0.15f), "SAFE")
        score >= 60 -> Triple(SafetyAmber, SafetyAmber.copy(alpha = 0.15f), "CAUTION")
        else -> Triple(SafetyRed, SafetyRed.copy(alpha = 0.15f), "RISK")
    }

    val animatedBadgeColor by animateColorAsState(
        targetValue = badgeColor,
        animationSpec = tween(400),
        label = "BadgeColorAnimation"
    )

    val animatedScore by animateIntAsState(
        targetValue = score,
        animationSpec = spring(dampingRatio = 0.75f, stiffness = 300f),
        label = "BadgeScoreAnimation"
    )

    val shape = RoundedCornerShape(12.dp)

    Row(
        modifier = modifier
            .testTag("safety_score_badge")
            .clip(shape)
            .background(containerColor)
            .border(1.dp, animatedBadgeColor.copy(alpha = 0.35f), shape)
            .padding(horizontal = 10.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Default.Shield,
            contentDescription = "Safety Shield Score",
            tint = animatedBadgeColor,
            modifier = Modifier.size(15.dp)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = if (showLabel) "$labelPrefix ($animatedScore)" else "$animatedScore / 100",
            color = animatedBadgeColor,
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp,
            letterSpacing = 0.3.sp
        )
    }
}
