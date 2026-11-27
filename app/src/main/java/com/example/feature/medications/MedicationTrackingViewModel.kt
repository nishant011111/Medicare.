package com.example.feature.medications

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.core.network.AdherenceSummaryDto
import com.example.core.network.MedicationDetailResponseDto
import com.example.core.network.MedicationDoseLogDto
import com.example.core.network.MedicationReminderDto
import com.example.core.network.MedicationSummaryDto
import com.example.core.network.ScheduledDoseSlotDto
import com.example.data.repository.ApiResult
import com.example.data.repository.PatientMedicationsRepository
import com.example.feature.medications.notifications.MedicationReminderScheduler
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.TimeZone

enum class MedicationDashboardTab {
    SCHEDULE,
    ACTIVE,
    COMPLETED,
    DISCONTINUED,
    HISTORY
}

data class MedicationUiState(
    val isLoading: Boolean = false,
    val isMutating: Boolean = false,
    val errorMessage: String? = null,
    val actionBannerMessage: String? = null,
    val selectedTab: MedicationDashboardTab = MedicationDashboardTab.SCHEDULE,
    val activeMedications: List<MedicationSummaryDto> = emptyList(),
    val completedMedications: List<MedicationSummaryDto> = emptyList(),
    val discontinuedMedications: List<MedicationSummaryDto> = emptyList(),
    val allMedications: List<MedicationSummaryDto> = emptyList(),
    val todaySchedule: List<ScheduledDoseSlotDto> = emptyList(),
    val missedReminders: List<ScheduledDoseSlotDto> = emptyList(),
    val reminders: List<MedicationReminderDto> = emptyList(),
    val doseHistory: List<MedicationDoseLogDto> = emptyList(),
    val adherenceSummary: AdherenceSummaryDto? = null,
    val selectedDetail: MedicationDetailResponseDto? = null,
    val isDetailLoading: Boolean = false,
    val detailErrorMessage: String? = null,
    val notificationPermissionGranted: Boolean = true,
    val notificationPermissionDenied: Boolean = false,
    val canScheduleExactAlarms: Boolean = true
)

class MedicationTrackingViewModel(
    application: Application
) : AndroidViewModel(application) {

    private var repositoryOverride: PatientMedicationsRepository? = null
    private var disablePlatformAlarmSync: Boolean = false

    constructor(
        application: Application,
        repository: PatientMedicationsRepository,
        disableAlarmSync: Boolean = true
    ) : this(application) {
        repositoryOverride = repository
        disablePlatformAlarmSync = disableAlarmSync
    }

    private fun repo(): PatientMedicationsRepository {
        return repositoryOverride ?: PatientMedicationsRepository(getApplication())
    }

    private val _uiState = MutableStateFlow(
        MedicationUiState(
            notificationPermissionGranted = MedicationReminderScheduler.hasNotificationPermission(application),
            canScheduleExactAlarms = MedicationReminderScheduler.canScheduleExactAlarms(application)
        )
    )
    val uiState: StateFlow<MedicationUiState> = _uiState.asStateFlow()

    fun refreshPermissionStatus() {
        val ctx = getApplication<Application>()
        _uiState.update {
            it.copy(
                notificationPermissionGranted = MedicationReminderScheduler.hasNotificationPermission(ctx),
                canScheduleExactAlarms = MedicationReminderScheduler.canScheduleExactAlarms(ctx)
            )
        }
    }

    fun onNotificationPermissionResult(granted: Boolean) {
        _uiState.update {
            it.copy(
                notificationPermissionGranted = granted,
                notificationPermissionDenied = !granted
            )
        }
    }

    fun selectTab(tab: MedicationDashboardTab) {
        _uiState.update { it.copy(selectedTab = tab) }
    }

    fun clearBanners() {
        _uiState.update { it.copy(errorMessage = null, actionBannerMessage = null) }
    }

    fun loadDashboard() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            val tz = TimeZone.getDefault().id
            val medRepo = repo()

            val dashDeferred = async { medRepo.getMedicationsDashboard(status = "ALL", timezone = tz) }
            val remDeferred = async { medRepo.listReminders(timezone = tz) }
            val dosesDeferred = async { medRepo.listDoseLogs() }

            val dashRes = dashDeferred.await()
            val remRes = remDeferred.await()
            val dosesRes = dosesDeferred.await()

            when (dashRes) {
                is ApiResult.Success -> {
                    val data = dashRes.data
                    val remindersList = (remRes as? ApiResult.Success)?.data?.items ?: _uiState.value.reminders
                    val doseLogs = (dosesRes as? ApiResult.Success)?.data?.items ?: _uiState.value.doseHistory

                    if (!disablePlatformAlarmSync && remRes is ApiResult.Success) {
                        MedicationReminderScheduler.syncAll(getApplication(), remindersList)
                    }

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = null,
                            allMedications = data.medications,
                            activeMedications = data.active,
                            completedMedications = data.completed,
                            discontinuedMedications = data.discontinued,
                            todaySchedule = data.todaySchedule,
                            missedReminders = data.missedReminders,
                            adherenceSummary = data.adherenceSummary,
                            reminders = remindersList,
                            doseHistory = doseLogs
                        )
                    }
                }
                is ApiResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = dashRes.message
                        )
                    }
                }
            }
        }
    }

    fun loadMedicationDetail(medicationId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isDetailLoading = true, detailErrorMessage = null) }
            val tz = TimeZone.getDefault().id
            when (val res = repo().getMedicationDetail(medicationId = medicationId, timezone = tz)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isDetailLoading = false,
                            selectedDetail = res.data,
                            detailErrorMessage = null
                        )
                    }
                }
                is ApiResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isDetailLoading = false,
                            detailErrorMessage = res.message
                        )
                    }
                }
            }
        }
    }

    fun saveReminder(
        existingReminderId: String?,
        medicationId: String,
        label: String?,
        scheduleType: String,
        daysOfWeek: List<Int>,
        reminderTimes: List<String>,
        timezone: String,
        startDate: String,
        endDate: String?,
        isEnabled: Boolean,
        personalNotes: String?,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isMutating = true, errorMessage = null, actionBannerMessage = null) }
            val result = if (existingReminderId.isNullOrBlank()) {
                repo().createReminder(
                    medicationId = medicationId,
                    label = label,
                    scheduleType = scheduleType,
                    daysOfWeek = daysOfWeek,
                    reminderTimes = reminderTimes,
                    timezone = timezone,
                    startDate = startDate,
                    endDate = endDate,
                    isEnabled = isEnabled,
                    personalNotes = personalNotes
                )
            } else {
                repo().updateReminder(
                    reminderId = existingReminderId,
                    label = label,
                    scheduleType = scheduleType,
                    daysOfWeek = daysOfWeek,
                    reminderTimes = reminderTimes,
                    timezone = timezone,
                    startDate = startDate,
                    endDate = endDate,
                    isEnabled = isEnabled,
                    personalNotes = personalNotes
                )
            }

            when (result) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isMutating = false,
                            actionBannerMessage = if (existingReminderId == null) {
                                "Personal medication reminder created."
                            } else {
                                "Personal reminder schedule updated."
                            }
                        )
                    }
                    loadDashboard()
                    loadMedicationDetail(medicationId)
                    onSuccess()
                }
                is ApiResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isMutating = false,
                            errorMessage = result.message
                        )
                    }
                }
            }
        }
    }

    fun toggleReminderEnabled(reminder: MedicationReminderDto, enabled: Boolean) {
        viewModelScope.launch {
            _uiState.update { it.copy(isMutating = true, errorMessage = null) }
            when (val res = repo().updateReminder(reminderId = reminder.id, isEnabled = enabled)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isMutating = false,
                            actionBannerMessage = if (enabled) "Reminder enabled." else "Reminder paused."
                        )
                    }
                    loadDashboard()
                    loadMedicationDetail(reminder.medicationId)
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(isMutating = false, errorMessage = res.message) }
                }
            }
        }
    }

    fun deleteReminder(reminderId: String, medicationId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isMutating = true, errorMessage = null) }
            when (val res = repo().deleteReminder(reminderId)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isMutating = false,
                            actionBannerMessage = "Personal reminder removed. Past dose history preserved."
                        )
                    }
                    loadDashboard()
                    loadMedicationDetail(medicationId)
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(isMutating = false, errorMessage = res.message) }
                }
            }
        }
    }

    fun recordDoseForSlot(
        slot: ScheduledDoseSlotDto,
        newStatus: String,
        snoozeMinutes: Int? = null,
        notes: String? = null
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isMutating = true, errorMessage = null, actionBannerMessage = null) }
            val result = if (slot.doseLogId != null && slot.status == "SNOOZED") {
                repo().updateDose(
                    doseId = slot.doseLogId,
                    status = newStatus,
                    snoozeMinutes = snoozeMinutes,
                    notes = notes,
                    correctionReason = "Updated after snooze"
                )
            } else {
                repo().recordDose(
                    medicationId = slot.medicationId,
                    reminderId = slot.reminderId,
                    scheduledDate = slot.scheduledDate,
                    scheduledTime = slot.scheduledTime,
                    status = newStatus,
                    snoozeMinutes = snoozeMinutes,
                    notes = notes,
                    timezone = slot.timezone
                )
            }

            when (result) {
                is ApiResult.Success -> {
                    if (newStatus == "SNOOZED" && !disablePlatformAlarmSync) {
                        MedicationReminderScheduler.scheduleSnoozeAlarm(
                            context = getApplication(),
                            reminderId = slot.reminderId,
                            medicationId = slot.medicationId,
                            medicineName = slot.medicineName,
                            dosage = slot.dosage,
                            scheduledDate = slot.scheduledDate,
                            scheduledTime = slot.scheduledTime,
                            timezone = slot.timezone,
                            snoozeMinutes = snoozeMinutes ?: 15
                        )
                    }
                    val label = when (newStatus) {
                        "TAKEN" -> "Marked as Taken"
                        "SKIPPED" -> "Marked as Skipped"
                        "SNOOZED" -> "Snoozed for ${snoozeMinutes ?: 15} minutes"
                        else -> "Updated"
                    }
                    _uiState.update { it.copy(isMutating = false, actionBannerMessage = "${slot.medicineName}: $label") }
                    loadDashboard()
                    if (_uiState.value.selectedDetail?.medication?.id == slot.medicationId) {
                        loadMedicationDetail(slot.medicationId)
                    }
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(isMutating = false, errorMessage = resMessage(result)) }
                }
            }
        }
    }

    fun correctDoseLog(
        doseId: String,
        medicationId: String,
        newStatus: String,
        correctionReason: String,
        notes: String? = null
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isMutating = true, errorMessage = null) }
            when (
                val res = repo().updateDose(
                    doseId = doseId,
                    status = newStatus,
                    notes = notes,
                    correctionReason = correctionReason
                )
            ) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isMutating = false,
                            actionBannerMessage = "Dose activity corrected with audit reason."
                        )
                    }
                    loadDashboard()
                    if (_uiState.value.selectedDetail?.medication?.id == medicationId) {
                        loadMedicationDetail(medicationId)
                    }
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(isMutating = false, errorMessage = res.message) }
                }
            }
        }
    }

    private fun resMessage(err: ApiResult.Error): String {
        return if (err.code == "DUPLICATE_DOSE_RECORD") {
            "This dose slot is already logged. Use 'Correct' in history to audit-update it."
        } else {
            err.message
        }
    }
}
