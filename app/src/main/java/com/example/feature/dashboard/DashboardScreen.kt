package com.example.feature.dashboard

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Biotech
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Domain
import androidx.compose.material.icons.filled.DomainVerification
import androidx.compose.material.icons.filled.EventAvailable
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocalPharmacy
import androidx.compose.material.icons.filled.Medication
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.MonitorHeart
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SupervisorAccount
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.core.designsystem.components.HospitalBadge
import com.example.core.designsystem.components.MediCoreCard
import com.example.core.designsystem.components.RoleBadge
import com.example.core.model.UserRole
import com.example.feature.dashboard.views.AdminDashboardView
import com.example.feature.dashboard.views.DoctorDashboardView
import com.example.feature.dashboard.views.GenericRoleDashboardView
import com.example.feature.dashboard.views.LabTechDashboardView
import com.example.feature.dashboard.views.NurseDashboardView
import com.example.feature.dashboard.views.PatientDashboardView
import com.example.feature.dashboard.views.PharmacistDashboardView
import com.example.feature.dashboard.views.ReceptionistDashboardView
import com.example.feature.dashboard.views.SuperAdminDashboardView
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCoreBorder
import com.example.ui.theme.MediCoreColors
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCorePrimaryDark
import com.example.ui.theme.MediCoreSecondary
import com.example.ui.theme.MediCoreSurface
import com.example.ui.theme.MediCoreSurfaceVariant
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    onNavigateToHospitalSelection: () -> Unit,
    onNavigateToProfile: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToDirectory: () -> Unit,
    onNavigateToAdminDirectory: () -> Unit,
    onNavigateToClinicalEhr: () -> Unit,
    onNavigateToAppointments: () -> Unit,
    onNavigateToLabPharmacy: () -> Unit,
    onNavigateToBilling: () -> Unit,
    onNavigateToAiAssistant: () -> Unit,
    onNavigateToSecurity: () -> Unit,
    onNavigateToSaas: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var selectedBottomNavIndex by remember { mutableIntStateOf(0) }
    var showLogoutConfirmDialog by remember { mutableStateOf(false) }

    fun handleAction(actionId: String) {
        when (actionId) {
            "find_hospitals" -> onNavigateToDirectory()
            "admin_directory" -> onNavigateToAdminDirectory()
            "book_app", "doc_schedule", "book_walkin" -> onNavigateToAppointments()
            "view_ehr", "patient_lookup", "reg_patient", "manage_doctors" -> onNavigateToClinicalEhr()
            "lab_pharmacy", "order_lab", "dispense_rx", "inventory" -> onNavigateToLabPharmacy()
            "billing" -> onNavigateToBilling()
            "ai_assist" -> onNavigateToAiAssistant()
            "security_center" -> onNavigateToSecurity()
            "saas_portal", "hosp_approvals" -> onNavigateToSaas()
            else -> onNavigateToDirectory()
        }
    }

    Scaffold(
        containerColor = Color.Transparent,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MediCoreSurface)
                    .padding(horizontal = 16.dp, vertical = 10.dp)
            ) {
                // Header Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = uiState.dashboardSummary.welcomeTitle,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = MediCoreTextDark,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        HospitalBadge(
                            hospitalName = uiState.selectedHospital.name,
                            cityName = uiState.selectedHospital.city,
                            onClick = onNavigateToHospitalSelection
                        )
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        IconButton(
                            onClick = onNavigateToSecurity,
                            modifier = Modifier.testTag("notification_button")
                        ) {
                            BadgedBox(badge = { Badge(containerColor = MediCorePrimary) { Text("0") } }) {
                                Icon(
                                    imageVector = Icons.Default.Notifications,
                                    contentDescription = "Notifications",
                                    tint = MediCorePrimary
                                )
                            }
                        }

                        IconButton(
                            onClick = onNavigateToSettings,
                            modifier = Modifier.testTag("settings_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Settings,
                                contentDescription = "Settings",
                                tint = MediCorePrimary
                            )
                        }

                        IconButton(
                            onClick = onNavigateToProfile,
                            modifier = Modifier.testTag("profile_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.AccountCircle,
                                contentDescription = "Profile",
                                tint = MediCorePrimary,
                                modifier = Modifier.size(30.dp)
                            )
                        }

                        IconButton(
                            onClick = { showLogoutConfirmDialog = true },
                            modifier = Modifier.testTag("logout_icon_button")
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.Logout,
                                contentDescription = "Sign Out",
                                tint = MediCorePrimary,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Role Switcher Bar Header
                Text(
                    text = "Role Switcher Preview:",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextMuted,
                    modifier = Modifier.padding(bottom = 6.dp)
                )

                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(end = 8.dp),
                    modifier = Modifier.testTag("role_switcher_bar")
                ) {
                    items(UserRole.values()) { role ->
                        RoleBadge(
                            role = role,
                            isSelected = role == uiState.currentRole,
                            onClick = { viewModel.selectRole(role) }
                        )
                    }
                }
            }
        },
        bottomBar = {
            val navItems = listOf(
                BottomNavItem("Dashboard", Icons.Default.Home),
                BottomNavItem("Directory", Icons.Default.Domain),
                BottomNavItem("Clinical", Icons.Default.MedicalServices),
                BottomNavItem("SaaS", Icons.Default.DomainVerification),
                BottomNavItem("Profile", Icons.Default.Person)
            )
            NavigationBar(
                containerColor = MediCoreSurface,
                tonalElevation = 4.dp,
                modifier = Modifier.testTag("dashboard_bottom_nav")
            ) {
                navItems.forEachIndexed { index, item ->
                    NavigationBarItem(
                        selected = selectedBottomNavIndex == index,
                        onClick = {
                            selectedBottomNavIndex = index
                            when (item.label) {
                                "Directory" -> onNavigateToDirectory()
                                "Clinical" -> onNavigateToClinicalEhr()
                                "SaaS" -> onNavigateToSaas()
                                "Profile" -> onNavigateToProfile()
                            }
                        },
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label, fontSize = 11.sp) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MediCorePrimary,
                            selectedTextColor = MediCorePrimaryDark,
                            indicatorColor = MediCoreSurfaceVariant,
                            unselectedIconColor = MediCoreTextMuted,
                            unselectedTextColor = MediCoreTextMuted
                        )
                    )
                }
            }
        },
        modifier = modifier.testTag("dashboard_screen")
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Role Preview Banner Notice
            if (uiState.isRolePreviewBannerVisible) {
                item {
                    Surface(
                        color = MediCoreSurfaceVariant,
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MediCoreBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            Text(
                                text = "Previewing ${uiState.currentRole.title} Dashboard Persona",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MediCorePrimary,
                                modifier = Modifier.weight(1f)
                            )
                            IconButton(
                                onClick = { viewModel.dismissRoleBanner() },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(
                                    Icons.Default.Close,
                                    contentDescription = "Dismiss Banner",
                                    tint = MediCoreTextMuted,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Dynamic Role Dashboard View
            item {
                Crossfade(
                    targetState = uiState.currentRole,
                    label = "role_view_crossfade"
                ) { role ->
                    when (role) {
                        UserRole.PATIENT -> PatientDashboardView(uiState.dashboardSummary) { handleAction("ai_assist") }
                        UserRole.DOCTOR -> DoctorDashboardView(uiState.dashboardSummary)
                        UserRole.NURSE -> NurseDashboardView(uiState.dashboardSummary)
                        UserRole.RECEPTIONIST -> ReceptionistDashboardView(uiState.dashboardSummary)
                        UserRole.PHARMACIST -> PharmacistDashboardView(uiState.dashboardSummary)
                        UserRole.LAB_TECHNICIAN -> LabTechDashboardView(uiState.dashboardSummary)
                        UserRole.ACCOUNTANT -> GenericRoleDashboardView(
                            summary = uiState.dashboardSummary,
                            headerIcon = Icons.Default.AccountBalance,
                            headerColor = MediCorePrimary
                        )
                        UserRole.HOSPITAL_ADMIN -> AdminDashboardView(uiState.dashboardSummary)
                        UserRole.SUPER_ADMIN -> SuperAdminDashboardView(uiState.dashboardSummary)
                    }
                }
            }

            // Quick Actions Section
            item {
                Text(
                    text = "Operational Modules",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextDark
                )
            }

            item {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    uiState.dashboardSummary.quickActions.take(4).forEach { action ->
                        MediCoreCard(
                            onClick = { handleAction(action.id) },
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier
                                    .padding(12.dp)
                                    .fillMaxWidth()
                            ) {
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(CircleShape)
                                        .background(MediCoreSurfaceVariant)
                                        .border(1.dp, MediCoreBorder, CircleShape)
                                ) {
                                    Icon(
                                        imageVector = getQuickActionIcon(action.iconName),
                                        contentDescription = action.label,
                                        tint = MediCorePrimary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = action.label,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MediCoreTextDark,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }
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
                    colors = ButtonDefaults.buttonColors(containerColor = com.example.ui.theme.MediCoreError)
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

data class BottomNavItem(val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

fun roleColor(role: UserRole): Long = role.badgeColorHex

fun getQuickActionIcon(iconName: String): androidx.compose.ui.graphics.vector.ImageVector {
    return when (iconName) {
        "EventAvailable", "CalendarToday", "CalendarMonth" -> Icons.Default.EventAvailable
        "Medication", "LocalPharmacy" -> Icons.Default.Medication
        "Description", "NoteAdd", "EditDocument", "Print", "ReceiptLong" -> Icons.Default.ReceiptLong
        "AutoAwesome" -> Icons.Default.AutoAwesome
        "Biotech", "Science" -> Icons.Default.Biotech
        "MonitorHeart" -> Icons.Default.MonitorHeart
        "PersonAdd" -> Icons.Default.PersonAdd
        "MedicalServices" -> Icons.Default.MedicalServices
        "Payments" -> Icons.Default.Payments
        "Domain", "DomainVerification" -> Icons.Default.Domain
        "Security" -> Icons.Default.Security
        else -> Icons.Default.Home
    }
}
