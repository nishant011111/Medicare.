package com.example.ui.theme

import android.app.Activity
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat

/**
 * Unified Blue & White Mix Color Scheme.
 * Replaces red with clinical Medical Blue and Deep Navy on crisp White surfaces.
 */
private val BlueWhiteColorScheme = lightColorScheme(
    primary = MediCorePrimary,
    onPrimary = MediCoreSurface,
    primaryContainer = MediCoreSurfaceVariant,
    onPrimaryContainer = MediCorePrimaryDark,
    secondary = MediCoreSecondary,
    onSecondary = MediCoreSurface,
    secondaryContainer = Color(0xFFBAE6FD),
    onSecondaryContainer = MediCoreSecondaryDark,
    tertiary = Color(0xFF0D9488),
    onTertiary = MediCoreSurface,
    tertiaryContainer = Color(0xFFCCFBF1),
    onTertiaryContainer = Color(0xFF115E59),
    background = MediCoreBackground,
    onBackground = MediCoreTextDark,
    surface = MediCoreSurface,
    onSurface = MediCoreTextDark,
    surfaceVariant = MediCoreSurfaceVariant,
    onSurfaceVariant = MediCoreTextMuted,
    outline = MediCoreBorder,
    outlineVariant = Color(0xFFE2E8F0),
    error = MediCoreError,
    onError = MediCoreSurface,
    errorContainer = Color(0xFFFEE2E2),
    onErrorContainer = Color(0xFF7F1D1D)
)

val MediCoreShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(10.dp),
    large = RoundedCornerShape(12.dp),
    extraLarge = RoundedCornerShape(16.dp)
)

object MediCoreSpacing {
    val xs = 4.dp
    val sm = 8.dp
    val md = 12.dp
    val lg = 16.dp
    val xl = 24.dp
    val xxl = 32.dp
}

@Composable
fun MediCoreTheme(
    content: @Composable () -> Unit
) {
    val colorScheme = BlueWhiteColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                window.statusBarColor = MediCorePrimaryDark.toArgb()
                window.navigationBarColor = MediCoreSurface.toArgb()
                val controller = WindowCompat.getInsetsController(window, view)
                controller.isAppearanceLightStatusBars = false
                controller.isAppearanceLightNavigationBars = true
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = MediCoreTypography,
        shapes = MediCoreShapes,
        content = content
    )
}
