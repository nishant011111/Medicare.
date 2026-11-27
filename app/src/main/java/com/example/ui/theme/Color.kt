package com.example.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * MediCore Enterprise Blue & White Mix Theme Palette
 * Professional clinical blue with crisp white surfaces and zero black/dark mode colors.
 */
val MediCorePrimary = Color(0xFF0878D1)          // Professional Medical Blue
val MediCorePrimaryDark = Color(0xFF123B63)      // Primary Deep Navy Blue
val MediCoreSecondary = Color(0xFF0284C7)        // Ocean Sky Blue Accent
val MediCoreSecondaryDark = Color(0xFF0369A1)    // Deep Marine Blue
val MediCoreBackground = Color(0xFFF3F6FA)       // Soft Clinical Blue-White Background
val MediCoreSurface = Color(0xFFFFFFFF)          // Pure Crisp White Surface
val MediCoreSurfaceVariant = Color(0xFFE0F2FE)   // Soft Sky Blue Container Tint
val MediCoreSurfaceSoft = Color(0xFFF0F7FF)      // Warm Blue-White Card Tint
val MediCoreTextDark = Color(0xFF1E293B)         // Deep Slate Navy Text (No Black)
val MediCoreTextMuted = Color(0xFF64748B)        // Muted Slate-Blue Secondary Text
val MediCoreBorder = Color(0xFFDCE5EE)           // Subtle Blue-Gray Border

val MediCoreSuccess = Color(0xFF16845B)          // Clinical Emerald Success
val MediCoreWarning = Color(0xFFD97706)          // Warm Amber Warning
val MediCoreError = Color(0xFFC74747)            // Alert Crimson
val MediCoreInfo = Color(0xFF0878D1)             // Medical Blue Info

object MediCoreColors {
    val PrimaryBlue = MediCorePrimary
    val NavyBlue = MediCorePrimaryDark
    val AccentBlue = MediCoreSecondary
    val BackgroundBlueWhite = MediCoreBackground
    val SurfaceWhite = MediCoreSurface
    val SoftBlueWhiteTint = MediCoreSurfaceVariant
    val PrimaryText = MediCoreTextDark
    val SecondaryText = MediCoreTextMuted
    val Border = MediCoreBorder
    val Success = MediCoreSuccess
    val Warning = MediCoreWarning
    val Error = MediCoreError

    val BlueWhiteHeaderBrush = Brush.horizontalGradient(
        colors = listOf(
            Color(0xFF123B63),
            Color(0xFF0878D1),
            Color(0xFF0284C7)
        )
    )

    val BlueWhiteSoftBackgroundBrush = Brush.verticalGradient(
        colors = listOf(
            Color(0xFFFFFFFF),
            Color(0xFFF0F7FF),
            Color(0xFFF3F6FA)
        )
    )

    val BlueWhiteCardBrush = Brush.linearGradient(
        colors = listOf(
            Color(0xFFFFFFFF),
            Color(0xFFF8FAFC)
        )
    )
}
