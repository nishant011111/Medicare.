package com.example.data.repository

import android.content.Context
import com.example.core.network.CreateMedicationReminderRequestDto
import com.example.core.network.DeleteReminderResponseDto
import com.example.core.network.DoseListResponseDto
import com.example.core.network.MediCoreApiService
import com.example.core.network.MedicationDashboardResponseDto
import com.example.core.network.MedicationDetailResponseDto
import com.example.core.network.MedicationDoseLogDto
import com.example.core.network.MedicationReminderDto
import com.example.core.network.NetworkClientProvider
import com.example.core.network.RecordDoseRequestDto
import com.example.core.network.ReminderListResponseDto
import com.example.core.network.UpdateDoseRequestDto
import com.example.core.network.UpdateMedicationReminderRequestDto
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

data class ReminderValidationResult(
    val isValid: Boolean,
    val errorMessage: String? = null
)

class PatientMedicationsRepository(
    context: Context? = null,
    private val apiService: MediCoreApiService = requireNotNull(
        context?.let { NetworkClientProvider.getApiService(it) }
    ) { "Context or explicit MediCoreApiService is required" }
) {
    suspend fun getMedicationsDashboard(
        status: String = "ALL",
        timezone: String = TimeZone.getDefault().id,
        date: String? = null
    ): ApiResult<MedicationDashboardResponseDto> {
        return try {
            ApiResponseParser.parse(
                apiService.getPatientMedications(status = status, timezone = timezone, date = date)
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to load prescribed medications.")
        }
    }

    suspend fun getMedicationDetail(
        medicationId: String,
        timezone: String = TimeZone.getDefault().id
    ): ApiResult<MedicationDetailResponseDto> {
        return try {
            ApiResponseParser.parse(
                apiService.getPatientMedicationDetail(medicationId = medicationId, timezone = timezone)
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to load medication details.")
        }
    }

    suspend fun listReminders(
        medicationId: String? = null,
        enabledOnly: Boolean? = null,
        timezone: String = TimeZone.getDefault().id,
        date: String? = null
    ): ApiResult<ReminderListResponseDto> {
        return try {
            ApiResponseParser.parse(
                apiService.listMedicationReminders(
                    medicationId = medicationId,
                    enabledOnly = enabledOnly,
                    timezone = timezone,
                    date = date
                )
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to load reminders.")
        }
    }

    suspend fun createReminder(
        medicationId: String,
        label: String?,
        scheduleType: String,
        daysOfWeek: List<Int>,
        reminderTimes: List<String>,
        timezone: String,
        startDate: String,
        endDate: String?,
        isEnabled: Boolean,
        personalNotes: String?
    ): ApiResult<MedicationReminderDto> {
        val validation = validateReminderInput(
            scheduleType = scheduleType,
            daysOfWeek = daysOfWeek,
            reminderTimes = reminderTimes,
            startDate = startDate,
            endDate = endDate
        )
        if (!validation.isValid) {
            return ApiResult.Error("VALIDATION_ERROR", validation.errorMessage ?: "Invalid reminder schedule.")
        }
        return try {
            ApiResponseParser.parse(
                apiService.createMedicationReminder(
                    CreateMedicationReminderRequestDto(
                        medicationId = medicationId,
                        label = label?.trim()?.takeIf { it.isNotEmpty() },
                        scheduleType = scheduleType,
                        daysOfWeek = if (scheduleType == "DAILY") listOf(0, 1, 2, 3, 4, 5, 6) else daysOfWeek.distinct().sorted(),
                        reminderTimes = reminderTimes.distinct().sorted(),
                        timezone = timezone.ifBlank { TimeZone.getDefault().id },
                        startDate = startDate,
                        endDate = endDate?.takeIf { it.isNotBlank() },
                        isEnabled = isEnabled,
                        personalNotes = personalNotes?.trim()?.takeIf { it.isNotEmpty() }
                    )
                )
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to save medication reminder.")
        }
    }

    suspend fun updateReminder(
        reminderId: String,
        label: String? = null,
        scheduleType: String? = null,
        daysOfWeek: List<Int>? = null,
        reminderTimes: List<String>? = null,
        timezone: String? = null,
        startDate: String? = null,
        endDate: String? = null,
        isEnabled: Boolean? = null,
        personalNotes: String? = null
    ): ApiResult<MedicationReminderDto> {
        if (reminderTimes != null && startDate != null && scheduleType != null) {
            val validation = validateReminderInput(
                scheduleType = scheduleType,
                daysOfWeek = daysOfWeek.orEmpty(),
                reminderTimes = reminderTimes,
                startDate = startDate,
                endDate = endDate
            )
            if (!validation.isValid) {
                return ApiResult.Error("VALIDATION_ERROR", validation.errorMessage ?: "Invalid reminder schedule.")
            }
        }
        return try {
            ApiResponseParser.parse(
                apiService.updateMedicationReminder(
                    reminderId = reminderId,
                    request = UpdateMedicationReminderRequestDto(
                        label = label,
                        scheduleType = scheduleType,
                        daysOfWeek = daysOfWeek?.distinct()?.sorted(),
                        reminderTimes = reminderTimes?.distinct()?.sorted(),
                        timezone = timezone,
                        startDate = startDate,
                        endDate = endDate?.takeIf { it.isNotBlank() },
                        isEnabled = isEnabled,
                        personalNotes = personalNotes
                    )
                )
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to update medication reminder.")
        }
    }

    suspend fun deleteReminder(reminderId: String): ApiResult<DeleteReminderResponseDto> {
        return try {
            ApiResponseParser.parse(apiService.deleteMedicationReminder(reminderId))
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to delete reminder.")
        }
    }

    suspend fun listDoseLogs(
        medicationId: String? = null,
        status: String = "ALL",
        startDate: String? = null,
        endDate: String? = null
    ): ApiResult<DoseListResponseDto> {
        return try {
            ApiResponseParser.parse(
                apiService.listMedicationDoses(
                    medicationId = medicationId,
                    status = status,
                    startDate = startDate,
                    endDate = endDate
                )
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to load dose history.")
        }
    }

    suspend fun recordDose(
        medicationId: String,
        reminderId: String?,
        scheduledDate: String,
        scheduledTime: String,
        status: String,
        snoozeMinutes: Int? = null,
        notes: String? = null,
        timezone: String = TimeZone.getDefault().id
    ): ApiResult<MedicationDoseLogDto> {
        if (status !in setOf("TAKEN", "SKIPPED", "SNOOZED")) {
            return ApiResult.Error("VALIDATION_ERROR", "Dose action must be TAKEN, SKIPPED, or SNOOZED.")
        }
        if (!isValidTime24h(scheduledTime) || !isValidDateYmd(scheduledDate)) {
            return ApiResult.Error("VALIDATION_ERROR", "Invalid scheduled date or time format.")
        }
        return try {
            ApiResponseParser.parse(
                apiService.recordMedicationDose(
                    RecordDoseRequestDto(
                        medicationId = medicationId,
                        reminderId = reminderId,
                        scheduledDate = scheduledDate,
                        scheduledTime = scheduledTime,
                        status = status,
                        snoozeMinutes = snoozeMinutes,
                        notes = notes?.trim()?.takeIf { it.isNotEmpty() },
                        timezone = timezone
                    )
                )
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to record medication dose.")
        }
    }

    suspend fun updateDose(
        doseId: String,
        status: String,
        snoozeMinutes: Int? = null,
        notes: String? = null,
        correctionReason: String? = null
    ): ApiResult<MedicationDoseLogDto> {
        return try {
            ApiResponseParser.parse(
                apiService.updateMedicationDose(
                    doseId = doseId,
                    request = UpdateDoseRequestDto(
                        status = status,
                        snoozeMinutes = snoozeMinutes,
                        notes = notes?.trim()?.takeIf { it.isNotEmpty() },
                        correctionReason = correctionReason?.trim()?.takeIf { it.isNotEmpty() }
                    )
                )
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to update recorded dose.")
        }
    }

    companion object {
        private val TIME_REGEX = Regex("^([01]\\d|2[0-3]):[0-5]\\d$")
        private val DATE_REGEX = Regex("^\\d{4}-\\d{2}-\\d{2}$")

        fun isValidTime24h(time: String): Boolean = TIME_REGEX.matches(time.trim())

        fun isValidDateYmd(date: String): Boolean {
            val trimmed = date.trim()
            if (!DATE_REGEX.matches(trimmed)) return false
            val parts = trimmed.split("-").mapNotNull { it.toIntOrNull() }
            if (parts.size != 3) return false
            val (y, m, d) = parts
            if (m !in 1..12 || d !in 1..31) return false
            val cal = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
                isLenient = false
                set(Calendar.YEAR, y)
                set(Calendar.MONTH, m - 1)
                set(Calendar.DAY_OF_MONTH, d)
            }
            return try {
                cal.timeInMillis
                true
            } catch (_: Exception) {
                false
            }
        }

        fun validateReminderInput(
            scheduleType: String,
            daysOfWeek: List<Int>,
            reminderTimes: List<String>,
            startDate: String,
            endDate: String?
        ): ReminderValidationResult {
            if (reminderTimes.isEmpty()) {
                return ReminderValidationResult(false, "Please choose at least one dose reminder time.")
            }
            if (reminderTimes.any { !isValidTime24h(it) }) {
                return ReminderValidationResult(false, "Reminder times must use 24-hour HH:mm format.")
            }
            if (scheduleType == "SPECIFIC_DAYS" && daysOfWeek.isEmpty()) {
                return ReminderValidationResult(false, "Please select at least one day of the week.")
            }
            if (!isValidDateYmd(startDate)) {
                return ReminderValidationResult(false, "Start date must be a valid YYYY-MM-DD date.")
            }
            if (!endDate.isNullOrBlank()) {
                if (!isValidDateYmd(endDate)) {
                    return ReminderValidationResult(false, "End date must be a valid YYYY-MM-DD date.")
                }
                if (endDate < startDate) {
                    return ReminderValidationResult(false, "End date must be on or after the start date.")
                }
            }
            return ReminderValidationResult(true)
        }

        fun todayDateYmd(timezoneId: String = TimeZone.getDefault().id, nowMillis: Long = System.currentTimeMillis()): String {
            val tz = TimeZone.getTimeZone(timezoneId.ifBlank { "Asia/Kolkata" })
            val cal = Calendar.getInstance(tz).apply { timeInMillis = nowMillis }
            return String.format(
                Locale.US,
                "%04d-%02d-%02d",
                cal.get(Calendar.YEAR),
                cal.get(Calendar.MONTH) + 1,
                cal.get(Calendar.DAY_OF_MONTH)
            )
        }

        /**
         * Computes the next future epoch timestamp for a reminder time slot in the configured
         * IANA TimeZone, automatically handling local timezone offsets and daylight saving transitions.
         */
        fun computeNextOccurrence(
            scheduleType: String,
            daysOfWeek: List<Int>,
            timeHHmm: String,
            timezoneId: String,
            startDate: String,
            endDate: String?,
            nowMillis: Long = System.currentTimeMillis()
        ): Pair<String, Long>? {
            if (!isValidTime24h(timeHHmm) || !isValidDateYmd(startDate)) return null
            val parts = timeHHmm.split(":").map { it.toInt() }
            val hour = parts[0]
            val minute = parts[1]
            val tz = TimeZone.getTimeZone(timezoneId.ifBlank { TimeZone.getDefault().id })

            val probe = Calendar.getInstance(tz).apply {
                timeInMillis = nowMillis
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            for (offset in 0..14) {
                val candidate = (probe.clone() as Calendar).apply {
                    add(Calendar.DAY_OF_YEAR, offset)
                    set(Calendar.HOUR_OF_DAY, hour)
                    set(Calendar.MINUTE, minute)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                if (candidate.timeInMillis <= nowMillis + 2_000L) continue

                val dateStr = String.format(
                    Locale.US,
                    "%04d-%02d-%02d",
                    candidate.get(Calendar.YEAR),
                    candidate.get(Calendar.MONTH) + 1,
                    candidate.get(Calendar.DAY_OF_MONTH)
                )
                if (dateStr < startDate) continue
                if (!endDate.isNullOrBlank() && dateStr > endDate) return null

                // Calendar.DAY_OF_WEEK is 1 (Sunday) .. 7 (Saturday) -> convert to 0..6
                val dow0 = candidate.get(Calendar.DAY_OF_WEEK) - 1
                if (scheduleType == "SPECIFIC_DAYS" && !daysOfWeek.contains(dow0)) continue

                return dateStr to candidate.timeInMillis
            }
            return null
        }
    }
}
