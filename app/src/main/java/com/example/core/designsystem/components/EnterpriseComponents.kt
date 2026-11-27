package com.example.core.designsystem.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.NavigationRailItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.min
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCoreBorder
import com.example.ui.theme.MediCoreColors
import com.example.ui.theme.MediCoreError
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCorePrimaryDark
import com.example.ui.theme.MediCoreSecondary
import com.example.ui.theme.MediCoreSuccess
import com.example.ui.theme.MediCoreSurface
import com.example.ui.theme.MediCoreSurfaceVariant
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted
import com.example.ui.theme.MediCoreWarning

/**
 * Global MediCore Logo Watermark Background
 * Displays the MediCore logo centered behind all screen content at 60% opacity (alpha = 0.60f)
 * with a soft Red & White mix veil so foreground cards and typography remain highly legible.
 */
@Composable
fun MediCoreWatermarkBackground(
    modifier: Modifier = Modifier,
    watermarkAlpha: Float = 0.60f,
    showWatermark: Boolean = true,
    content: @Composable () -> Unit
) {
    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .background(MediCoreColors.BlueWhiteSoftBackgroundBrush)
            .testTag("medicore_watermark_container")
    ) {
        val minDimension = min(maxWidth, maxHeight)
        val logoSize = (minDimension * 0.56f).coerceIn(180.dp, 320.dp)

        if (showWatermark) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ic_medicore_logo),
                    contentDescription = null, // Decorative background watermark
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .size(logoSize)
                        .alpha(watermarkAlpha)
                        .testTag("medicore_watermark_logo")
                )
                // Subtle Red-White translucent veil over watermark so foreground text has AAA contrast
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MediCoreSurface.copy(alpha = 0.72f))
                )
            }
        }

        Box(modifier = Modifier.fillMaxSize()) {
            content()
        }
    }
}

@Composable
fun MediCoreButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isLoading: Boolean = false,
    isOutline: Boolean = false,
    leadingIcon: ImageVector? = null,
    containerColor: Color = MediCorePrimary
) {
    if (isOutline) {
        OutlinedButton(
            onClick = onClick,
            enabled = enabled && !isLoading,
            shape = RoundedCornerShape(10.dp),
            border = BorderStroke(1.dp, if (enabled && !isLoading) containerColor else MediCoreBorder),
            colors = ButtonDefaults.outlinedButtonColors(
                containerColor = MediCoreSurface.copy(alpha = 0.92f),
                contentColor = containerColor
            ),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            modifier = modifier.height(48.dp)
        ) {
            if (isLoading) {
                MediCoreButtonLoader(lineColor = containerColor)
            } else {
                if (leadingIcon != null) {
                    Icon(
                        imageVector = leadingIcon,
                        contentDescription = text,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(
                    text = text,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp
                )
            }
        }
    } else {
        Button(
            onClick = onClick,
            enabled = enabled && !isLoading,
            shape = RoundedCornerShape(10.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = containerColor,
                contentColor = MediCoreSurface,
                disabledContainerColor = if (isLoading) containerColor.copy(alpha = 0.8f) else MediCoreBorder,
                disabledContentColor = if (isLoading) MediCoreSurface else MediCoreTextMuted
            ),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            modifier = modifier.height(48.dp)
        ) {
            if (isLoading) {
                MediCoreButtonLoader(lineColor = Color.White)
            } else {
                if (leadingIcon != null) {
                    Icon(
                        imageVector = leadingIcon,
                        contentDescription = text,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(
                    text = text,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp
                )
            }
        }
    }
}

@Composable
fun MediCoreTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String = "",
    modifier: Modifier = Modifier,
    leadingIcon: ImageVector? = null,
    trailingIcon: (@Composable () -> Unit)? = null,
    singleLine: Boolean = true,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    errorMessage: String? = null
) {
    Column(modifier = modifier) {
        if (label.isNotBlank()) {
            Text(
                text = label,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = MediCoreTextDark,
                modifier = Modifier.padding(bottom = 6.dp)
            )
        }
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = {
                if (placeholder.isNotBlank()) {
                    Text(placeholder, color = MediCoreTextMuted, fontSize = 14.sp)
                }
            },
            leadingIcon = if (leadingIcon != null) {
                {
                    Icon(
                        imageVector = leadingIcon,
                        contentDescription = label,
                        tint = MediCorePrimary
                    )
                }
            } else null,
            trailingIcon = trailingIcon,
            singleLine = singleLine,
            isError = !errorMessage.isNullOrBlank(),
            visualTransformation = visualTransformation,
            keyboardOptions = keyboardOptions,
            shape = RoundedCornerShape(10.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MediCorePrimary,
                unfocusedBorderColor = MediCoreBorder,
                focusedContainerColor = MediCoreSurface,
                unfocusedContainerColor = MediCoreSurface.copy(alpha = 0.95f),
                focusedTextColor = MediCoreTextDark,
                unfocusedTextColor = MediCoreTextDark
            ),
            modifier = Modifier.fillMaxWidth()
        )
        if (!errorMessage.isNullOrBlank()) {
            Text(
                text = errorMessage,
                color = MediCoreError,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}

@Composable
fun MediCoreTopBar(
    title: String,
    subtitle: String? = null,
    onNavigateBack: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {}
) {
    Surface(
        color = MediCoreSurface.copy(alpha = 0.96f),
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .windowInsetsPadding(WindowInsets.statusBars)
        ) {
            // Subtle Blue & White accent bar at top
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .background(MediCoreColors.BlueWhiteHeaderBrush)
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                if (onNavigateBack != null) {
                    IconButton(
                        onClick = onNavigateBack,
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(MediCoreSurfaceVariant)
                            .testTag("top_bar_back_button")
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Navigate back",
                            tint = MediCorePrimary
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                } else {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(MediCoreSurfaceVariant)
                            .border(1.dp, MediCoreBorder, RoundedCornerShape(10.dp))
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.ic_medicore_logo),
                            contentDescription = "MediCore Logo",
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.size(26.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = title,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MediCoreTextDark,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (!subtitle.isNullOrBlank()) {
                        Text(
                            text = subtitle,
                            fontSize = 12.sp,
                            color = MediCoreTextMuted,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    content = actions
                )
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(MediCoreBorder)
            )
        }
    }
}

@Composable
fun MediCoreStatusBadge(
    label: String,
    statusType: String = label,
    modifier: Modifier = Modifier
) {
    val normalized = statusType.uppercase()
    val (bgColor, textColor, borderColor) = when {
        normalized.contains("VERIFIED") && !normalized.contains("PENDING") && !normalized.contains("UNVERIFIED") ->
            Triple(Color(0xFFECFDF5), MediCoreSuccess, Color(0xFFA7F3D0))
        normalized.contains("APPROVED") || normalized.contains("ACTIVE") || normalized.contains("PAID") || normalized.contains("COMPLETED") ->
            Triple(Color(0xFFECFDF5), MediCoreSuccess, Color(0xFFA7F3D0))
        normalized.contains("PENDING") || normalized.contains("REVIEW") || normalized.contains("TRIAL") || normalized.contains("PARTIAL") ->
            Triple(Color(0xFFFFFBEB), MediCoreWarning, Color(0xFFFDE68A))
        normalized.contains("REJECTED") || normalized.contains("SUSPENDED") || normalized.contains("ERROR") || normalized.contains("CANCELLED") ->
            Triple(Color(0xFFFEF2F2), MediCoreError, Color(0xFFFECACA))
        else ->
            Triple(MediCoreSurfaceVariant, MediCorePrimary, MediCoreBorder)
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bgColor)
            .border(1.dp, borderColor, RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp)
    ) {
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = textColor
        )
    }
}

@Composable
fun MediCoreEmptyState(
    title: String,
    description: String = "",
    icon: ImageVector = Icons.Default.Inbox,
    actionLabel: String? = null,
    onActionClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    MediCoreCard(
        modifier = modifier
            .fillMaxWidth()
            .testTag("medicore_empty_state")
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(MediCoreSurfaceVariant)
                    .border(1.dp, MediCoreBorder, CircleShape)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = MediCorePrimary,
                    modifier = Modifier.size(28.dp)
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = title,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = MediCoreTextDark,
                textAlign = TextAlign.Center
            )
            if (description.isNotBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = description,
                    fontSize = 13.sp,
                    color = MediCoreTextMuted,
                    textAlign = TextAlign.Center
                )
            }
            if (!actionLabel.isNullOrBlank() && onActionClick != null) {
                Spacer(modifier = Modifier.height(16.dp))
                MediCoreButton(
                    text = actionLabel,
                    onClick = onActionClick
                )
            }
        }
    }
}

@Composable
fun MediCoreLoadingState(
    message: String = "Loading MediCore records...",
    modifier: Modifier = Modifier
) {
    MediCorePageLoader(
        message = message,
        modifier = modifier
    )
}

data class MediCoreNavDestination(
    val id: String,
    val label: String,
    val icon: ImageVector
)

@Composable
fun MediCoreNavigationBar(
    destinations: List<MediCoreNavDestination>,
    selectedId: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    NavigationBar(
        containerColor = MediCoreSurface,
        tonalElevation = 4.dp,
        modifier = modifier.windowInsetsPadding(WindowInsets.navigationBars)
    ) {
        destinations.forEach { dest ->
            val selected = dest.id == selectedId
            NavigationBarItem(
                selected = selected,
                onClick = { onSelect(dest.id) },
                icon = {
                    Icon(
                        imageVector = dest.icon,
                        contentDescription = dest.label
                    )
                },
                label = {
                    Text(
                        text = dest.label,
                        fontSize = 11.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = MediCorePrimary,
                    selectedTextColor = MediCorePrimaryDark,
                    indicatorColor = MediCoreSurfaceVariant,
                    unselectedIconColor = MediCoreTextMuted,
                    unselectedTextColor = MediCoreTextMuted
                ),
                modifier = Modifier.testTag("nav_bar_item_${dest.id}")
            )
        }
    }
}

@Composable
fun MediCoreNavigationRail(
    destinations: List<MediCoreNavDestination>,
    selectedId: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    NavigationRail(
        containerColor = MediCoreSurface,
        modifier = modifier
            .fillMaxHeight()
            .border(1.dp, MediCoreBorder)
    ) {
        Spacer(modifier = Modifier.height(12.dp))
        destinations.forEach { dest ->
            val selected = dest.id == selectedId
            NavigationRailItem(
                selected = selected,
                onClick = { onSelect(dest.id) },
                icon = {
                    Icon(
                        imageVector = dest.icon,
                        contentDescription = dest.label
                    )
                },
                label = {
                    Text(
                        text = dest.label,
                        fontSize = 11.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
                    )
                },
                colors = NavigationRailItemDefaults.colors(
                    selectedIconColor = MediCorePrimary,
                    selectedTextColor = MediCorePrimaryDark,
                    indicatorColor = MediCoreSurfaceVariant,
                    unselectedIconColor = MediCoreTextMuted,
                    unselectedTextColor = MediCoreTextMuted
                ),
                modifier = Modifier.testTag("nav_rail_item_${dest.id}")
            )
        }
    }
}
