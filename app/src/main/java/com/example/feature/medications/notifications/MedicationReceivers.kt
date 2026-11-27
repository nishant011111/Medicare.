package com.example.feature.medications.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat
import com.example.data.repository.PatientMedicationsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Fires local reminder notification when AlarmManager wakes up, then schedules
 * the next occurrence for recurring reminders.
 */
class MedicationReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != MedicationReminderScheduler.ACTION_FIRE_REMINDER) return
        val reminderId = intent.getStringExtra(MedicationReminderScheduler.EXTRA_REMINDER_ID) ?: return
        val medicationId = intent.getStringExtra(MedicationReminderScheduler.EXTRA_MEDICATION_ID) ?: return
        val medicineName = intent.getStringExtra(MedicationReminderScheduler.EXTRA_MEDICINE_NAME) ?: "Medication"
        val dosage = intent.getStringExtra(MedicationReminderScheduler.EXTRA_DOSAGE) ?: ""
        val scheduledDate = intent.getStringExtra(MedicationReminderScheduler.EXTRA_SCHEDULED_DATE)
            ?: PatientMedicationsRepository.todayDateYmd()
        val scheduledTime = intent.getStringExtra(MedicationReminderScheduler.EXTRA_SCHEDULED_TIME) ?: "09:00"
        val timezone = intent.getStringExtra(MedicationReminderScheduler.EXTRA_TIMEZONE) ?: "Asia/Kolkata"

        MedicationReminderScheduler.postDoseReminderNotification(
            context = context,
            reminderId = reminderId,
            medicationId = medicationId,
            medicineName = medicineName,
            dosage = dosage,
            scheduledDate = scheduledDate,
            scheduledTime = scheduledTime,
            timezone = timezone
        )

        // Schedule the next recurring occurrence cleanly
        MedicationReminderScheduler.rescheduleCachedAlarms(context)
    }
}

/**
 * Handles inline notification actions (Taken, Snooze 15m, Skip) without requiring
 * the app UI to be open, persisting the explicit patient choice to the MediCore backend.
 */
class MedicationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        val notificationId = intent.getIntExtra(MedicationReminderScheduler.EXTRA_NOTIFICATION_ID, 0)
        val reminderId = intent.getStringExtra(MedicationReminderScheduler.EXTRA_REMINDER_ID) ?: return
        val medicationId = intent.getStringExtra(MedicationReminderScheduler.EXTRA_MEDICATION_ID) ?: return
        val medicineName = intent.getStringExtra(MedicationReminderScheduler.EXTRA_MEDICINE_NAME) ?: "Medication"
        val dosage = intent.getStringExtra(MedicationReminderScheduler.EXTRA_DOSAGE) ?: ""
        val scheduledDate = intent.getStringExtra(MedicationReminderScheduler.EXTRA_SCHEDULED_DATE) ?: return
        val scheduledTime = intent.getStringExtra(MedicationReminderScheduler.EXTRA_SCHEDULED_TIME) ?: return
        val timezone = intent.getStringExtra(MedicationReminderScheduler.EXTRA_TIMEZONE) ?: "Asia/Kolkata"

        if (notificationId != 0) {
            NotificationManagerCompat.from(context).cancel(notificationId)
        }

        val targetStatus = when (action) {
            MedicationReminderScheduler.ACTION_MARK_TAKEN -> "TAKEN"
            MedicationReminderScheduler.ACTION_SNOOZE -> "SNOOZED"
            MedicationReminderScheduler.ACTION_DISMISS -> "SKIPPED"
            else -> return
        }

        if (targetStatus == "SNOOZED") {
            MedicationReminderScheduler.clearDedupKey(context, "$reminderId::$scheduledDate::$scheduledTime")
            MedicationReminderScheduler.scheduleSnoozeAlarm(
                context = context,
                reminderId = reminderId,
                medicationId = medicationId,
                medicineName = medicineName,
                dosage = dosage,
                scheduledDate = scheduledDate,
                scheduledTime = scheduledTime,
                timezone = timezone,
                snoozeMinutes = 15
            )
        }

        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val repo = PatientMedicationsRepository(context.applicationContext)
                repo.recordDose(
                    medicationId = medicationId,
                    reminderId = reminderId,
                    scheduledDate = scheduledDate,
                    scheduledTime = scheduledTime,
                    status = targetStatus,
                    snoozeMinutes = if (targetStatus == "SNOOZED") 15 else null,
                    timezone = timezone
                )
            } finally {
                pendingResult.finish()
            }
        }
    }
}

/**
 * Re-registers scheduled medication reminder alarms after device reboot, app update,
 * system clock adjustment, or timezone / DST transitions.
 */
class MedicationBootAndTimeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                MedicationReminderScheduler.rescheduleCachedAlarms(context)
            }
        }
    }
}
