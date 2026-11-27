package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.example.core.designsystem.components.MediCoreWatermarkBackground
import com.example.core.navigation.MediCoreNavHost
import com.example.core.security.configureAppCheck
import com.example.ui.theme.MediCoreTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Configure App Check with launch Intent before setContent, ViewModels, or Firebase operations
        configureAppCheck(this, intent)

        enableEdgeToEdge()
        setContent {
            MediCoreTheme {
                MediCoreWatermarkBackground(
                    modifier = Modifier.fillMaxSize(),
                    watermarkAlpha = 0.60f
                ) {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = Color.Transparent
                    ) {
                        MediCoreNavHost()
                    }
                }
            }
        }
    }
}
