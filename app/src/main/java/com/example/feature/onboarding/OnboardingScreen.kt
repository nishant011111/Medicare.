package com.example.feature.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
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
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Biotech
import androidx.compose.material.icons.filled.Domain
import androidx.compose.material.icons.filled.EventAvailable
import androidx.compose.material.icons.filled.HealthAndSafety
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.Medication
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCoreSecondary
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted

data class OnboardingItem(
    val title: String,
    val description: String,
    val icon: ImageVector,
    val featureBadge: String
)

@Composable
fun OnboardingScreen(
    onFinishOnboarding: () -> Unit,
    modifier: Modifier = Modifier
) {
    val items = listOf(
        OnboardingItem(
            title = "Healthcare in One Place",
            description = "Discover top hospitals, book specialist doctors, and access comprehensive healthcare services across cities.",
            icon = Icons.Default.Domain,
            featureBadge = "Multi-Hospital Platform"
        ),
        OnboardingItem(
            title = "Manage Your Health",
            description = "Book OPD appointments instantly, view digital prescriptions, and access lab diagnostic reports securely.",
            icon = Icons.Default.EventAvailable,
            featureBadge = "Digital Records & Rx"
        ),
        OnboardingItem(
            title = "Connected Healthcare",
            description = "A unified platform connecting patients, doctors, nurses, receptionists, pharmacists, and hospital administrators.",
            icon = Icons.Default.HealthAndSafety,
            featureBadge = "8 Role Ecosystem"
        )
    )

    var currentPage by remember { mutableIntStateOf(0) }

    Column(
        modifier = modifier
            .testTag("onboarding_screen")
            .fillMaxSize()
            .background(MediCoreBackground)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Top Bar (Skip Button)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End
        ) {
            if (currentPage < items.size - 1) {
                TextButton(
                    onClick = onFinishOnboarding,
                    modifier = Modifier.testTag("onboarding_skip_button")
                ) {
                    Text(
                        text = "Skip",
                        color = MediCoreTextMuted,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp
                    )
                }
            } else {
                Spacer(modifier = Modifier.height(48.dp))
            }
        }

        Spacer(modifier = Modifier.weight(0.5f))

        // Slide Content Animation
        AnimatedContent(
            targetState = currentPage,
            transitionSpec = { fadeIn() togetherWith fadeOut() },
            label = "slide_animation"
        ) { pageIndex ->
            val item = items[pageIndex]
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(140.dp)
                        .clip(CircleShape)
                        .background(MediCorePrimary.copy(alpha = 0.1f))
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(100.dp)
                            .clip(CircleShape)
                            .background(MediCorePrimary)
                    ) {
                        Icon(
                            imageVector = item.icon,
                            contentDescription = item.title,
                            tint = Color.White,
                            modifier = Modifier.size(54.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(28.dp))

                Text(
                    text = item.featureBadge,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCoreSecondary,
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(MediCoreSecondary.copy(alpha = 0.12f))
                        .padding(horizontal = 14.dp, vertical = 6.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = item.title,
                    fontSize = 26.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextDark,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = item.description,
                    fontSize = 15.sp,
                    color = MediCoreTextMuted,
                    textAlign = TextAlign.Center,
                    lineHeight = 22.sp,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        // Page Indicators
        Row(
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 32.dp)
        ) {
            items.indices.forEach { index ->
                val isSelected = index == currentPage
                Box(
                    modifier = Modifier
                        .padding(horizontal = 4.dp)
                        .height(8.dp)
                        .width(if (isSelected) 28.dp else 8.dp)
                        .clip(CircleShape)
                        .background(
                            if (isSelected) MediCorePrimary else MediCorePrimary.copy(alpha = 0.2f)
                        )
                )
            }
        }

        // Action Buttons
        if (currentPage < items.size - 1) {
            Button(
                onClick = { currentPage++ },
                colors = ButtonDefaults.buttonColors(containerColor = MediCorePrimary),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .testTag("onboarding_next_button")
                    .fillMaxWidth()
                    .height(54.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "Next",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = "Next",
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        } else {
            Button(
                onClick = onFinishOnboarding,
                colors = ButtonDefaults.buttonColors(containerColor = MediCorePrimary),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .testTag("onboarding_get_started_button")
                    .fillMaxWidth()
                    .height(54.dp)
            ) {
                Text(
                    text = "Get Started",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
