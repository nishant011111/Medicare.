package com.example.core.designsystem.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
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
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.PathMeasure
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.asAndroidPath
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCoreBorder
import com.example.ui.theme.MediCoreError
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCorePrimaryDark
import com.example.ui.theme.MediCoreSurface
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted

/**
 * Standard Operation Loading State model for MediCore
 */
sealed class LoadingState<out T> {
    object Idle : LoadingState<Nothing>()
    data class Loading(val message: String = "MediCore is preparing...") : LoadingState<Nothing>()
    data class Success<out T>(val data: T) : LoadingState<T>()
    data class Error(val message: String, val canRetry: Boolean = true) : LoadingState<Nothing>()
}

/**
 * Core Canvas ECG Heartbeat Waveform Component.
 * Draws a medical-monitor-style P-Q-R-S-T continuous ECG waveform with a smooth animated sweep
 * from left to right and subtle pulse contraction at the main R peak.
 */
@Composable
fun MediCoreECGLoader(
    modifier: Modifier = Modifier,
    width: Dp = 160.dp,
    height: Dp = 48.dp,
    strokeWidth: Dp = 2.5.dp,
    lineColor: Color = MediCorePrimary,
    gridLineColor: Color = MediCorePrimaryDark.copy(alpha = 0.08f),
    showGrid: Boolean = true,
    showLeadDot: Boolean = true,
    animationDurationMillis: Int = 1800
) {
    val infiniteTransition = rememberInfiniteTransition(label = "ecg_wave_transition")

    // Sweep progress from 0f to 1f across the waveform
    val sweepProgress by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = animationDurationMillis, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "ecg_sweep_progress"
    )

    // Subtle cardiac contraction pulse for the lead indicator
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.85f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = animationDurationMillis / 2, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "ecg_pulse_scale"
    )

    Canvas(
        modifier = modifier
            .size(width, height)
            .testTag("medicore_ecg_canvas")
    ) {
        val w = size.width
        val h = size.height
        val midY = h * 0.5f

        // 1. Subtle medical monitor background grid (3 subtle horizontal gridlines)
        if (showGrid) {
            val gridStroke = Stroke(width = 1f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(4f, 8f), 0f))
            drawLine(
                color = gridLineColor,
                start = Offset(0f, h * 0.25f),
                end = Offset(w, h * 0.25f),
                strokeWidth = 1f
            )
            drawLine(
                color = gridLineColor,
                start = Offset(0f, midY),
                end = Offset(w, midY),
                strokeWidth = 1f
            )
            drawLine(
                color = gridLineColor,
                start = Offset(0f, h * 0.75f),
                end = Offset(w, h * 0.75f),
                strokeWidth = 1f
            )
        }

        // 2. Build the precise clinical ECG path: Isoelectric baseline -> P wave -> PR -> Q drop -> R tall peak -> S drop -> ST -> T wave -> Isoelectric
        val ecgPath = Path().apply {
            moveTo(0f, midY)
            lineTo(w * 0.18f, midY)

            // P-Wave (atrial depolarization)
            cubicTo(
                w * 0.21f, midY - (h * 0.14f),
                w * 0.25f, midY - (h * 0.14f),
                w * 0.28f, midY
            )

            // PR interval
            lineTo(w * 0.35f, midY)

            // Q-Wave (slight downward dip)
            lineTo(w * 0.38f, midY + (h * 0.18f))

            // R-Wave (sharp ventricular depolarization spike)
            lineTo(w * 0.44f, midY - (h * 0.46f))

            // S-Wave (sharp downward deflection)
            lineTo(w * 0.50f, midY + (h * 0.34f))

            // ST segment return to baseline
            lineTo(w * 0.56f, midY)
            lineTo(w * 0.62f, midY)

            // T-Wave (ventricular repolarization)
            cubicTo(
                w * 0.68f, midY - (h * 0.24f),
                w * 0.76f, midY - (h * 0.24f),
                w * 0.82f, midY
            )

            // Isoelectric completion to right edge
            lineTo(w, midY)
        }

        // 3. Faint background trail so the entire cardiac cycle shape is subtly visible
        drawPath(
            path = ecgPath,
            color = lineColor.copy(alpha = 0.15f),
            style = Stroke(
                width = strokeWidth.toPx(),
                cap = StrokeCap.Round,
                join = StrokeJoin.Round
            )
        )

        // 4. Measure path and render active trace up to sweepProgress
        val composePathMeasure = PathMeasure()
        composePathMeasure.setPath(ecgPath, false)
        val totalLength = composePathMeasure.length
        val currentLength = totalLength * sweepProgress

        val animatedSegment = Path()
        // Draw trailing illuminated segment
        val segmentStart = (currentLength - (totalLength * 0.45f)).coerceAtLeast(0f)
        composePathMeasure.getSegment(segmentStart, currentLength, animatedSegment, true)

        drawPath(
            path = animatedSegment,
            color = lineColor,
            style = Stroke(
                width = strokeWidth.toPx(),
                cap = StrokeCap.Round,
                join = StrokeJoin.Round
            )
        )

        // 5. Active monitor lead dot at the tip of the moving waveform
        if (showLeadDot && currentLength > 2f) {
            val androidPathMeasure = android.graphics.PathMeasure(ecgPath.asAndroidPath(), false)
            val pos = FloatArray(2)
            val tan = FloatArray(2)
            if (androidPathMeasure.getPosTan(currentLength, pos, tan)) {
                val leadCenter = Offset(pos[0], pos[1])
                val leadRadius = (strokeWidth.toPx() * 1.6f) * pulseScale

                // Lead glow halo
                drawCircle(
                    color = lineColor.copy(alpha = 0.28f),
                    radius = leadRadius * 2.2f,
                    center = leadCenter
                )

                // Solid lead marker
                drawCircle(
                    color = lineColor,
                    radius = leadRadius,
                    center = leadCenter
                )
            }
        }
    }
}

/**
 * 1. Full Screen ECG Loader (modal blocking with brand identity & backdrop)
 */
@Composable
fun MediCoreFullScreenLoader(
    message: String = "MediCore is preparing...",
    modifier: Modifier = Modifier,
    onCancel: (() -> Unit)? = null
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.White.copy(alpha = 0.94f))
            .testTag("medicore_fullscreen_loader"),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(24.dp)
        ) {
            // MediCore Logo with subtle cardiac pulse
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(MediCorePrimary.copy(alpha = 0.08f))
                    .padding(12.dp)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ic_medicore_logo),
                    contentDescription = "MediCore Logo",
                    modifier = Modifier.size(46.dp)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Animated ECG Heartbeat
            MediCoreECGLoader(
                width = 200.dp,
                height = 54.dp,
                strokeWidth = 2.8.dp,
                lineColor = MediCorePrimary,
                gridLineColor = MediCorePrimaryDark.copy(alpha = 0.12f)
            )

            Spacer(modifier = Modifier.height(18.dp))

            Text(
                text = message,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = MediCoreTextDark,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = "Secured Clinical Enterprise Operations",
                fontSize = 11.sp,
                color = MediCoreTextMuted,
                letterSpacing = 0.3.sp
            )

            if (onCancel != null) {
                Spacer(modifier = Modifier.height(24.dp))
                OutlinedButton(
                    onClick = onCancel,
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Cancel", fontSize = 13.sp, color = MediCorePrimaryDark)
                }
            }
        }
    }
}

/**
 * 2. Page-level ECG Loader (used when loading a section/hub screen)
 */
@Composable
fun MediCorePageLoader(
    message: String = "Loading your dashboard...",
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 40.dp, horizontal = 20.dp)
            .testTag("medicore_page_loader"),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            MediCoreECGLoader(
                width = 170.dp,
                height = 46.dp,
                strokeWidth = 2.5.dp,
                lineColor = MediCorePrimary
            )

            Spacer(modifier = Modifier.height(14.dp))

            Text(
                text = message,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = MediCoreTextMuted,
                textAlign = TextAlign.Center
            )
        }
    }
}

/**
 * 3. Inline ECG Loader (used inside list cards, detail sheets, summary rows)
 */
@Composable
fun MediCoreInlineLoader(
    message: String = "Synchronizing...",
    modifier: Modifier = Modifier,
    lineColor: Color = MediCorePrimary
) {
    Row(
        modifier = modifier
            .padding(horizontal = 12.dp, vertical = 6.dp)
            .testTag("medicore_inline_loader"),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        MediCoreECGLoader(
            width = 90.dp,
            height = 28.dp,
            strokeWidth = 2.dp,
            lineColor = lineColor,
            showGrid = false
        )

        Spacer(modifier = Modifier.width(10.dp))

        Text(
            text = message,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = lineColor
        )
    }
}

/**
 * 4. Button ECG Loader (fits neatly inside buttons during submission)
 */
@Composable
fun MediCoreButtonLoader(
    modifier: Modifier = Modifier,
    lineColor: Color = Color.White
) {
    Row(
        modifier = modifier.testTag("medicore_button_loader"),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        MediCoreECGLoader(
            width = 72.dp,
            height = 22.dp,
            strokeWidth = 2.dp,
            lineColor = lineColor,
            showGrid = false,
            showLeadDot = false,
            animationDurationMillis = 1400
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = "Processing...",
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = lineColor
        )
    }
}

/**
 * 5. Splash ECG Loader (used exclusively on startup with logo & 3-second minimum duration)
 */
@Composable
fun MediCoreSplashLoader(
    message: String = "Preparing MediCore...",
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.testTag("medicore_splash_loader"),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        MediCoreECGLoader(
            width = 190.dp,
            height = 50.dp,
            strokeWidth = 2.8.dp,
            lineColor = MediCorePrimary,
            gridLineColor = MediCorePrimaryDark.copy(alpha = 0.12f)
        )

        Spacer(modifier = Modifier.height(14.dp))

        Text(
            text = message,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = MediCorePrimary,
            letterSpacing = 0.5.sp
        )
    }
}

/**
 * Enterprise Retry Error State with consistent Medical Blue / Error Red styling
 */
@Composable
fun MediCoreErrorState(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .fillMaxWidth()
            .padding(24.dp)
            .testTag("medicore_error_state")
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(MediCoreError.copy(alpha = 0.10f))
            ) {
                Icon(
                    imageVector = Icons.Default.Refresh,
                    contentDescription = "Retry",
                    tint = MediCoreError,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "Operation Encountered an Issue",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = MediCoreTextDark
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = message,
                fontSize = 13.sp,
                color = MediCoreTextMuted,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(containerColor = MediCorePrimary),
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Retry", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
