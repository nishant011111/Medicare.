package com.example.feature.medications

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Medication
import androidx.compose.material.icons.filled.NotificationsOff
import androidx.compose.material.icons.filled.Snooze
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.core.designsystem.components.MediCoreButton
import com.example.core.designsystem.components.MediCoreCard
import com.example.core.designsystem.components.MediCoreStatusBadge
import com.example.core.designsystem.components.MediCoreTextField
import com.example.core.network.AdherenceSummaryDto
import com.example.core.network.MedicationDoseLogDto
import com.example.core.network.MedicationSummaryDto
import com.example.core.network.ScheduledDoseSlotDto
import com.example.ui.theme.MediCoreBorder
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

@Composable
fun AdherenceSummaryBanner(
    summary: AdherenceSummaryDto,
    modifier: Modifier = Modifier
) {
    MediCoreCard(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Medication Adherence",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = MediCoreTextDark
                    )
                    Text(
                        text = "Based solely on recorded taken and skipped doses",
                        fontSize = 11.sp,
                        color = MediCoreTextMuted
                    )
                }
                Surface(
                    color = MediCorePrimary.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.dp, MediCorePrimary.copy(alpha = 0.25f))
                ) {
                    Text(
                        text = if (summary.adherencePercent != null) "${summary.adherencePercent}%" else "No Doses Logged",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = MediCorePrimaryDark,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                StatChip("Taken", summary.takenCount.toString(), MediCoreSuccess, Modifier.weight(1f))
                StatChip("Skipped", summary.skippedCount.toString(), MediCoreError, Modifier.weight(1f))
                StatChip("Upcoming", summary.upcomingTodayCount.toString(), MediCorePrimary, Modifier.weight(1f))
                StatChip("Missed", summary.missedTodayCount.toString(), MediCoreWarning, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun StatChip(label: String, count: String, accent: Color, modifier: Modifier = Modifier) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(accent.copy(alpha = 0.08f))
            .border(1.dp, accent.copy(alpha = 0.22f), RoundedCornerShape(10.dp))
            .padding(vertical = 8.dp, horizontal = 4.dp)
    ) {
        Text(text = count, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = accent)
        Text(text = label, fontSize = 11.sp, color = MediCoreTextMuted, maxLines = 1)
    }
}

@Composable
fun NotificationPermissionBanner(
    permissionDenied: Boolean,
    canScheduleExactAlarms: Boolean,
    onRequestPermission: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (permissionDenied) {
        Surface(
            color = MediCoreWarning.copy(alpha = 0.10f),
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, MediCoreWarning.copy(alpha = 0.35f)),
            modifier = modifier
                .fillMaxWidth()
                .testTag("notification_denied_banner")
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(14.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.NotificationsOff,
                    contentDescription = "Notifications disabled",
                    tint = MediCoreWarning,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Notifications Disabled",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = MediCoreTextDark
                    )
                    Text(
                        text = "Device reminder alerts are turned off. Your medication schedules and dose tracking remain active inside MediCore.",
                        fontSize = 12.sp,
                        color = MediCoreTextMuted
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                TextButton(
                    onClick = onRequestPermission,
                    modifier = Modifier.testTag("enable_notifications_button")
                ) {
                    Text("Allow", fontWeight = FontWeight.Bold, color = MediCorePrimaryDark)
                }
            }
        }
    } else if (!canScheduleExactAlarms) {
        Surface(
            color = MediCoreSurfaceVariant,
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.dp, MediCoreBorder),
            modifier = modifier.fillMaxWidth()
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(12.dp)
            ) {
                Icon(Icons.Default.Alarm, contentDescription = null, tint = MediCorePrimary, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Android battery optimization may slightly delay background notifications.",
                    fontSize = 11.sp,
                    color = MediCoreTextMuted
                )
            }
        }
    }
}

@Composable
fun TodayDoseSlotCard(
    slot: ScheduledDoseSlotDto,
    isMutating: Boolean,
    onMarkTaken: () -> Unit,
    onSnooze: () -> Unit,
    onMarkSkipped: () -> Unit,
    onOpenMedication: () -> Unit,
    modifier: Modifier = Modifier
) {
    val accent = when {
        slot.status == "TAKEN" -> MediCoreSuccess
        slot.status == "SKIPPED" -> MediCoreError
        slot.status == "SNOOZED" -> MediCoreSecondary
        slot.isMissed -> MediCoreWarning
        else -> MediCorePrimary
    }

    val badgeLabel = when {
        slot.status == "TAKEN" -> "TAKEN"
        slot.status == "SKIPPED" -> "SKIPPED"
        slot.status == "SNOOZED" -> "SNOOZED"
        slot.isMissed -> "MISSED"
        else -> "UPCOMING"
    }

    MediCoreCard(
        onClick = onOpenMedication,
        modifier = modifier
            .fillMaxWidth()
            .testTag("today_dose_card_${slot.medicationId}_${slot.scheduledTime}")
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(accent.copy(alpha = 0.12f))
                    ) {
                        Icon(
                            imageVector = when (slot.status) {
                                "TAKEN" -> Icons.Default.CheckCircle
                                "SKIPPED" -> Icons.Default.Close
                                "SNOOZED" -> Icons.Default.Snooze
                                else -> Icons.Default.AccessTime
                            },
                            contentDescription = badgeLabel,
                            tint = accent,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "${slot.medicineName} (${slot.strength})".trim(),
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = MediCoreTextDark,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "${slot.scheduledTime} • ${slot.dosage}" + (slot.route?.let { " • $it" } ?: ""),
                            fontSize = 12.sp,
                            color = MediCoreTextMuted
                        )
                    }
                }
                MediCoreStatusBadge(
                    label = badgeLabel,
                    statusType = when {
                        slot.status == "TAKEN" -> "ACTIVE"
                        slot.status == "SKIPPED" -> "CANCELLED"
                        slot.isMissed -> "PENDING"
                        else -> "INFO"
                    }
                )
            }

            if (!slot.personalNotes.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Personal note: ${slot.personalNotes}",
                    fontSize = 12.sp,
                    color = MediCoreTextMuted
                )
            }

            if (slot.status == "NOT_RECORDED" || slot.status == "SNOOZED") {
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Button(
                        onClick = onMarkTaken,
                        enabled = !isMutating,
                        colors = ButtonDefaults.buttonColors(containerColor = MediCoreSuccess),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .testTag("take_dose_button_${slot.scheduledTime}")
                    ) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Taken", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }

                    if (slot.status != "SNOOZED") {
                        OutlinedButton(
                            onClick = onSnooze,
                            enabled = !isMutating,
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, MediCoreSecondary),
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                                .testTag("snooze_dose_button_${slot.scheduledTime}")
                        ) {
                            Icon(Icons.Default.Snooze, contentDescription = null, tint = MediCoreSecondary, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Snooze", fontSize = 12.sp, color = MediCoreSecondary, fontWeight = FontWeight.SemiBold)
                        }
                    }

                    OutlinedButton(
                        onClick = onMarkSkipped,
                        enabled = !isMutating,
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, MediCoreError.copy(alpha = 0.7f)),
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .testTag("skip_dose_button_${slot.scheduledTime}")
                    ) {
                        Icon(Icons.Default.Close, contentDescription = null, tint = MediCoreError, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Skip", fontSize = 12.sp, color = MediCoreError, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
fun MedicationSummaryCard(
    medication: MedicationSummaryDto,
    onClick: () -> Unit,
    onAddReminderClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    MediCoreCard(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .testTag("medication_card_${medication.id}")
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(MediCorePrimary.copy(alpha = 0.1f))
                    ) {
                        Icon(Icons.Default.Medication, contentDescription = null, tint = MediCorePrimary, modifier = Modifier.size(24.dp))
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "${medication.medicineName} ${medication.strength}".trim(),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = MediCoreTextDark
                        )
                        Text(
                            text = "${medication.dosage} • ${medication.frequency}",
                            fontSize = 13.sp,
                            color = MediCoreSecondary,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                MediCoreStatusBadge(label = medication.status, statusType = medication.status)
            }

            Spacer(modifier = Modifier.height(10.dp))

            if (!medication.doctorName.isNullOrBlank()) {
                Text(
                    text = "Prescribed by: ${medication.doctorName}" +
                        (medication.doctorSpecialization?.let { " ($it)" } ?: ""),
                    fontSize = 12.sp,
                    color = MediCoreTextDark
                )
            }
            val dateLine = buildList {
                medication.prescriptionDate?.let { add("Rx Date: $it") }
                medication.durationDays?.let { add("$it days") }
                if (medication.startDate != null && medication.endDate != null) {
                    add("${medication.startDate} → ${medication.endDate}")
                }
            }.joinToString(" • ")
            if (dateLine.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Event, contentDescription = null, tint = MediCoreTextMuted, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(text = dateLine, fontSize = 12.sp, color = MediCoreTextMuted)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(MediCoreSurfaceVariant)
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = if (medication.nextScheduledDose != null) {
                            "Next dose: ${medication.nextScheduledDose.scheduledDate} at ${medication.nextScheduledDose.scheduledTime}"
                        } else {
                            "Personal reminders: ${medication.activeReminderCount} active"
                        },
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MediCorePrimaryDark
                    )
                    Text(
                        text = "Rx #${medication.prescriptionNumber} • Read-only",
                        fontSize = 11.sp,
                        color = MediCoreTextMuted
                    )
                }
                if (onAddReminderClick != null && medication.status == "ACTIVE") {
                    TextButton(
                        onClick = onAddReminderClick,
                        modifier = Modifier.testTag("quick_add_reminder_${medication.id}")
                    ) {
                        Icon(Icons.Default.Alarm, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Remind", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun DoseHistoryItemCard(
    log: MedicationDoseLogDto,
    onRequestCorrection: () -> Unit,
    modifier: Modifier = Modifier
) {
    MediCoreCard(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Icon(Icons.Default.History, contentDescription = null, tint = MediCorePrimary, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "${log.medicineName} ${log.strength}".trim(),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = MediCoreTextDark
                        )
                        Text(
                            text = "${log.scheduledDate} at ${log.scheduledTime} • ${log.dosage}",
                            fontSize = 12.sp,
                            color = MediCoreTextMuted
                        )
                    }
                }
                MediCoreStatusBadge(
                    label = log.status,
                    statusType = when (log.status) {
                        "TAKEN" -> "ACTIVE"
                        "SKIPPED" -> "CANCELLED"
                        "SNOOZED" -> "PENDING"
                        else -> "INFO"
                    }
                )
            }

            if (!log.correctionReason.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Audit note (${log.previousStatus ?: "prior"} → ${log.status}): ${log.correctionReason}",
                    fontSize = 11.sp,
                    color = MediCoreTextMuted
                )
            }

            Spacer(modifier = Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.End,
                modifier = Modifier.fillMaxWidth()
            ) {
                TextButton(
                    onClick = onRequestCorrection,
                    modifier = Modifier.testTag("correct_dose_button_${log.id}")
                ) {
                    Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Correct Entry", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
fun DoseCorrectionDialog(
    log: MedicationDoseLogDto,
    onDismiss: () -> Unit,
    onConfirmCorrection: (newStatus: String, reason: String) -> Unit
) {
    var selectedStatus by remember {
        mutableStateOf(if (log.status == "TAKEN") "SKIPPED" else "TAKEN")
    }
    var reason by remember { mutableStateOf("") }
    var localError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("Audit Dose Correction", fontWeight = FontWeight.Bold, color = MediCoreTextDark)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "${log.medicineName} (${log.scheduledDate} ${log.scheduledTime})\nCurrent status: ${log.status}",
                    fontSize = 13.sp,
                    color = MediCoreTextMuted
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    listOf("TAKEN", "SKIPPED").forEach { statusOption ->
                        val active = selectedStatus == statusOption
                        OutlinedButton(
                            onClick = { selectedStatus = statusOption },
                            border = BorderStroke(1.dp, if (active) MediCorePrimary else MediCoreBorder),
                            colors = ButtonDefaults.outlinedButtonColors(
                                containerColor = if (active) MediCorePrimary.copy(alpha = 0.1f) else MediCoreSurface
                            ),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(statusOption, fontWeight = FontWeight.Bold, color = if (active) MediCorePrimaryDark else MediCoreTextDark)
                        }
                    }
                }
                MediCoreTextField(
                    value = reason,
                    onValueChange = {
                        reason = it
                        localError = null
                    },
                    label = "Correction Reason (Audited)",
                    placeholder = "e.g., Marked taken by mistake before meal",
                    errorMessage = localError
                )
            }
        },
        confirmButton = {
            MediCoreButton(
                text = "Save Correction",
                onClick = {
                    if (reason.trim().length < 3) {
                        localError = "Please enter an audit reason (at least 3 characters)."
                    } else {
                        onConfirmCorrection(selectedStatus, reason.trim())
                    }
                }
            )
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
fun ReadOnlyPrescriptionNoticeCard(modifier: Modifier = Modifier) {
    Surface(
        color = MediCorePrimary.copy(alpha = 0.08f),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, MediCorePrimary.copy(alpha = 0.22f)),
        modifier = modifier.fillMaxWidth()
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(12.dp)) {
            Icon(Icons.Default.Lock, contentDescription = "Read-only prescription", tint = MediCorePrimary, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = "Clinician-issued prescriptions are read-only. Personal reminders stay separate and never alter your doctor's instructions.",
                fontSize = 12.sp,
                color = MediCoreTextDark
            )
        }
    }
}
