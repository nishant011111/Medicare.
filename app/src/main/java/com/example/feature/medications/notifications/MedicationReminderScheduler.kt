package com.example.feature.medications.notifications

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.content.edit
import com.example.MainActivity
import com.example.R
import com.example.core.network.MedicationReminderDto
import com.example.data.repository.PatientMedicationsRepository
import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import java.util.Objects

data class CachedReminderSchedule(
    val id: String,
    val medicationId: String,
    val medicineName: String,
    val dosage: String,
    val scheduleType: String,
    val daysOfWeek: List<Int>,
    val reminderTimes: List<String>,
    val timezone: String,
    val startDate: String,
    val endDate: String?,
    val isEnabled: Boolean
)

/**
 * Local reminder scheduling & notification manager backed by Android AlarmManager.
 * Honors Android battery-saving & Doze restrictions without requesting restricted
 * USE_EXACT_ALARM privileges, prevents duplicate notifications via deterministic IDs,
 * and persists active schedules locally only for reboot/timezone alarm rescheduling.
 */
object MedicationReminderScheduler {

    const val CHANNEL_ID = "medicore_medication_reminders"
    const val ACTION_FIRE_REMINDER = "com.example.medicore.ACTION_FIRE_MEDICATION_REMINDER"
    const val ACTION_MARK_TAKEN = "com.example.medicore.ACTION_DOSE_TAKEN"
    const val ACTION_SNOOZE = "com.example.medicore.ACTION_DOSE_SNOOZE"
    const val ACTION_DISMISS = "com.example.medicore.ACTION_DOSE_DISMISS"

    const val EXTRA_REMINDER_ID = "extra_reminder_id"
    const val EXTRA_MEDICATION_ID = "extra_medication_id"
    const val EXTRA_MEDICINE_NAME = "extra_medicine_name"
    const val EXTRA_DOSAGE = "extra_dosage"
    const val EXTRA_SCHEDULED_DATE = "extra_scheduled_date"
    const val EXTRA_SCHEDULED_TIME = "extra_scheduled_time"
    const val EXTRA_TIMEZONE = "extra_timezone"
    const val EXTRA_NOTIFICATION_ID = "extra_notification_id"

    private const val PREFS_NAME = "medicore_medication_alarms"
    private const val KEY_SCHEDULES = "cached_schedules_json"
    private const val KEY_DEDUP_PREFIX = "notified_"

    private val moshi: Moshi = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()
    private val listType = Types.newParameterizedType(List::class.java, CachedReminderSchedule::class.java)
    private val listAdapter: JsonAdapter<List<CachedReminderSchedule>> = moshi.adapter(listType)

    fun ensureNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                ?: return
            val existing = manager.getNotificationChannel(CHANNEL_ID)
            if (existing == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    context.getString(R.string.medication_channel_name),
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = context.getString(R.string.medication_channel_description)
                    lockscreenVisibility = NotificationCompat.VISIBILITY_PRIVATE
                }
                manager.createNotificationChannel(channel)
            }
        }
    }

    fun hasNotificationPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    fun canScheduleExactAlarms(context: Context): Boolean {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return false
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            alarmManager.canScheduleExactAlarms()
        } else {
            true
        }
    }

    fun deterministicNotificationId(reminderId: String, scheduledDate: String, scheduledTime: String): Int {
        return Objects.hash(reminderId, scheduledDate, scheduledTime) and 0x7FFFFFFF
    }

    fun deterministicAlarmRequestCode(reminderId: String, scheduledTime: String): Int {
        return Objects.hash(reminderId, scheduledTime) and 0x7FFFFFFF
    }

    fun saveCachedSchedules(context: Context, reminders: List<MedicationReminderDto>) {
        val mapped = reminders
            .filter { it.isEnabled }
            .map {
                CachedReminderSchedule(
                    id = it.id,
                    medicationId = it.medicationId,
                    medicineName = it.medicineName,
                    dosage = it.dosage,
                    scheduleType = it.scheduleType,
                    daysOfWeek = it.daysOfWeek,
                    reminderTimes = it.reminderTimes,
                    timezone = it.timezone,
                    startDate = it.startDate,
                    endDate = it.endDate,
                    isEnabled = it.isEnabled
                )
            }
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit {
                putString(KEY_SCHEDULES, listAdapter.toJson(mapped))
            }
    }

    fun loadCachedSchedules(context: Context): List<CachedReminderSchedule> {
        val json = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_SCHEDULES, null) ?: return emptyList()
        return try {
            listAdapter.fromJson(json).orEmpty()
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun syncAll(context: Context, reminders: List<MedicationReminderDto>, nowMillis: Long = System.currentTimeMillis()) {
        val previous = loadCachedSchedules(context)
        previous.forEach { old ->
            cancelScheduleAlarms(context, old)
        }
        saveCachedSchedules(context, reminders)
        rescheduleCachedAlarms(context, nowMillis)
    }

    fun rescheduleCachedAlarms(context: Context, nowMillis: Long = System.currentTimeMillis()): Int {
        ensureNotificationChannel(context)
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return 0
        val schedules = loadCachedSchedules(context)
        var scheduledCount = 0

        for (schedule in schedules) {
            if (!schedule.isEnabled) continue
            for (timeStr in schedule.reminderTimes) {
                val next = PatientMedicationsRepository.computeNextOccurrence(
                    scheduleType = schedule.scheduleType,
                    daysOfWeek = schedule.daysOfWeek,
                    timeHHmm = timeStr,
                    timezoneId = schedule.timezone,
                    startDate = schedule.startDate,
                    endDate = schedule.endDate,
                    nowMillis = nowMillis
                ) ?: continue

                val (scheduledDate, triggerMillis) = next
                val intent = Intent(context, MedicationReminderReceiver::class.java).apply {
                    action = ACTION_FIRE_REMINDER
                    putExtra(EXTRA_REMINDER_ID, schedule.id)
                    putExtra(EXTRA_MEDICATION_ID, schedule.medicationId)
                    putExtra(EXTRA_MEDICINE_NAME, schedule.medicineName)
                    putExtra(EXTRA_DOSAGE, schedule.dosage)
                    putExtra(EXTRA_SCHEDULED_DATE, scheduledDate)
                    putExtra(EXTRA_SCHEDULED_TIME, timeStr)
                    putExtra(EXTRA_TIMEZONE, schedule.timezone)
                }

                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    deterministicAlarmRequestCode(schedule.id, timeStr),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                schedulePlatformAlarm(context, alarmManager, triggerMillis, pendingIntent)
                scheduledCount++
            }
        }
        return scheduledCount
    }

    fun scheduleSnoozeAlarm(
        context: Context,
        reminderId: String,
        medicationId: String,
        medicineName: String,
        dosage: String,
        scheduledDate: String,
        scheduledTime: String,
        timezone: String,
        snoozeMinutes: Int = 15,
        nowMillis: Long = System.currentTimeMillis()
    ) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val triggerMillis = nowMillis + (snoozeMinutes.coerceIn(5, 120) * 60_000L)
        val intent = Intent(context, MedicationReminderReceiver::class.java).apply {
            action = ACTION_FIRE_REMINDER
            putExtra(EXTRA_REMINDER_ID, reminderId)
            putExtra(EXTRA_MEDICATION_ID, medicationId)
            putExtra(EXTRA_MEDICINE_NAME, medicineName)
            putExtra(EXTRA_DOSAGE, dosage)
            putExtra(EXTRA_SCHEDULED_DATE, scheduledDate)
            putExtra(EXTRA_SCHEDULED_TIME, scheduledTime)
            putExtra(EXTRA_TIMEZONE, timezone)
        }
        val reqCode = Objects.hash("snooze", reminderId, scheduledDate, scheduledTime) and 0x7FFFFFFF
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            reqCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        schedulePlatformAlarm(context, alarmManager, triggerMillis, pendingIntent)
    }

    fun cancelScheduleAlarms(context: Context, schedule: CachedReminderSchedule) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        for (timeStr in schedule.reminderTimes) {
            val intent = Intent(context, MedicationReminderReceiver::class.java).apply {
                action = ACTION_FIRE_REMINDER
            }
            val pi = PendingIntent.getBroadcast(
                context,
                deterministicAlarmRequestCode(schedule.id, timeStr),
                intent,
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )
            if (pi != null) {
                alarmManager.cancel(pi)
                pi.cancel()
            }
        }
    }

    @SuppressLint("MissingPermission")
    private fun schedulePlatformAlarm(
        context: Context,
        alarmManager: AlarmManager,
        triggerMillis: Long,
        pendingIntent: PendingIntent
    ) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMillis, pendingIntent)
            } else if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMillis, pendingIntent)
            } else {
                // Graceful inexact Doze-friendly scheduling when exact alarm privilege isn't granted
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMillis, pendingIntent)
            }
        } catch (_: SecurityException) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMillis, pendingIntent)
        }
    }

    fun wasRecentlyNotified(context: Context, key: String, nowMillis: Long = System.currentTimeMillis()): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val last = prefs.getLong("$KEY_DEDUP_PREFIX$key", 0L)
        return last > 0L && (nowMillis - last) < 60_000L
    }

    fun markNotified(context: Context, key: String, nowMillis: Long = System.currentTimeMillis()) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit {
                putLong("$KEY_DEDUP_PREFIX$key", nowMillis)
            }
    }

    fun clearDedupKey(context: Context, key: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit {
                remove("$KEY_DEDUP_PREFIX$key")
            }
    }

    fun postDoseReminderNotification(
        context: Context,
        reminderId: String,
        medicationId: String,
        medicineName: String,
        dosage: String,
        scheduledDate: String,
        scheduledTime: String,
        timezone: String
    ): Boolean {
        if (!hasNotificationPermission(context)) return false

        val dedupKey = "$reminderId::$scheduledDate::$scheduledTime"
        if (wasRecentlyNotified(context, dedupKey)) return false
        markNotified(context, dedupKey)

        ensureNotificationChannel(context)
        val notificationId = deterministicNotificationId(reminderId, scheduledDate, scheduledTime)

        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentPi = PendingIntent.getActivity(
            context,
            notificationId,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val publicVersion = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_medicore_logo)
            .setContentTitle(context.getString(R.string.medication_notification_lockscreen_title))
            .setContentText(context.getString(R.string.medication_notification_lockscreen_body))
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()

        val takenPi = buildActionPendingIntent(
            context, ACTION_MARK_TAKEN, notificationId, reminderId, medicationId,
            medicineName, dosage, scheduledDate, scheduledTime, timezone, 1
        )
        val snoozePi = buildActionPendingIntent(
            context, ACTION_SNOOZE, notificationId, reminderId, medicationId,
            medicineName, dosage, scheduledDate, scheduledTime, timezone, 2
        )
        val skipPi = buildActionPendingIntent(
            context, ACTION_DISMISS, notificationId, reminderId, medicationId,
            medicineName, dosage, scheduledDate, scheduledTime, timezone, 3
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_medicore_logo)
            .setContentTitle("Medication Reminder • $scheduledTime")
            .setContentText("$medicineName ($dosage)")
            .setStyle(NotificationCompat.BigTextStyle().bigText("$medicineName — $dosage scheduled at $scheduledTime. Tap Taken, Snooze 15m, or Skip."))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setPublicVersion(publicVersion)
            .setContentIntent(contentPi)
            .setAutoCancel(true)
            .addAction(0, "Taken", takenPi)
            .addAction(0, "Snooze 15m", snoozePi)
            .addAction(0, "Skip", skipPi)
            .build()

        return try {
            NotificationManagerCompat.from(context).notify(notificationId, notification)
            true
        } catch (_: SecurityException) {
            false
        }
    }

    private fun buildActionPendingIntent(
        context: Context,
        actionName: String,
        notificationId: Int,
        reminderId: String,
        medicationId: String,
        medicineName: String,
        dosage: String,
        scheduledDate: String,
        scheduledTime: String,
        timezone: String,
        salt: Int
    ): PendingIntent {
        val intent = Intent(context, MedicationActionReceiver::class.java).apply {
            action = actionName
            putExtra(EXTRA_NOTIFICATION_ID, notificationId)
            putExtra(EXTRA_REMINDER_ID, reminderId)
            putExtra(EXTRA_MEDICATION_ID, medicationId)
            putExtra(EXTRA_MEDICINE_NAME, medicineName)
            putExtra(EXTRA_DOSAGE, dosage)
            putExtra(EXTRA_SCHEDULED_DATE, scheduledDate)
            putExtra(EXTRA_SCHEDULED_TIME, scheduledTime)
            putExtra(EXTRA_TIMEZONE, timezone)
        }
        val reqCode = Objects.hash(actionName, notificationId, salt) and 0x7FFFFFFF
        return PendingIntent.getBroadcast(
            context,
            reqCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
