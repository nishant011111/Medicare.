package com.example.feature.medications

import android.Manifest
import android.os.Build
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Medication
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.R
import com.example.core.designsystem.components.MediCoreEmptyState
import com.example.core.designsystem.components.MediCoreErrorState
import com.example.core.designsystem.components.MediCoreLoadingState
import com.example.core.designsystem.components.MediCoreTopBar
import com.example.core.network.MedicationDoseLogDto
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCorePrimaryDark
import com.example.ui.theme.MediCoreSurface
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted

@Composable
fun MedicationDashboardScreen(
    onNavigateBack: () -> Unit,
    onOpenMedicationDetail: (String) -> Unit,
    onAddReminderForMedication: (String) -> Unit,
    viewModel: MedicationTrackingViewModel = viewModel()
) {
    BackHandler { onNavigateBack() }

    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var correctionLogTarget by remember { mutableStateOf<MedicationDoseLogDto?>(null) }

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        viewModel.onNotificationPermissionResult(granted)
    }

    LaunchedEffect(Unit) {
        viewModel.refreshPermissionStatus()
        viewModel.loadDashboard()
    }

    LaunchedEffect(uiState.actionBannerMessage) {
        val msg = uiState.actionBannerMessage
        if (!msg.isNullOrBlank()) {
            snackbarHostState.showSnackbar(msg)
            viewModel.clearBanners()
        }
    }

    Scaffold(
        containerColor = MediCoreBackground,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            MediCoreTopBar(
                title = stringResource(R.string.medications_title),
                subtitle = "Prescribed therapy & personal dose schedule",
                onNavigateBack = onNavigateBack,
                actions = {
                    IconButton(
                        onClick = { viewModel.loadDashboard() },
                        modifier = Modifier.testTag("refresh_medications_button")
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh medications", tint = MediCorePrimary)
                    }
                }
            )
        },
        modifier = Modifier.testTag("medication_dashboard_screen")
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val tabs = listOf(
                    MedicationDashboardTab.SCHEDULE to "Today (${uiState.todaySchedule.size})",
                    MedicationDashboardTab.ACTIVE to "Active (${uiState.activeMedications.size})",
                    MedicationDashboardTab.COMPLETED to "Completed (${uiState.completedMedications.size})",
                    MedicationDashboardTab.DISCONTINUED to "Stopped (${uiState.discontinuedMedications.size})",
                    MedicationDashboardTab.HISTORY to "Dose History"
                )
                items(tabs) { (tab, label) ->
                    val selected = uiState.selectedTab == tab
                    FilterChip(
                        selected = selected,
                        onClick = { viewModel.selectTab(tab) },
                        label = { Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MediCorePrimary,
                            selectedLabelColor = Color.White,
                            containerColor = MediCoreSurface,
                            labelColor = MediCoreTextDark
                        ),
                        modifier = Modifier.testTag("medication_tab_${tab.name.lowercase()}")
                    )
                }
            }

            if (uiState.isLoading && uiState.allMedications.isEmpty()) {
                MediCoreLoadingState(message = "Loading your prescribed medications...")
            } else if (!uiState.errorMessage.isNullOrBlank() && uiState.allMedications.isEmpty()) {
                MediCoreErrorState(
                    message = uiState.errorMessage ?: "Unable to load medications.",
                    onRetry = { viewModel.loadDashboard() }
                )
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    item {
                        NotificationPermissionBanner(
                            permissionDenied = !uiState.notificationPermissionGranted,
                            canScheduleExactAlarms = uiState.canScheduleExactAlarms,
                            onRequestPermission = {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                    notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                                }
                            }
                        )
                    }

                    item {
                        ReadOnlyPrescriptionNoticeCard()
                    }

                    uiState.adherenceSummary?.let { summary ->
                        item {
                            AdherenceSummaryBanner(summary = summary)
                        }
                    }

                    when (uiState.selectedTab) {
                        MedicationDashboardTab.SCHEDULE -> {
                            if (uiState.missedReminders.isNotEmpty()) {
                                item {
                                    Text(
                                        text = "Missed Doses Today (${uiState.missedReminders.size})",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MediCorePrimaryDark
                                    )
                                }
                                items(uiState.missedReminders, key = { "missed_${it.occurrenceKey}" }) { slot ->
                                    TodayDoseSlotCard(
                                        slot = slot,
                                        isMutating = uiState.isMutating,
                                        onMarkTaken = { viewModel.recordDoseForSlot(slot, "TAKEN") },
                                        onSnooze = { viewModel.recordDoseForSlot(slot, "SNOOZED", snoozeMinutes = 15) },
                                        onMarkSkipped = { viewModel.recordDoseForSlot(slot, "SKIPPED") },
                                        onOpenMedication = { onOpenMedicationDetail(slot.medicationId) }
                                    )
                                }
                            }

                            item {
                                Text(
                                    text = "Today's Scheduled Doses",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MediCoreTextDark
                                )
                            }

                            if (uiState.todaySchedule.isEmpty()) {
                                item {
                                    MediCoreEmptyState(
                                        title = "No Doses Scheduled Today",
                                        description = if (uiState.activeMedications.isNotEmpty()) {
                                            "Open any active medication to set explicit reminder times for your schedule."
                                        } else {
                                            "Prescribed medications issued by your doctor will appear here."
                                        },
                                        icon = Icons.Default.Medication,
                                        actionLabel = if (uiState.activeMedications.isNotEmpty()) "View Active Meds" else null,
                                        onActionClick = if (uiState.activeMedications.isNotEmpty()) {
                                            { viewModel.selectTab(MedicationDashboardTab.ACTIVE) }
                                        } else null
                                    )
                                }
                            } else {
                                items(uiState.todaySchedule, key = { it.occurrenceKey }) { slot ->
                                    TodayDoseSlotCard(
                                        slot = slot,
                                        isMutating = uiState.isMutating,
                                        onMarkTaken = { viewModel.recordDoseForSlot(slot, "TAKEN") },
                                        onSnooze = { viewModel.recordDoseForSlot(slot, "SNOOZED", snoozeMinutes = 15) },
                                        onMarkSkipped = { viewModel.recordDoseForSlot(slot, "SKIPPED") },
                                        onOpenMedication = { onOpenMedicationDetail(slot.medicationId) }
                                    )
                                }
                            }
                        }

                        MedicationDashboardTab.ACTIVE -> {
                            if (uiState.activeMedications.isEmpty()) {
                                item {
                                    MediCoreEmptyState(
                                        title = "No Active Medications",
                                        description = "Active prescriptions issued by your verified MediCore doctor appear here.",
                                        icon = Icons.Default.Medication
                                    )
                                }
                            } else {
                                items(uiState.activeMedications, key = { it.id }) { med ->
                                    MedicationSummaryCard(
                                        medication = med,
                                        onClick = { onOpenMedicationDetail(med.id) },
                                        onAddReminderClick = { onAddReminderForMedication(med.id) }
                                    )
                                }
                            }
                        }

                        MedicationDashboardTab.COMPLETED -> {
                            if (uiState.completedMedications.isEmpty()) {
                                item {
                                    MediCoreEmptyState(
                                        title = "No Completed Courses",
                                        description = "Finished medication courses will remain archived here.",
                                        icon = Icons.Default.Medication
                                    )
                                }
                            } else {
                                items(uiState.completedMedications, key = { it.id }) { med ->
                                    MedicationSummaryCard(
                                        medication = med,
                                        onClick = { onOpenMedicationDetail(med.id) }
                                    )
                                }
                            }
                        }

                        MedicationDashboardTab.DISCONTINUED -> {
                            if (uiState.discontinuedMedications.isEmpty()) {
                                item {
                                    MediCoreEmptyState(
                                        title = "No Discontinued Medications",
                                        description = "Medications stopped or discontinued by your clinician appear here.",
                                        icon = Icons.Default.Medication
                                    )
                                }
                            } else {
                                items(uiState.discontinuedMedications, key = { it.id }) { med ->
                                    MedicationSummaryCard(
                                        medication = med,
                                        onClick = { onOpenMedicationDetail(med.id) }
                                    )
                                }
                            }
                        }

                        MedicationDashboardTab.HISTORY -> {
                            if (uiState.doseHistory.isEmpty()) {
                                item {
                                    MediCoreEmptyState(
                                        title = "No Dose Activity Logged Yet",
                                        description = "Taken, skipped, and snoozed doses appear here with audit support.",
                                        icon = Icons.Default.Medication
                                    )
                                }
                            } else {
                                items(uiState.doseHistory, key = { it.id }) { log ->
                                    DoseHistoryItemCard(
                                        log = log,
                                        onRequestCorrection = { correctionLogTarget = log }
                                    )
                                }
                            }
                        }
                    }

                    item { Spacer(modifier = Modifier.height(16.dp)) }
                }
            }
        }
    }

    correctionLogTarget?.let { target ->
        DoseCorrectionDialog(
            log = target,
            onDismiss = { correctionLogTarget = null },
            onConfirmCorrection = { newStatus, reason ->
                viewModel.correctDoseLog(
                    doseId = target.id,
                    medicationId = target.medicationId,
                    newStatus = newStatus,
                    correctionReason = reason
                )
                correctionLogTarget = null
            }
        )
    }
}
