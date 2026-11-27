package com.example.feature.modules

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Biotech
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.EventAvailable
import androidx.compose.material.icons.filled.Medication
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.MonitorHeart
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.core.designsystem.components.MediCoreButton
import com.example.core.designsystem.components.MediCoreCard
import com.example.core.designsystem.components.MediCoreEmptyState
import com.example.core.designsystem.components.MediCoreStatusBadge
import com.example.core.designsystem.components.MediCoreTopBar
import com.example.data.repository.MediCoreEnterpriseRepository
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCoreBorder
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCorePrimaryDark
import com.example.ui.theme.MediCoreSecondary
import com.example.ui.theme.MediCoreSuccess
import com.example.ui.theme.MediCoreSurfaceVariant
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted

// =============================================================================
// 1. PATIENT DOCTORS DIRECTORY SCREEN
// =============================================================================

data class DoctorInfo(
    val id: String,
    val name: String,
    val specialty: String,
    val qualification: String,
    val experienceYears: Int,
    val opdTimings: String,
    val feePaise: Long,
    val rating: Double
)

@Composable
fun PatientDoctorsScreen(
    onNavigateBack: () -> Unit,
    onBookConsultation: (doctorId: String) -> Unit
) {
    BackHandler { onNavigateBack() }

    val doctors = remember {
        listOf(
            DoctorInfo("DOC-01", "Dr. A. K. Choudhary", "Cardiology", "MBBS, MD, DM (Cardio)", 16, "Mon - Fri, 10:00 AM - 02:00 PM", 60000, 4.9),
            DoctorInfo("DOC-02", "Dr. Sunita Murmu", "Obstetrics & Gynaecology", "MBBS, MS (OBG)", 12, "Mon - Sat, 09:00 AM - 01:00 PM", 50000, 4.8),
            DoctorInfo("DOC-03", "Dr. Rajesh Sinha", "General Medicine", "MBBS, MD (Internal Med)", 18, "Daily, 08:30 AM - 03:00 PM", 40000, 4.7),
            DoctorInfo("DOC-04", "Dr. Priya Kujur", "Pediatrics & Neonatology", "MBBS, DCH, DNB", 10, "Tue - Sun, 11:00 AM - 04:00 PM", 50000, 4.9),
            DoctorInfo("DOC-05", "Dr. Anand Prakash", "Orthopedics & Joint Surgery", "MBBS, MS (Ortho)", 14, "Mon - Fri, 02:00 PM - 06:00 PM", 70000, 4.8),
            DoctorInfo("DOC-06", "Dr. Meenakshi Roy", "Psychiatry & Behavioral Health", "MBBS, MD (Psychiatry)", 11, "Mon, Wed, Fri, 10:00 AM - 01:30 PM", 60000, 4.9)
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MediCoreBackground)
            .testTag("patient_doctors_screen")
    ) {
        MediCoreTopBar(
            title = "Find Doctors",
            subtitle = "Verified Specialists & OPD Timings",
            onNavigateBack = onNavigateBack
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                Surface(
                    color = MediCorePrimary.copy(alpha = 0.08f),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MediCorePrimary.copy(alpha = 0.2f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(14.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.MedicalServices,
                            contentDescription = null,
                            tint = MediCorePrimary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Browse registered physicians and schedule an in-clinic OPD consultation directly.",
                            fontSize = 13.sp,
                            color = MediCoreTextDark
                        )
                    }
                }
            }

            items(doctors) { doc ->
                MediCoreCard(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier
                                    .size(46.dp)
                                    .clip(CircleShape)
                                    .background(MediCorePrimary.copy(alpha = 0.1f))
                            ) {
                                Icon(
                                    Icons.Default.Person,
                                    contentDescription = null,
                                    tint = MediCorePrimary,
                                    modifier = Modifier.size(26.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = doc.name,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MediCoreTextDark
                                )
                                Text(
                                    text = "${doc.specialty} • ${doc.qualification}",
                                    fontSize = 12.sp,
                                    color = MediCoreSecondary,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                            MediCoreStatusBadge(
                                label = "${doc.experienceYears}y exp",
                                statusType = "ACTIVE"
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(
                                Icons.Default.Schedule,
                                contentDescription = null,
                                tint = MediCoreTextMuted,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = doc.opdTimings,
                                fontSize = 12.sp,
                                color = MediCoreTextMuted,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                text = "₹${doc.feePaise / 100}",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = MediCorePrimaryDark
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        MediCoreButton(
                            text = "Book Appointment",
                            leadingIcon = Icons.Default.EventAvailable,
                            onClick = { onBookConsultation(doc.id) },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}

// =============================================================================
// 2. PATIENT MEDICAL RECORDS SCREEN (Personal EHR, Vitals & Timeline)
// =============================================================================

@Composable
fun PatientMedicalRecordsScreen(
    onNavigateBack: () -> Unit
) {
    BackHandler { onNavigateBack() }
    val vitals by MediCoreEnterpriseRepository.vitals.collectAsState()
    val encounters by MediCoreEnterpriseRepository.encounters.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MediCoreBackground)
            .testTag("patient_medical_records_screen")
    ) {
        MediCoreTopBar(
            title = "My Medical Records",
            subtitle = "Personal EHR • Clinical Encounters • Vitals Timeline",
            onNavigateBack = onNavigateBack
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            // Summary Card
            item {
                MediCoreCard {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.MonitorHeart, contentDescription = null, tint = MediCorePrimary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Latest Vital Signs",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = MediCoreTextDark
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        val latest = vitals.firstOrNull()
                        if (latest != null) {
                            Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                VitalStatBox("Blood Pressure", "${latest.systolicBp}/${latest.diastolicBp} mmHg")
                                VitalStatBox("Pulse", "${latest.heartRateBpm} bpm")
                                VitalStatBox("SpO2", "${latest.oxygenSaturation}%")
                                VitalStatBox("BMI", "%.1f".format(latest.bmi))
                            }
                        } else {
                            Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                VitalStatBox("Blood Pressure", "120/80 mmHg")
                                VitalStatBox("Pulse", "72 bpm")
                                VitalStatBox("SpO2", "99%")
                                VitalStatBox("BMI", "22.5")
                            }
                        }
                    }
                }
            }

            // Clinical Encounters History
            item {
                Text(
                    text = "Clinical Encounters & Doctor Notes",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextDark
                )
            }

            if (encounters.isEmpty()) {
                item {
                    MediCoreEmptyState(
                        title = "No Clinical Encounters Logged",
                        description = "Your completed OPD and clinical visit summaries will appear here with physician notes and diagnosis."
                    )
                }
            } else {
                items(encounters) { enc ->
                    MediCoreCard(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "ICD-10: ${enc.icd10Code}",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MediCorePrimary
                                )
                                MediCoreStatusBadge(
                                    label = enc.status,
                                    statusType = enc.status
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Chief Complaint: ${enc.chiefComplaint}",
                                fontSize = 13.sp,
                                color = MediCoreTextDark,
                                fontWeight = FontWeight.Medium
                            )
                            if (enc.diagnosisDescription.isNotBlank()) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Physician Notes: ${enc.diagnosisDescription}",
                                    fontSize = 12.sp,
                                    color = MediCoreTextMuted
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun VitalStatBox(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = label, fontSize = 11.sp, color = MediCoreTextMuted)
        Spacer(modifier = Modifier.height(2.dp))
        Text(text = value, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MediCorePrimaryDark)
    }
}

// =============================================================================
// 3. PATIENT PRESCRIPTIONS SCREEN
// =============================================================================

data class PatientPrescriptionItem(
    val id: String,
    val medicineName: String,
    val dosage: String,
    val frequency: String,
    val duration: String,
    val doctorName: String,
    val status: String
)

@Composable
fun PatientPrescriptionsScreen(
    onNavigateBack: () -> Unit,
    onOpenMedicationTracking: () -> Unit = {}
) {
    BackHandler { onNavigateBack() }
    val encounters by MediCoreEnterpriseRepository.encounters.collectAsState()

    val samplePrescriptions = remember {
        listOf(
            PatientPrescriptionItem("RX-01", "Amlodipine 5mg", "1 tablet", "Once daily (Morning)", "30 days", "Dr. A. K. Choudhary", "DISPENSED"),
            PatientPrescriptionItem("RX-02", "Paracetamol 650mg", "1 tablet", "As needed for fever/pain", "5 days", "Dr. Rajesh Sinha", "ACTIVE"),
            PatientPrescriptionItem("RX-03", "Cetirizine 10mg", "1 tablet", "Once daily at bedtime", "10 days", "Dr. Priya Kujur", "ACTIVE"),
            PatientPrescriptionItem("RX-04", "Pantoprazole 40mg", "1 capsule", "Before breakfast", "14 days", "Dr. Rajesh Sinha", "DISPENSED")
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MediCoreBackground)
            .testTag("patient_prescriptions_screen")
    ) {
        MediCoreTopBar(
            title = "My Prescriptions",
            subtitle = "Active Medications & Pharmacy Dispensing Log",
            onNavigateBack = onNavigateBack
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                Surface(
                    color = MediCoreSecondary.copy(alpha = 0.08f),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MediCoreSecondary.copy(alpha = 0.2f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Medication,
                                contentDescription = null,
                                tint = MediCoreSecondary,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = "Access your verified digital prescriptions with dosage instructions and pharmacy fulfillment status.",
                                fontSize = 13.sp,
                                color = MediCoreTextDark
                            )
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        androidx.compose.material3.Button(
                            onClick = onOpenMedicationTracking,
                            colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MediCoreSecondary),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("open_medication_reminders_button")
                        ) {
                            Text("Open Medication Schedule & Reminders", color = Color.White, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }

            items(samplePrescriptions) { rx ->
                MediCoreCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = rx.medicineName,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = MediCoreTextDark
                            )
                            MediCoreStatusBadge(
                                label = rx.status,
                                statusType = rx.status
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = MediCoreSecondary,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "${rx.dosage} • ${rx.frequency}",
                                fontSize = 13.sp,
                                color = MediCoreTextMuted
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Duration: ${rx.duration} | Prescribed by: ${rx.doctorName}",
                            fontSize = 12.sp,
                            color = MediCoreTextMuted
                        )
                    }
                }
            }
        }
    }
}

// =============================================================================
// 4. PATIENT LAB REPORTS SCREEN
// =============================================================================

@Composable
fun PatientLabReportsScreen(
    onNavigateBack: () -> Unit
) {
    BackHandler { onNavigateBack() }
    val labOrders by MediCoreEnterpriseRepository.labOrders.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MediCoreBackground)
            .testTag("patient_lab_reports_screen")
    ) {
        MediCoreTopBar(
            title = "My Lab Reports",
            subtitle = "Diagnostic Orders • Pathology • Verified Results",
            onNavigateBack = onNavigateBack
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                Surface(
                    color = MediCorePrimary.copy(alpha = 0.08f),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MediCorePrimary.copy(alpha = 0.2f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(14.dp)
                    ) {
                        Icon(
                            Icons.Default.Biotech,
                            contentDescription = null,
                            tint = MediCorePrimary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Track your diagnostic test requests, sample collection stages, and verified pathologist reports.",
                            fontSize = 13.sp,
                            color = MediCoreTextDark
                        )
                    }
                }
            }

            if (labOrders.isEmpty()) {
                item {
                    MediCoreEmptyState(
                        title = "No Lab Orders Active",
                        description = "Diagnostic tests ordered during your hospital OPD/IPD visits will display test status and verified PDF reports here."
                    )
                }
            } else {
                items(labOrders) { order ->
                    MediCoreCard(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = order.testName,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MediCoreTextDark
                                )
                                MediCoreStatusBadge(
                                    label = order.status,
                                    statusType = order.status
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Sample ID: ${order.sampleTrackingId} • Category: ${order.category}",
                                fontSize = 12.sp,
                                color = MediCoreTextMuted
                            )
                            if (!order.resultSummary.isNullOrBlank()) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Result: ${order.resultSummary}",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = MediCorePrimary
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// =============================================================================
// 5. PATIENT NOTIFICATIONS SCREEN
// =============================================================================

data class PatientNotification(
    val id: String,
    val title: String,
    val message: String,
    val timeAgo: String,
    val icon: ImageVector,
    val iconColor: Color,
    val isRead: Boolean
)

@Composable
fun PatientNotificationsScreen(
    onNavigateBack: () -> Unit
) {
    BackHandler { onNavigateBack() }

    val notifications = remember {
        listOf(
            PatientNotification(
                id = "NOTIF-01",
                title = "Upcoming OPD Appointment Reminder",
                message = "You have a scheduled OPD consultation tomorrow at 10:00 AM at Rajendra Institute of Medical Sciences (RIMS).",
                timeAgo = "2 hours ago",
                icon = Icons.Default.EventAvailable,
                iconColor = MediCorePrimary,
                isRead = false
            ),
            PatientNotification(
                id = "NOTIF-02",
                title = "Prescription Refill Ready",
                message = "Your prescribed medications have been verified by the dispensary and are ready for pickup.",
                timeAgo = "1 day ago",
                icon = Icons.Default.Medication,
                iconColor = MediCoreSecondary,
                isRead = false
            ),
            PatientNotification(
                id = "NOTIF-03",
                title = "Lab Test Results Published",
                message = "Your Complete Blood Count (CBC) test results have been verified by the pathologist and added to your EHR.",
                timeAgo = "3 days ago",
                icon = Icons.Default.Biotech,
                iconColor = MediCoreSuccess,
                isRead = true
            ),
            PatientNotification(
                id = "NOTIF-04",
                title = "Payment Invoice Receipt",
                message = "Invoice #INV-2026-001 has been settled successfully via Razorpay UPI.",
                timeAgo = "5 days ago",
                icon = Icons.Default.CheckCircle,
                iconColor = MediCorePrimaryDark,
                isRead = true
            )
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MediCoreBackground)
            .testTag("patient_notifications_screen")
    ) {
        MediCoreTopBar(
            title = "Notifications",
            subtitle = "Appointments, Prescriptions & Health Alerts",
            onNavigateBack = onNavigateBack
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(notifications) { notif ->
                MediCoreCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(notif.iconColor.copy(alpha = 0.12f))
                        ) {
                            Icon(
                                imageVector = notif.icon,
                                contentDescription = null,
                                tint = notif.iconColor,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = notif.title,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MediCoreTextDark,
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    text = notif.timeAgo,
                                    fontSize = 11.sp,
                                    color = MediCoreTextMuted
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = notif.message,
                                fontSize = 12.sp,
                                color = MediCoreTextDark
                            )
                        }
                    }
                }
            }
        }
    }
}
