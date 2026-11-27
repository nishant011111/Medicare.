package com.example.feature.profile

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Domain
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
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
import com.example.core.designsystem.components.RoleBadge
import com.example.core.model.Hospital
import com.example.core.model.UserProfile
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCoreError
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCoreSecondary
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted

@Composable
fun ProfileScreen(
    userProfile: UserProfile,
    selectedHospital: Hospital,
    onNavigateBack: () -> Unit,
    onNavigateToHospitalSelection: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showLogoutConfirmDialog by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .testTag("profile_screen")
            .fillMaxSize()
            .background(MediCoreBackground)
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onNavigateBack,
                modifier = Modifier.testTag("profile_back_button")
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = MediCoreTextDark)
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "My Profile",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = MediCoreTextDark
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Profile Avatar Header
        MediCoreCard(
            modifier = Modifier.fillMaxWidth()
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
                        .size(90.dp)
                        .clip(CircleShape)
                        .background(MediCorePrimary.copy(alpha = 0.12f))
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = "Profile Avatar",
                        tint = MediCorePrimary,
                        modifier = Modifier.size(52.dp)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = userProfile.fullName,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextDark
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = userProfile.email,
                    fontSize = 14.sp,
                    color = MediCoreTextMuted
                )

                Spacer(modifier = Modifier.height(12.dp))

                RoleBadge(role = userProfile.role, isSelected = true)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Details Card
        Text(
            text = "Personal & Workplace Info",
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = MediCoreTextDark
        )

        Spacer(modifier = Modifier.height(10.dp))

        MediCoreCard(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(18.dp)
            ) {
                ProfileDetailRow(icon = Icons.Default.Person, label = "Full Name", value = userProfile.fullName)
                Spacer(modifier = Modifier.height(14.dp))
                ProfileDetailRow(icon = Icons.Default.Email, label = "Email Address", value = userProfile.email)
                Spacer(modifier = Modifier.height(14.dp))
                ProfileDetailRow(icon = Icons.Default.Phone, label = "Phone Number", value = userProfile.phone)
                Spacer(modifier = Modifier.height(14.dp))
                ProfileDetailRow(icon = Icons.Default.Domain, label = "Active Hospital Workspace", value = "${selectedHospital.name} (${selectedHospital.city})")
                Spacer(modifier = Modifier.height(14.dp))
                ProfileDetailRow(icon = Icons.Default.Shield, label = "Account Type", value = if (userProfile.isDemoAccount) "Phase 1 Demo Persona" else "Verified User")
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Button(
            onClick = onNavigateToHospitalSelection,
            colors = ButtonDefaults.buttonColors(containerColor = MediCorePrimary),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .testTag("switch_hospital_workspace_button")
                .fillMaxWidth()
                .height(50.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Domain, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Switch Hospital Workspace", fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Sign Out Button
        OutlinedButton(
            onClick = { showLogoutConfirmDialog = true },
            colors = ButtonDefaults.outlinedButtonColors(contentColor = MediCoreError),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .testTag("profile_logout_button")
                .fillMaxWidth()
                .height(50.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.Logout,
                    contentDescription = "Logout",
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Sign Out of MediCore", fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
        }
    }

    if (showLogoutConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutConfirmDialog = false },
            title = {
                Text(
                    text = "Sign Out Confirmation",
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextDark
                )
            },
            text = {
                Text(
                    text = "Are you sure you want to log out of your MediCore healthcare workspace?",
                    color = MediCoreTextMuted
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutConfirmDialog = false
                        onLogout()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MediCoreError)
                ) {
                    Text("Log Out", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutConfirmDialog = false }) {
                    Text("Cancel", color = MediCoreTextDark)
                }
            }
        )
    }
}

@Composable
fun ProfileDetailRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(38.dp)
                .clip(CircleShape)
                .background(MediCorePrimary.copy(alpha = 0.08f))
        ) {
            Icon(icon, contentDescription = label, tint = MediCorePrimary, modifier = Modifier.size(20.dp))
        }
        Spacer(modifier = Modifier.width(14.dp))
        Column {
            Text(text = label, fontSize = 11.sp, color = MediCoreTextMuted)
            Text(text = value, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = MediCoreTextDark)
        }
    }
}
