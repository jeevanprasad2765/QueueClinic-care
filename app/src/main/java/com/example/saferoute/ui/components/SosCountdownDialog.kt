package com.example.saferoute.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.PhoneInTalk
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.ShareLocation
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.saferoute.data.db.EmergencyContactEntity
import com.example.ui.theme.DarkNavyCard
import com.example.ui.theme.DarkNavySurface
import com.example.ui.theme.GlassSurfaceBorder
import com.example.ui.theme.SafeRouteBlue
import com.example.ui.theme.SafeRouteTeal
import com.example.ui.theme.SafetyGreen
import com.example.ui.theme.SafetyRed
import com.example.ui.theme.SafetyRedContainer
import com.example.ui.theme.bounceClick
import kotlinx.coroutines.delay

@Composable
fun SosCountdownDialog(
    contacts: List<EmergencyContactEntity>,
    onDismissRequest: () -> Unit,
    onAlertTriggered: () -> Unit,
    onStandDownAlert: () -> Unit
) {
    var secondsRemaining by remember { mutableIntStateOf(5) }
    var isTriggered by remember { mutableStateOf(false) }

    LaunchedEffect(secondsRemaining, isTriggered) {
        if (!isTriggered && secondsRemaining > 0) {
            delay(1000L)
            secondsRemaining -= 1
            if (secondsRemaining == 0) {
                isTriggered = true
                onAlertTriggered()
            }
        }
    }

    Dialog(
        onDismissRequest = {
            if (!isTriggered) onDismissRequest()
        },
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        // Dramatic Full-Screen Signature Takeover
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = if (!isTriggered) {
                            listOf(Color(0xFF380B0B), Color(0xFF090D16))
                        } else {
                            listOf(Color(0xFF2A0909), Color(0xFF090D16))
                        },
                        radius = 1200f
                    )
                )
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            // Concentric Animated Radial Pulse Rings
            val infiniteTransition = rememberInfiniteTransition(label = "SosRings")
            val ring1Scale by infiniteTransition.animateFloat(
                initialValue = 0.8f,
                targetValue = 2.2f,
                animationSpec = infiniteRepeatable(
                    animation = tween(2000, easing = LinearEasing),
                    repeatMode = RepeatMode.Restart
                ),
                label = "Ring1Scale"
            )
            val ring1Alpha by infiniteTransition.animateFloat(
                initialValue = 0.5f,
                targetValue = 0.0f,
                animationSpec = infiniteRepeatable(
                    animation = tween(2000, easing = LinearEasing),
                    repeatMode = RepeatMode.Restart
                ),
                label = "Ring1Alpha"
            )

            val ring2Scale by infiniteTransition.animateFloat(
                initialValue = 0.8f,
                targetValue = 2.2f,
                animationSpec = infiniteRepeatable(
                    animation = tween(2000, delayMillis = 600, easing = LinearEasing),
                    repeatMode = RepeatMode.Restart
                ),
                label = "Ring2Scale"
            )
            val ring2Alpha by infiniteTransition.animateFloat(
                initialValue = 0.4f,
                targetValue = 0.0f,
                animationSpec = infiniteRepeatable(
                    animation = tween(2000, delayMillis = 600, easing = LinearEasing),
                    repeatMode = RepeatMode.Restart
                ),
                label = "Ring2Alpha"
            )

            // Outer Pulse Rings in Background
            Box(
                modifier = Modifier
                    .size(240.dp)
                    .scale(ring1Scale)
                    .clip(CircleShape)
                    .border(2.dp, SafetyRed.copy(alpha = ring1Alpha), CircleShape)
            )
            Box(
                modifier = Modifier
                    .size(240.dp)
                    .scale(ring2Scale)
                    .clip(CircleShape)
                    .border(2.dp, SafetyRed.copy(alpha = ring2Alpha), CircleShape)
            )

            AnimatedContent(
                targetState = isTriggered,
                transitionSpec = {
                    (fadeIn(animationSpec = tween(400)) + slideInVertically { it / 3 })
                        .togetherWith(fadeOut(animationSpec = tween(300)))
                },
                label = "SosStateTransition"
            ) { triggered ->
                if (!triggered) {
                    // COUNTDOWN STATE
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        // Giant Countdown Dial
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier.size(190.dp)
                        ) {
                            // Dial track
                            CircularProgressIndicator(
                                progress = { secondsRemaining / 5.0f },
                                modifier = Modifier.fillMaxSize(),
                                color = SafetyRed,
                                strokeWidth = 10.dp,
                                strokeCap = StrokeCap.Round,
                                trackColor = Color(0x33FFFFFF)
                            )

                            // Inner Glow Circle
                            Box(
                                modifier = Modifier
                                    .size(150.dp)
                                    .clip(CircleShape)
                                    .background(
                                        Brush.radialGradient(
                                            colors = listOf(
                                                Color(0xFFFF453A).copy(alpha = 0.35f),
                                                Color.Transparent
                                            )
                                        )
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "$secondsRemaining",
                                    fontSize = 76.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White,
                                    letterSpacing = (-2).sp
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(28.dp))

                        Text(
                            text = "EMERGENCY SOS BROADCAST",
                            fontWeight = FontWeight.Black,
                            fontSize = 18.sp,
                            color = SafetyRed,
                            letterSpacing = 1.sp
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "Transmitting live GPS telemetry and distress alert to your emergency contacts in $secondsRemaining seconds...",
                            textAlign = TextAlign.Center,
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 14.sp,
                            lineHeight = 20.sp,
                            modifier = Modifier.padding(horizontal = 16.dp)
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        // Glass Contacts Preview
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(20.dp))
                                .background(Color(0xDD12192B))
                                .border(1.dp, GlassSurfaceBorder, RoundedCornerShape(20.dp))
                                .padding(16.dp)
                        ) {
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.ShareLocation,
                                        contentDescription = null,
                                        tint = SafeRouteTeal,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "DISPATCH RECIPIENTS (${contacts.size})",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 0.8.sp,
                                        color = SafeRouteTeal
                                    )
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                contacts.take(3).forEach { contact ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 4.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "${contact.name} (${contact.relationship})",
                                            fontSize = 13.sp,
                                            color = Color.White,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                        Text(
                                            text = contact.phone,
                                            fontSize = 12.sp,
                                            color = Color(0xFF94A3B8)
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(32.dp))

                        // Accidental Tap Cancel Button
                        Box(
                            modifier = Modifier
                                .testTag("sos_cancel_button")
                                .fillMaxWidth()
                                .height(56.dp)
                                .bounceClick(scaleDown = 0.95f) { onDismissRequest() }
                                .clip(RoundedCornerShape(18.dp))
                                .background(Color(0x22FFFFFF))
                                .border(1.dp, Color(0x44FFFFFF), RoundedCornerShape(18.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "CANCEL (ACCIDENTAL TAP)",
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontSize = 14.sp,
                                letterSpacing = 0.5.sp
                            )
                        }
                    }
                } else {
                    // TRIGGERED CONFIRMATION STATE
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        // Glowing Alert Shield
                        Box(
                            modifier = Modifier
                                .size(110.dp)
                                .clip(CircleShape)
                                .background(SafetyRed.copy(alpha = 0.2f))
                                .border(2.dp, SafetyRed, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.ShareLocation,
                                contentDescription = "Active Emergency Broadcast",
                                tint = SafetyRed,
                                modifier = Modifier.size(54.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        Text(
                            text = "EMERGENCY BROADCAST ACTIVE",
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp,
                            color = SafetyRed,
                            letterSpacing = 0.5.sp
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        val primaryName = contacts.firstOrNull()?.name ?: "Emergency Contacts"
                        Text(
                            text = "Live GPS coordinates broadcast sent to $primaryName & Coimbatore Police Safety Dispatch.",
                            textAlign = TextAlign.Center,
                            fontSize = 14.sp,
                            lineHeight = 20.sp,
                            color = Color.White.copy(alpha = 0.9f),
                            modifier = Modifier.padding(horizontal = 16.dp)
                        )

                        Spacer(modifier = Modifier.height(28.dp))

                        // 911 Dial Card
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(18.dp))
                                .background(DarkNavyCard)
                                .border(1.dp, GlassSurfaceBorder, RoundedCornerShape(18.dp))
                                .padding(16.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.PhoneInTalk,
                                        contentDescription = null,
                                        tint = SafetyRed,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(
                                            "Quick Police Helpline",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = Color.White
                                        )
                                        Text(
                                            "112 / 100 Emergency Control",
                                            fontSize = 12.sp,
                                            color = Color(0xFF94A3B8)
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(32.dp))

                        // Reassuring Stand Down Button
                        Box(
                            modifier = Modifier
                                .testTag("sos_stand_down_button")
                                .fillMaxWidth()
                                .height(56.dp)
                                .bounceClick(scaleDown = 0.95f) {
                                    onStandDownAlert()
                                    onDismissRequest()
                                }
                                .clip(RoundedCornerShape(18.dp))
                                .background(
                                    Brush.horizontalGradient(
                                        colors = listOf(
                                            SafetyGreen,
                                            Color(0xFF24A148)
                                        )
                                    )
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = Color.Black,
                                    modifier = Modifier.size(22.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = "I'M SAFE — STAND DOWN ALERT",
                                    fontWeight = FontWeight.Black,
                                    color = Color.Black,
                                    fontSize = 14.sp,
                                    letterSpacing = 0.5.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
