package com.example.feature.medications

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.InputChip
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.core.designsystem.components.MediCoreButton
import com.example.core.designsystem.components.MediCoreCard
import com.example.core.designsystem.components.MediCoreEmptyState
import com.example.core.designsystem.components.MediCoreErrorState
import com.example.core.designsystem.components.MediCoreLoadingState
import com.example.core.designsystem.components.MediCoreStatusBadge
import com.example.core.designsystem.components.MediCoreTextField
import com.example.core.designsystem.components.MediCoreTopBar
import com.example.core.network.MedicationDoseLogDto
import com.example.core.network.MedicationReminderDto
import com.example.data.repository.PatientMedicationsRepository
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCoreBorder
import com.example.ui.theme.MediCoreError
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCorePrimaryDark
import com.example.ui.theme.MediCoreSecondary
import com.example.ui.theme.MediCoreSurface
import com.example.ui.theme.MediCoreSurfaceVariant
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted
import java.util.Locale
import java.util.TimeZone

@Composable
fun MedicationDetailScreen(
    medicationId: String,
    onNavigateBack: () -> Unit,
    onNavigateToAddReminder: (medicationId: String, reminderId: String?) -> Unit,
    viewModel: MedicationTrackingViewModel = viewModel()
) {
    BackHandler { onNavigateBack() }

    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var correctionLogTarget by remember { mutableStateOf<MedicationDoseLogDto?>(null) }

    LaunchedEffect(medicationId) {
        viewModel.loadMedicationDetail(medicationId)
    }

    LaunchedEffect(uiState.actionBannerMessage) {
        val msg = uiState.actionBannerMessage
        if (!msg.isNullOrBlank()) {
            snackbarHostState.showSnackbar(msg)
            viewModel.clearBanners()
        }
    }

    val detail = uiState.selectedDetail

    Scaffold(
        containerColor = MediCoreBackground,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            MediCoreTopBar(
                title = detail?.medication?.medicineName ?: "Medication Details",
                subtitle = detail?.medication?.let { "Rx #${it.prescriptionNumber}" },
                onNavigateBack = onNavigateBack
            )
        },
        modifier = Modifier.testTag("medication_detail_screen")
    ) { innerPadding ->
        when {
            uiState.isDetailLoading && detail == null -> {
                MediCoreLoadingState(
                    message = "Loading prescription details...",
                    modifier = Modifier.padding(innerPadding)
                )
            }
            !uiState.detailErrorMessage.isNullOrBlank() && detail == null -> {
                MediCoreErrorState(
                    message = uiState.detailErrorMessage ?: "Unable to load medication.",
                    onRetry = { viewModel.loadMedicationDetail(medicationId) },
                    modifier = Modifier.padding(innerPadding)
                )
            }
            detail != null -> {
                val med = detail.medication
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                ) {
                    item { ReadOnlyPrescriptionNoticeCard() }

                    // Read-only clinician prescription details card
                    item {
                        MediCoreCard(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = "${med.medicineName} ${med.strength}".trim(),
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MediCoreTextDark,
                                        modifier = Modifier.weight(1f)
                                    )
                                    MediCoreStatusBadge(label = med.status, statusType = med.status)
                                }
                                DetailRow("Dosage", med.dosage)
                                med.route?.let { DetailRow("Route", it) }
                                DetailRow("Frequency", med.frequency)
                                med.durationDays?.let { DetailRow("Duration", "$it days") }
                                med.startDate?.let { DetailRow("Start Date", it) }
                                med.endDate?.let { DetailRow("End Date", it) }
                                med.doctorName?.let { doc ->
                                    DetailRow(
                                        "Prescribing Doctor",
                                        doc + (med.doctorSpecialization?.let { " ($it)" } ?: "")
                                    )
                                }
                                DetailRow("Hospital", med.hospitalName)
                                med.prescriptionDate?.let { DetailRow("Prescription Date", it) }
                                DetailRow("Instructions", med.instructions)
                                med.specialInstructions?.takeIf { it.isNotBlank() }?.let {
                                    DetailRow("Special Instructions", it)
                                }
                                if (med.discontinuedAt != null) {
                                    DetailRow("Discontinued", med.discontinuationReason ?: "Stopped by clinician")
                                }
                            }
                        }
                    }

                    // Personal reminders section
                    item {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Personal Reminders",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MediCoreTextDark
                                )
                                Text(
                                    text = "You control your own reminder times",
                                    fontSize = 12.sp,
                                    color = MediCoreTextMuted
                                )
                            }
                            if (med.status == "ACTIVE") {
                                MediCoreButton(
                                    text = "Add Reminder",
                                    leadingIcon = Icons.Default.Add,
                                    onClick = { onNavigateToAddReminder(med.id, null) },
                                    modifier = Modifier.testTag("add_reminder_button")
                                )
                            }
                        }
                    }

                    if (detail.reminders.isEmpty()) {
                        item {
                            MediCoreEmptyState(
                                title = "No Personal Reminders Set",
                                description = if (med.status == "ACTIVE") {
                                    "Add explicit reminder times matching your doctor's instructions."
                                } else {
                                    "Reminders cannot be added to ${med.status.lowercase()} medications."
                                },
                                icon = Icons.Default.Alarm
                            )
                        }
                    } else {
                        items(detail.reminders, key = { it.id }) { reminder ->
                            ReminderConfigCard(
                                reminder = reminder,
                                isMutating = uiState.isMutating,
                                onToggle = { enabled -> viewModel.toggleReminderEnabled(reminder, enabled) },
                                onEdit = { onNavigateToAddReminder(med.id, reminder.id) },
                                onDelete = { viewModel.deleteReminder(reminder.id, med.id) }
                            )
                        }
                    }

                    // Dose history for this medication
                    item {
                        Text(
                            text = "Dose History (${detail.doseHistory.size})",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = MediCoreTextDark
                        )
                    }

                    if (detail.doseHistory.isEmpty()) {
                        item {
                            Text(
                                text = "No doses recorded for this medication yet.",
                                fontSize = 13.sp,
                                color = MediCoreTextMuted
                            )
                        }
                    } else {
                        items(detail.doseHistory, key = { it.id }) { log ->
                            DoseHistoryItemCard(
                                log = log,
                                onRequestCorrection = { correctionLogTarget = log }
                            )
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

@Composable
private fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, fontSize = 12.sp, color = MediCoreTextMuted, modifier = Modifier.weight(0.38f))
        Text(
            text = value,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = MediCoreTextDark,
            modifier = Modifier.weight(0.62f)
        )
    }
}

@Composable
private fun ReminderConfigCard(
    reminder: MedicationReminderDto,
    isMutating: Boolean,
    onToggle: (Boolean) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val dayNames = listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")
    val daySummary = if (reminder.scheduleType == "DAILY") {
        "Daily"
    } else {
        reminder.daysOfWeek.mapNotNull { dayNames.getOrNull(it) }.joinToString(", ")
    }

    MediCoreCard(modifier = Modifier.fillMaxWidth().testTag("reminder_card_${reminder.id}")) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = reminder.label ?: reminder.medicineName,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = MediCoreTextDark
                    )
                    Text(
                        text = "$daySummary • ${reminder.reminderTimes.joinToString(", ")}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MediCorePrimaryDark
                    )
                    Text(
                        text = "Timezone: ${reminder.timezone} • From ${reminder.startDate}" +
                            (reminder.endDate?.let { " to $it" } ?: ""),
                        fontSize = 11.sp,
                        color = MediCoreTextMuted
                    )
                }
                Switch(
                    checked = reminder.isEnabled,
                    enabled = !isMutating,
                    onCheckedChange = onToggle,
                    colors = SwitchDefaults.colors(checkedThumbColor = MediCorePrimary)
                )
            }
            if (!reminder.personalNotes.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(text = "Note: ${reminder.personalNotes}", fontSize = 12.sp, color = MediCoreTextMuted)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                TextButton(onClick = onEdit, enabled = !isMutating) {
                    Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Edit")
                }
                TextButton(onClick = onDelete, enabled = !isMutating) {
                    Icon(Icons.Default.Delete, contentDescription = null, tint = MediCoreError, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Remove", color = MediCoreError)
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun AddEditReminderScreen(
    medicationId: String,
    existingReminderId: String?,
    onNavigateBack: () -> Unit,
    viewModel: MedicationTrackingViewModel = viewModel()
) {
    BackHandler { onNavigateBack() }

    val uiState by viewModel.uiState.collectAsState()
    LaunchedEffect(medicationId) {
        viewModel.loadMedicationDetail(medicationId)
    }

    val existingReminder = remember(existingReminderId, uiState.selectedDetail, uiState.reminders) {
        existingReminderId?.let { id ->
            uiState.selectedDetail?.reminders?.find { it.id == id }
                ?: uiState.reminders.find { it.id == id }
        }
    }

    var label by remember(existingReminder?.id) {
        mutableStateOf(existingReminder?.label.orEmpty())
    }
    var scheduleType by remember(existingReminder?.id) {
        mutableStateOf(existingReminder?.scheduleType ?: "DAILY")
    }
    val selectedDays = remember(existingReminder?.id) {
        mutableStateListOf<Int>().apply {
            addAll(existingReminder?.daysOfWeek ?: listOf(0, 1, 2, 3, 4, 5, 6))
        }
    }
    val selectedTimes = remember(existingReminder?.id) {
        mutableStateListOf<String>().apply {
            existingReminder?.reminderTimes?.let { addAll(it) }
        }
    }
    var startDate by remember(existingReminder?.id) {
        mutableStateOf(
            existingReminder?.startDate
                ?: uiState.selectedDetail?.medication?.startDate
                ?: PatientMedicationsRepository.todayDateYmd()
        )
    }
    var endDate by remember(existingReminder?.id) {
        mutableStateOf(
            existingReminder?.endDate
                ?: uiState.selectedDetail?.medication?.endDate
                ?: ""
        )
    }
    var personalNotes by remember(existingReminder?.id) {
        mutableStateOf(existingReminder?.personalNotes.orEmpty())
    }
    var isEnabled by remember(existingReminder?.id) {
        mutableStateOf(existingReminder?.isEnabled ?: true)
    }
    var validationError by remember { mutableStateOf<String?>(null) }
    var showTimePickerDialog by remember { mutableStateOf(false) }

    val dayLabels = listOf(0 to "Sun", 1 to "Mon", 2 to "Tue", 3 to "Wed", 4 to "Thu", 5 to "Fri", 6 to "Sat")

    Scaffold(
        containerColor = MediCoreBackground,
        topBar = {
            MediCoreTopBar(
                title = if (existingReminderId == null) "New Personal Reminder" else "Edit Reminder Schedule",
                subtitle = uiState.selectedDetail?.medication?.medicineName,
                onNavigateBack = onNavigateBack
            )
        },
        modifier = Modifier.testTag("add_edit_reminder_screen")
    ) { innerPadding ->
        Column(
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            ReadOnlyPrescriptionNoticeCard()

            MediCoreCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    MediCoreTextField(
                        value = label,
                        onValueChange = { label = it },
                        label = "Personal Reminder Label (Optional)",
                        placeholder = "e.g., After Breakfast"
                    )

                    Text("Schedule Frequency", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MediCoreTextDark)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("DAILY" to "Every Day", "SPECIFIC_DAYS" to "Specific Days").forEach { (type, title) ->
                            FilterChip(
                                selected = scheduleType == type,
                                onClick = {
                                    scheduleType = type
                                    if (type == "DAILY") {
                                        selectedDays.clear()
                                        selectedDays.addAll(listOf(0, 1, 2, 3, 4, 5, 6))
                                    }
                                    validationError = null
                                },
                                label = { Text(title) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MediCorePrimary,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }

                    if (scheduleType == "SPECIFIC_DAYS") {
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            dayLabels.forEach { (dow, title) ->
                                val active = selectedDays.contains(dow)
                                FilterChip(
                                    selected = active,
                                    onClick = {
                                        if (active) selectedDays.remove(dow) else selectedDays.add(dow)
                                        validationError = null
                                    },
                                    label = { Text(title, fontSize = 12.sp) }
                                )
                            }
                        }
                    }

                    Text(
                        text = "Reminder Times (Explicit Selection Required)",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MediCoreTextDark
                    )
                    if (selectedTimes.isEmpty()) {
                        Text(
                            text = "No reminder times selected yet. Tap Add Time to pick your exact schedule.",
                            fontSize = 12.sp,
                            color = MediCoreTextMuted
                        )
                    } else {
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            selectedTimes.forEach { time ->
                                InputChip(
                                    selected = true,
                                    onClick = { selectedTimes.remove(time) },
                                    label = { Text(time, fontWeight = FontWeight.Bold) },
                                    leadingIcon = { Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(16.dp)) },
                                    trailingIcon = { Icon(Icons.Default.Close, contentDescription = "Remove $time", modifier = Modifier.size(16.dp)) }
                                )
                            }
                        }
                    }

                    MediCoreButton(
                        text = "Add Dose Time",
                        leadingIcon = Icons.Default.Add,
                        isOutline = true,
                        onClick = { showTimePickerDialog = true },
                        modifier = Modifier.testTag("pick_reminder_time_button")
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        MediCoreTextField(
                            value = startDate,
                            onValueChange = {
                                startDate = it
                                validationError = null
                            },
                            label = "Start Date (YYYY-MM-DD)",
                            placeholder = "2026-11-17",
                            modifier = Modifier.weight(1f)
                        )
                        MediCoreTextField(
                            value = endDate,
                            onValueChange = {
                                endDate = it
                                validationError = null
                            },
                            label = "End Date (Optional)",
                            placeholder = "YYYY-MM-DD",
                            modifier = Modifier.weight(1f)
                        )
                    }

                    MediCoreTextField(
                        value = personalNotes,
                        onValueChange = { personalNotes = it },
                        label = "Personal Notes (Private)",
                        placeholder = "e.g., Take with a full glass of water",
                        singleLine = false
                    )

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Reminder Active", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = MediCoreTextDark)
                        Switch(
                            checked = isEnabled,
                            onCheckedChange = { isEnabled = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = MediCorePrimary)
                        )
                    }

                    val displayError = validationError ?: uiState.errorMessage
                    if (!displayError.isNullOrBlank()) {
                        Surface(
                            color = MediCoreError.copy(alpha = 0.08f),
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, MediCoreError.copy(alpha = 0.3f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = displayError,
                                color = MediCoreError,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    }

                    MediCoreButton(
                        text = if (existingReminderId == null) "Save Personal Reminder" else "Update Reminder",
                        isLoading = uiState.isMutating,
                        onClick = {
                            val check = PatientMedicationsRepository.validateReminderInput(
                                scheduleType = scheduleType,
                                daysOfWeek = selectedDays.toList(),
                                reminderTimes = selectedTimes.toList(),
                                startDate = startDate.trim(),
                                endDate = endDate.trim().takeIf { it.isNotEmpty() }
                            )
                            if (!check.isValid) {
                                validationError = check.errorMessage
                            } else {
                                viewModel.saveReminder(
                                    existingReminderId = existingReminderId,
                                    medicationId = medicationId,
                                    label = label.trim().takeIf { it.isNotEmpty() },
                                    scheduleType = scheduleType,
                                    daysOfWeek = selectedDays.toList(),
                                    reminderTimes = selectedTimes.toList(),
                                    timezone = TimeZone.getDefault().id,
                                    startDate = startDate.trim(),
                                    endDate = endDate.trim().takeIf { it.isNotEmpty() },
                                    isEnabled = isEnabled,
                                    personalNotes = personalNotes.trim().takeIf { it.isNotEmpty() },
                                    onSuccess = onNavigateBack
                                )
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("save_reminder_button")
                    )
                }
            }
        }
    }

    if (showTimePickerDialog) {
        val pickerState = rememberTimePickerState(initialHour = 9, initialMinute = 0, is24Hour = true)
        AlertDialog(
            onDismissRequest = { showTimePickerDialog = false },
            title = { Text("Select Dose Time", fontWeight = FontWeight.Bold) },
            text = {
                TimePicker(state = pickerState)
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val formatted = String.format(Locale.US, "%02d:%02d", pickerState.hour, pickerState.minute)
                        if (!selectedTimes.contains(formatted)) {
                            selectedTimes.add(formatted)
                            selectedTimes.sort()
                        }
                        validationError = null
                        showTimePickerDialog = false
                    }
                ) {
                    Text("Add $pickerState", fontWeight = FontWeight.Bold).let {
                        Text(
                            "Add ${String.format(Locale.US, "%02d:%02d", pickerState.hour, pickerState.minute)}",
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showTimePickerDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
