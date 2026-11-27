package com.example.feature.settings

import androidx.compose.foundation.background
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.core.designsystem.components.MediCoreCard
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCoreBorder
import com.example.ui.theme.MediCoreError
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted

@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    var darkModeEnabled by remember { mutableStateOf(false) }
    var notificationsEnabled by remember { mutableStateOf(true) }
    var selectedLanguage by remember { mutableStateOf("English") }
    var showPrivacyDialog by remember { mutableStateOf(false) }
    var showTermsDialog by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .testTag("settings_screen")
            .fillMaxSize()
            .background(MediCoreBackground)
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(
                onClick = onNavigateBack,
                modifier = Modifier.testTag("settings_back_button")
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = MediCoreTextDark)
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Application Settings",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = MediCoreTextDark
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Preferences Group
        Text("Preferences", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = MediCoreTextDark)
        Spacer(modifier = Modifier.height(10.dp))

        MediCoreCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                // Red & White Mix Theme Badge
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Palette,
                            contentDescription = null,
                            tint = MediCorePrimary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text("Theme Style", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = MediCoreTextDark)
                            Text("Blue & White Mix (Clinical Active)", fontSize = 12.sp, color = MediCoreTextMuted)
                        }
                    }
                    Box(
                        modifier = Modifier
                            .background(MediCorePrimary, RoundedCornerShape(8.dp))
                            .padding(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Text("Active", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Notifications Toggle
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Notifications, contentDescription = null, tint = MediCorePrimary, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text("Push Notifications", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = MediCoreTextDark)
                            Text("Appointment & Rx alerts", fontSize = 12.sp, color = MediCoreTextMuted)
                        }
                    }
                    Switch(
                        checked = notificationsEnabled,
                        onCheckedChange = { notificationsEnabled = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = MediCorePrimary),
                        modifier = Modifier.testTag("notifications_switch")
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Language & Legal
        Text("Language & Legal", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = MediCoreTextDark)
        Spacer(modifier = Modifier.height(10.dp))

        MediCoreCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                // Language Selection
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Language, contentDescription = null, tint = MediCorePrimary, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("App Language", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = MediCoreTextDark)
                    }
                    TextButton(
                        onClick = {
                            selectedLanguage = when (selectedLanguage) {
                                "English" -> "Hindi (हिंदी)"
                                "Hindi (हिंदी)" -> "Bengali (বাংলা)"
                                else -> "English"
                            }
                        },
                        modifier = Modifier.testTag("language_toggle_button")
                    ) {
                        Text(selectedLanguage, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MediCorePrimary)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Privacy Policy Link
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .testTag("privacy_policy_button")
                        .clickable { showPrivacyDialog = true }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.PrivacyTip, contentDescription = null, tint = MediCorePrimary, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Privacy Policy", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = MediCoreTextDark)
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Terms & Conditions Link
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .testTag("terms_conditions_button")
                        .clickable { showTermsDialog = true }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Description, contentDescription = null, tint = MediCorePrimary, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Terms & Conditions", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = MediCoreTextDark)
                }
            }
        }

        Spacer(modifier = Modifier.height(28.dp))

        // Logout Action Button
        OutlinedButton(
            onClick = onLogout,
            colors = ButtonDefaults.outlinedButtonColors(contentColor = MediCoreError),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .testTag("logout_button")
                .fillMaxWidth()
                .height(50.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Logout", modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Sign Out of MediCore", fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "MediCore v1.0.0 (Phase 1 Demo Build)",
            fontSize = 12.sp,
            color = MediCoreTextMuted,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
    }

    if (showPrivacyDialog) {
        AlertDialog(
            onDismissRequest = { showPrivacyDialog = false },
            title = { Text("MediCore Privacy Policy", fontWeight = FontWeight.Bold) },
            text = { Text("MediCore prioritizes patient data security, HIPAA compliance guidelines, end-to-end encrypted medical reports, and strict role-based data access controls.") },
            confirmButton = {
                TextButton(onClick = { showPrivacyDialog = false }) { Text("Close", fontWeight = FontWeight.Bold) }
            }
        )
    }

    if (showTermsDialog) {
        AlertDialog(
            onDismissRequest = { showTermsDialog = false },
            title = { Text("Terms & Conditions", fontWeight = FontWeight.Bold) },
            text = { Text("MediCore is a healthcare platform connecting multi-hospital networks. Use of this Phase 1 demonstration build is subject to standard terms of service.") },
            confirmButton = {
                TextButton(onClick = { showTermsDialog = false }) { Text("Close", fontWeight = FontWeight.Bold) }
            }
        )
    }
}
