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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Biotech
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DomainVerification
import androidx.compose.material.icons.filled.EventAvailable
import androidx.compose.material.icons.filled.LocalPharmacy
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MonitorHeart
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.core.designsystem.components.MediCoreButton
import com.example.core.designsystem.components.MediCoreCard
import com.example.core.designsystem.components.MediCoreEmptyState
import com.example.core.designsystem.components.MediCoreStatusBadge
import com.example.core.designsystem.components.MediCoreTextField
import com.example.core.designsystem.components.MediCoreTopBar
import com.example.data.repository.MediCoreEnterpriseRepository
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

// =============================================================================
// 1. CLINICAL & EHR HUB (Phase 3 & 4)
// =============================================================================

@Composable
fun ClinicalEhrHubScreen(
    onNavigateBack: () -> Unit,
    selectedHospitalId: String
) {
    BackHandler { onNavigateBack() }
    val patients by MediCoreEnterpriseRepository.patients.collectAsState()
    val vitals by MediCoreEnterpriseRepository.vitals.collectAsState()
    val encounters by MediCoreEnterpriseRepository.encounters.collectAsState()

    var showRegisterPatientDialog by remember { mutableStateOf(false) }
    var showRecordVitalsDialog by remember { mutableStateOf(false) }

    var pName by remember { mutableStateOf("") }
    var pDob by remember { mutableStateOf("1990-05-12") }
    var pGender by remember { mutableStateOf("Female") }
    var pBlood by remember { mutableStateOf("B+") }
    var pPhone by remember { mutableStateOf("+91-9876543210") }
    var pEmergency by remember { mutableStateOf("+91-9876543211") }
    var pAddress by remember { mutableStateOf("Main Road, Ranchi") }

    var vSystolic by remember { mutableStateOf("120") }
    var vDiastolic by remember { mutableStateOf("80") }
    var vPulse by remember { mutableStateOf("72") }
    var vTemp by remember { mutableStateOf("36.8") }
    var vSpo2 by remember { mutableStateOf("99") }
    var vHeight by remember { mutableStateOf("170") }
    var vWeight by remember { mutableStateOf("65") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .testTag("clinical_ehr_hub_screen")
    ) {
        MediCoreTopBar(
            title = "Clinical Records & EHR",
            subtitle = "Hospital-scoped EHR • ICD-10 • Vitals with BMI • Timeline",
            onNavigateBack = onNavigateBack
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                MediCoreCard {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = "Patient & Clinical Actions",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = MediCorePrimary
                        )
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            MediCoreButton(
                                text = "Register Patient",
                                leadingIcon = Icons.Default.PersonAdd,
                                onClick = { showRegisterPatientDialog = true },
                                modifier = Modifier.weight(1f)
                            )
                            MediCoreButton(
                                text = "Record Vitals",
                                leadingIcon = Icons.Default.MonitorHeart,
                                isOutline = true,
                                onClick = { showRecordVitalsDialog = true },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            // Patients Section
            item {
                Text(
                    text = "Registered Patients (${patients.size})",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextDark
                )
            }

            if (patients.isEmpty()) {
                item {
                    MediCoreEmptyState(
                        title = "No patient records available.",
                        description = "Register a new patient to generate global and hospital-scoped registration IDs.",
                        icon = Icons.Default.PersonAdd,
                        actionLabel = "Register First Patient",
                        onActionClick = { showRegisterPatientDialog = true }
                    )
                }
            } else {
                items(patients, key = { it.id }) { pat ->
                    MediCoreCard {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = pat.fullName,
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MediCoreTextDark
                                    )
                                    Text(
                                        text = "Global ID: ${pat.globalPatientId} • Reg: ${pat.hospitalRegistrationNumber}",
                                        fontSize = 12.sp,
                                        color = MediCorePrimary
                                    )
                                    Text(
                                        text = "DOB: ${pat.dateOfBirth} (${pat.gender}, Blood: ${pat.bloodGroup})",
                                        fontSize = 12.sp,
                                        color = MediCoreTextMuted
                                    )
                                }
                                MediCoreStatusBadge(label = "Active EHR", statusType = "ACTIVE")
                            }
                        }
                    }
                }
            }

            // Vitals Section
            if (vitals.isNotEmpty()) {
                item {
                    Text(
                        text = "Vitals Log (${vitals.size})",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = MediCoreTextDark
                    )
                }
                items(vitals, key = { it.id }) { v ->
                    MediCoreCard {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "${v.patientName} • BP: ${v.systolicBp}/${v.diastolicBp} mmHg • Pulse: ${v.heartRateBpm} bpm",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = MediCoreTextDark
                            )
                            Text(
                                text = "Temp: ${v.temperatureCelsius}°C | SpO2: ${v.oxygenSaturation}% | BMI: ${v.bmi} kg/m²",
                                fontSize = 12.sp,
                                color = MediCorePrimaryDark
                            )
                        }
                    }
                }
            }
        }
    }

    if (showRegisterPatientDialog) {
        AlertDialog(
            onDismissRequest = { showRegisterPatientDialog = false },
            containerColor = MediCoreSurface,
            title = {
                Text("Register New Patient", fontWeight = FontWeight.Bold, color = MediCoreTextDark)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    MediCoreTextField(value = pName, onValueChange = { pName = it }, label = "Full Name")
                    MediCoreTextField(value = pDob, onValueChange = { pDob = it }, label = "Date of Birth (YYYY-MM-DD)")
                    MediCoreTextField(value = pPhone, onValueChange = { pPhone = it }, label = "Phone Number")
                    MediCoreTextField(value = pAddress, onValueChange = { pAddress = it }, label = "Residential Address")
                }
            },
            confirmButton = {
                MediCoreButton(
                    text = "Save Patient",
                    onClick = {
                        if (pName.isNotBlank()) {
                            MediCoreEnterpriseRepository.registerPatient(
                                hospitalId = selectedHospitalId,
                                fullName = pName,
                                dateOfBirth = pDob,
                                gender = pGender,
                                bloodGroup = pBlood,
                                phone = pPhone,
                                emergencyContact = pEmergency,
                                address = pAddress
                            )
                            pName = ""
                            showRegisterPatientDialog = false
                        }
                    }
                )
            },
            dismissButton = {
                TextButton(onClick = { showRegisterPatientDialog = false }) {
                    Text("Cancel", color = MediCorePrimary)
                }
            }
        )
    }

    if (showRecordVitalsDialog) {
        AlertDialog(
            onDismissRequest = { showRecordVitalsDialog = false },
            containerColor = MediCoreSurface,
            title = {
                Text("Record Patient Vitals & BMI", fontWeight = FontWeight.Bold, color = MediCoreTextDark)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    MediCoreTextField(value = vSystolic, onValueChange = { vSystolic = it }, label = "Systolic BP (mmHg)")
                    MediCoreTextField(value = vDiastolic, onValueChange = { vDiastolic = it }, label = "Diastolic BP (mmHg)")
                    MediCoreTextField(value = vPulse, onValueChange = { vPulse = it }, label = "Heart Rate (bpm)")
                    MediCoreTextField(value = vHeight, onValueChange = { vHeight = it }, label = "Height (cm)")
                    MediCoreTextField(value = vWeight, onValueChange = { vWeight = it }, label = "Weight (kg)")
                }
            },
            confirmButton = {
                MediCoreButton(
                    text = "Calculate & Log",
                    onClick = {
                        val pat = patients.firstOrNull()
                        MediCoreEnterpriseRepository.recordVitalsWithBmi(
                            patientId = pat?.id ?: "PAT-1",
                            patientName = pat?.fullName ?: "Walk-in Patient",
                            systolicBp = vSystolic.toIntOrNull() ?: 120,
                            diastolicBp = vDiastolic.toIntOrNull() ?: 80,
                            heartRateBpm = vPulse.toIntOrNull() ?: 72,
                            temperatureCelsius = vTemp.toDoubleOrNull() ?: 36.8,
                            oxygenSaturation = vSpo2.toIntOrNull() ?: 99,
                            heightCm = vHeight.toDoubleOrNull() ?: 170.0,
                            weightKg = vWeight.toDoubleOrNull() ?: 65.0
                        )
                        showRecordVitalsDialog = false
                    }
                )
            },
            dismissButton = {
                TextButton(onClick = { showRecordVitalsDialog = false }) {
                    Text("Cancel", color = MediCorePrimary)
                }
            }
        )
    }
}

// =============================================================================
// 2. APPOINTMENTS HUB (Phase 3)
// =============================================================================

@Composable
fun AppointmentsHubScreen(
    onNavigateBack: () -> Unit,
    selectedHospitalId: String
) {
    BackHandler { onNavigateBack() }
    val appointments by MediCoreEnterpriseRepository.appointments.collectAsState()
    var showBookDialog by remember { mutableStateOf(false) }

    var pName by remember { mutableStateOf("") }
    var dName by remember { mutableStateOf("Dr. S. K. Roy") }
    var dept by remember { mutableStateOf("Cardiology") }
    var aDate by remember { mutableStateOf("2026-11-10") }
    var slotTime by remember { mutableStateOf("10:30 AM") }
    var conflictError by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .testTag("appointments_hub_screen")
    ) {
        MediCoreTopBar(
            title = "Appointments & OPD Queue",
            subtitle = "Doctor slots • Queue token management • Double-booking prevention",
            onNavigateBack = onNavigateBack
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                MediCoreCard {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = "OPD Slot Scheduling",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = MediCorePrimary
                        )
                        MediCoreButton(
                            text = "Book Appointment Slot",
                            leadingIcon = Icons.Default.EventAvailable,
                            onClick = { showBookDialog = true },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            if (appointments.isEmpty()) {
                item {
                    MediCoreEmptyState(
                        title = "No appointments scheduled.",
                        description = "There are currently no active appointments booked for this facility.",
                        icon = Icons.Default.EventAvailable,
                        actionLabel = "Schedule New Slot",
                        onActionClick = { showBookDialog = true }
                    )
                }
            } else {
                items(appointments, key = { it.id }) { apt ->
                    MediCoreCard {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "${apt.bookingNumber} • Token #${apt.queueToken}",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MediCorePrimary
                                    )
                                    Text(
                                        text = apt.patientName,
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MediCoreTextDark
                                    )
                                    Text(
                                        text = "${apt.doctorName} (${apt.department})",
                                        fontSize = 13.sp,
                                        color = MediCoreTextMuted
                                    )
                                    Text(
                                        text = "${apt.appointmentDate} at ${apt.slotTime}",
                                        fontSize = 12.sp,
                                        color = MediCoreTextDark,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                                MediCoreStatusBadge(label = apt.status, statusType = apt.status)
                            }
                        }
                    }
                }
            }
        }
    }

    if (showBookDialog) {
        AlertDialog(
            onDismissRequest = {
                showBookDialog = false
                conflictError = null
            },
            containerColor = MediCoreSurface,
            title = {
                Text("Schedule Appointment Slot", fontWeight = FontWeight.Bold, color = MediCoreTextDark)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    MediCoreTextField(value = pName, onValueChange = { pName = it }, label = "Patient Name")
                    MediCoreTextField(value = dName, onValueChange = { dName = it }, label = "Consulting Doctor")
                    MediCoreTextField(value = dept, onValueChange = { dept = it }, label = "Clinical Department")
                    MediCoreTextField(value = aDate, onValueChange = { aDate = it }, label = "Date (YYYY-MM-DD)")
                    MediCoreTextField(value = slotTime, onValueChange = { slotTime = it }, label = "Slot Time")
                    if (conflictError != null) {
                        Text(conflictError!!, color = MediCoreError, fontSize = 12.sp)
                    }
                }
            },
            confirmButton = {
                MediCoreButton(
                    text = "Confirm Booking",
                    onClick = {
                        if (pName.isNotBlank()) {
                            try {
                                MediCoreEnterpriseRepository.scheduleAppointment(
                                    hospitalId = selectedHospitalId,
                                    patientName = pName,
                                    doctorName = dName,
                                    department = dept,
                                    appointmentDate = aDate,
                                    slotTime = slotTime
                                )
                                pName = ""
                                conflictError = null
                                showBookDialog = false
                            } catch (e: Exception) {
                                conflictError = e.message ?: "Booking conflict occurred."
                            }
                        }
                    }
                )
            },
            dismissButton = {
                TextButton(onClick = { showBookDialog = false }) {
                    Text("Cancel", color = MediCorePrimary)
                }
            }
        )
    }
}

// =============================================================================
// 3. LABORATORY & PHARMACY HUB (Phase 5)
// =============================================================================

@Composable
fun LabPharmacyHubScreen(
    onNavigateBack: () -> Unit
) {
    BackHandler { onNavigateBack() }
    val labOrders by MediCoreEnterpriseRepository.labOrders.collectAsState()
    val batches by MediCoreEnterpriseRepository.pharmacyBatches.collectAsState()

    var showOrderLabDialog by remember { mutableStateOf(false) }
    var showAddBatchDialog by remember { mutableStateOf(false) }

    var labPatient by remember { mutableStateOf("") }
    var labTest by remember { mutableStateOf("Complete Blood Count (CBC)") }
    var labPrice by remember { mutableStateOf("45000") } // 450.00 in paise

    var medName by remember { mutableStateOf("Amoxicillin 500mg") }
    var batchNum by remember { mutableStateOf("BAT-2026-X1") }
    var medQty by remember { mutableStateOf("100") }
    var medPrice by remember { mutableStateOf("850") } // 8.50 in paise
    var medExp by remember { mutableStateOf("2027-12-31") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .testTag("lab_pharmacy_hub_screen")
    ) {
        MediCoreTopBar(
            title = "Laboratory & Pharmacy Hub",
            subtitle = "LIS Tracking • Expiry-Aware Batch Dispensing • Safety Checks",
            onNavigateBack = onNavigateBack
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                MediCoreCard {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = "Diagnostic & Pharmacy Operations",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = MediCorePrimary
                        )
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            MediCoreButton(
                                text = "Order Lab Test",
                                leadingIcon = Icons.Default.Biotech,
                                onClick = { showOrderLabDialog = true },
                                modifier = Modifier.weight(1f)
                            )
                            MediCoreButton(
                                text = "Add Drug Batch",
                                leadingIcon = Icons.Default.LocalPharmacy,
                                isOutline = true,
                                onClick = { showAddBatchDialog = true },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            // Lab Orders Section
            item {
                Text(
                    text = "Laboratory Test Orders (${labOrders.size})",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextDark
                )
            }

            if (labOrders.isEmpty()) {
                item {
                    MediCoreEmptyState(
                        title = "No laboratory orders yet.",
                        description = "Create a test request to initiate sample tracking and pathologist verification.",
                        icon = Icons.Default.Biotech,
                        actionLabel = "Order First Test",
                        onActionClick = { showOrderLabDialog = true }
                    )
                }
            } else {
                items(labOrders, key = { it.id }) { ord ->
                    MediCoreCard {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "${ord.sampleTrackingId} • ${ord.testName}",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MediCoreTextDark
                                    )
                                    Text(
                                        text = "Patient: ${ord.patientName} (${ord.category})",
                                        fontSize = 12.sp,
                                        color = MediCoreTextMuted
                                    )
                                    Text(
                                        text = "Test Fee: ₹${ord.pricePaise / 100.0}",
                                        fontSize = 12.sp,
                                        color = MediCorePrimary,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                                MediCoreStatusBadge(label = ord.status, statusType = ord.status)
                            }
                        }
                    }
                }
            }

            // Pharmacy Batches
            item {
                Text(
                    text = "Pharmacy Drug Inventory (${batches.size})",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextDark
                )
            }

            if (batches.isEmpty()) {
                item {
                    MediCoreEmptyState(
                        title = "No pharmacy batches in stock.",
                        description = "Receive new medicine batches to track batch expiry and unit pricing.",
                        icon = Icons.Default.LocalPharmacy,
                        actionLabel = "Add Medicine Batch",
                        onActionClick = { showAddBatchDialog = true }
                    )
                }
            } else {
                items(batches, key = { it.id }) { bat ->
                    MediCoreCard {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp)
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = bat.medicineName,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MediCoreTextDark
                                )
                                Text(
                                    text = "Batch: ${bat.batchNumber} • Expiry: ${bat.expiryDate}",
                                    fontSize = 12.sp,
                                    color = if (bat.isExpired) MediCoreError else MediCoreTextMuted
                                )
                                Text(
                                    text = "Available: ${bat.availableQuantity} units • ₹${bat.unitPricePaise / 100.0}/unit",
                                    fontSize = 12.sp,
                                    color = MediCorePrimaryDark
                                )
                            }
                            MediCoreButton(
                                text = "Dispense 1",
                                onClick = {
                                    runCatching {
                                        MediCoreEnterpriseRepository.dispensePharmacyBatch(bat.id, 1)
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    if (showOrderLabDialog) {
        AlertDialog(
            onDismissRequest = { showOrderLabDialog = false },
            containerColor = MediCoreSurface,
            title = {
                Text("Order Laboratory Test", fontWeight = FontWeight.Bold, color = MediCoreTextDark)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    MediCoreTextField(value = labPatient, onValueChange = { labPatient = it }, label = "Patient Name")
                    MediCoreTextField(value = labTest, onValueChange = { labTest = it }, label = "Test Name")
                    MediCoreTextField(value = labPrice, onValueChange = { labPrice = it }, label = "Price in Paise (45000 = ₹450)")
                }
            },
            confirmButton = {
                MediCoreButton(
                    text = "Generate Barcode & Order",
                    onClick = {
                        if (labPatient.isNotBlank()) {
                            MediCoreEnterpriseRepository.orderLabTest(
                                patientName = labPatient,
                                testName = labTest,
                                category = "Hematology",
                                pricePaise = labPrice.toLongOrNull() ?: 45000L
                            )
                            labPatient = ""
                            showOrderLabDialog = false
                        }
                    }
                )
            },
            dismissButton = {
                TextButton(onClick = { showOrderLabDialog = false }) {
                    Text("Cancel", color = MediCorePrimary)
                }
            }
        )
    }

    if (showAddBatchDialog) {
        AlertDialog(
            onDismissRequest = { showAddBatchDialog = false },
            containerColor = MediCoreSurface,
            title = {
                Text("Receive Medicine Batch", fontWeight = FontWeight.Bold, color = MediCoreTextDark)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    MediCoreTextField(value = medName, onValueChange = { medName = it }, label = "Medicine Name")
                    MediCoreTextField(value = batchNum, onValueChange = { batchNum = it }, label = "Batch Number")
                    MediCoreTextField(value = medQty, onValueChange = { medQty = it }, label = "Quantity")
                    MediCoreTextField(value = medExp, onValueChange = { medExp = it }, label = "Expiry (YYYY-MM-DD)")
                }
            },
            confirmButton = {
                MediCoreButton(
                    text = "Add Stock",
                    onClick = {
                        if (medName.isNotBlank()) {
                            MediCoreEnterpriseRepository.addPharmacyBatch(
                                medicineName = medName,
                                batchNumber = batchNum,
                                expiryDate = medExp,
                                quantity = medQty.toIntOrNull() ?: 50,
                                unitPricePaise = medPrice.toLongOrNull() ?: 850L
                            )
                            showAddBatchDialog = false
                        }
                    }
                )
            },
            dismissButton = {
                TextButton(onClick = { showAddBatchDialog = false }) {
                    Text("Cancel", color = MediCorePrimary)
                }
            }
        )
    }
}

// =============================================================================
// 4. BILLING & FINANCE HUB (Phase 6)
// =============================================================================

@Composable
fun BillingFinanceHubScreen(
    onNavigateBack: () -> Unit,
    selectedHospitalId: String
) {
    BackHandler { onNavigateBack() }
    val invoices by MediCoreEnterpriseRepository.invoices.collectAsState()
    var showCreateInvoiceDialog by remember { mutableStateOf(false) }

    var invPatient by remember { mutableStateOf("") }
    var invService by remember { mutableStateOf("OPD Doctor Consultation") }
    var invSubtotalPaise by remember { mutableStateOf("50000") } // ₹500 in paise

    Column(
        modifier = Modifier
            .fillMaxSize()
            .testTag("billing_finance_hub_screen")
    ) {
        MediCoreTopBar(
            title = "Billing & Financial Ledger",
            subtitle = "Integer Minor Units (Paise) • Razorpay Idempotency • Credit Notes",
            onNavigateBack = onNavigateBack
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                MediCoreCard {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = "Financial Actions",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = MediCorePrimary
                        )
                        MediCoreButton(
                            text = "Generate Service Invoice",
                            leadingIcon = Icons.Default.Payments,
                            onClick = { showCreateInvoiceDialog = true },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            item {
                Text(
                    text = "Hospital Invoices (${invoices.size})",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextDark
                )
            }

            if (invoices.isEmpty()) {
                item {
                    MediCoreEmptyState(
                        title = "No invoices generated.",
                        description = "There are no billing records yet. Issue an invoice for OPD consultation or diagnostic services.",
                        icon = Icons.Default.Payments,
                        actionLabel = "Create Invoice",
                        onActionClick = { showCreateInvoiceDialog = true }
                    )
                }
            } else {
                items(invoices, key = { it.id }) { inv ->
                    MediCoreCard {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = inv.invoiceNumber,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MediCorePrimary
                                    )
                                    Text(
                                        text = "Patient: ${inv.patientName}",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MediCoreTextDark
                                    )
                                    Text(
                                        text = "Service: ${inv.serviceCategory}",
                                        fontSize = 12.sp,
                                        color = MediCoreTextMuted
                                    )
                                    Text(
                                        text = "Total: ₹${inv.totalAmountPaise / 100.0} (Paid: ₹${inv.paidAmountPaise / 100.0})",
                                        fontSize = 13.sp,
                                        color = MediCoreTextDark,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                                MediCoreStatusBadge(label = inv.status, statusType = inv.status)
                            }

                            if (inv.status != "PAID") {
                                Spacer(modifier = Modifier.height(10.dp))
                                MediCoreButton(
                                    text = "Pay Balance (₹${inv.balanceDuePaise / 100.0})",
                                    onClick = {
                                        MediCoreEnterpriseRepository.recordInvoicePaymentInPaise(
                                            inv.id,
                                            inv.balanceDuePaise
                                        )
                                    },
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showCreateInvoiceDialog) {
        AlertDialog(
            onDismissRequest = { showCreateInvoiceDialog = false },
            containerColor = MediCoreSurface,
            title = {
                Text("Generate Service Invoice", fontWeight = FontWeight.Bold, color = MediCoreTextDark)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    MediCoreTextField(value = invPatient, onValueChange = { invPatient = it }, label = "Patient Name")
                    MediCoreTextField(value = invService, onValueChange = { invService = it }, label = "Service Category")
                    MediCoreTextField(value = invSubtotalPaise, onValueChange = { invSubtotalPaise = it }, label = "Amount in Paise (e.g. 50000 = ₹500)")
                }
            },
            confirmButton = {
                MediCoreButton(
                    text = "Issue Invoice",
                    onClick = {
                        if (invPatient.isNotBlank()) {
                            MediCoreEnterpriseRepository.createInvoiceInPaise(
                                hospitalId = selectedHospitalId,
                                patientName = invPatient,
                                serviceCategory = invService,
                                subtotalPaise = invSubtotalPaise.toLongOrNull() ?: 50000L
                            )
                            invPatient = ""
                            showCreateInvoiceDialog = false
                        }
                    }
                )
            },
            dismissButton = {
                TextButton(onClick = { showCreateInvoiceDialog = false }) {
                    Text("Cancel", color = MediCorePrimary)
                }
            }
        )
    }
}

// =============================================================================
// 5. AI CLINICAL ASSISTANT & CONSENT HUB (Phase 7)
// =============================================================================

@Composable
fun AiAssistantHubScreen(
    onNavigateBack: () -> Unit
) {
    BackHandler { onNavigateBack() }
    val consentGranted by MediCoreEnterpriseRepository.aiConsentGranted.collectAsState()
    val drafts by MediCoreEnterpriseRepository.aiDrafts.collectAsState()

    var patientName by remember { mutableStateOf("Patient Consultation") }
    var clinicalNotes by remember { mutableStateOf("Persistent headache, elevated BP, no allergies") }
    var isGeneratingAiDraft by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .testTag("ai_assistant_hub_screen")
    ) {
        MediCoreTopBar(
            title = "AI Clinical Assistant",
            subtitle = "Backend Gemini Integration • Consent Gate • Doctor Approval Enforced",
            onNavigateBack = onNavigateBack
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                MediCoreCard {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "AI Clinical Assistance Consent",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MediCoreTextDark
                                )
                                Text(
                                    text = "Enable backend AI to prepare SOAP note drafts. No diagnostic claims without attending physician signature.",
                                    fontSize = 12.sp,
                                    color = MediCoreTextMuted
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Switch(
                                checked = consentGranted,
                                onCheckedChange = { MediCoreEnterpriseRepository.setAiConsent(it) },
                                colors = SwitchDefaults.colors(checkedThumbColor = MediCorePrimary)
                            )
                        }
                    }
                }
            }

            item {
                MediCoreCard {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = "Generate SOAP Clinical Draft",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = MediCorePrimary
                        )
                        MediCoreTextField(
                            value = patientName,
                            onValueChange = { patientName = it },
                            label = "Patient Identifier / Name"
                        )
                        MediCoreTextField(
                            value = clinicalNotes,
                            onValueChange = { clinicalNotes = it },
                            label = "Doctor Symptoms & Findings Summary",
                            singleLine = false
                        )
                        if (errorMessage != null) {
                            Text(errorMessage!!, color = MediCoreError, fontSize = 12.sp)
                        }
                        MediCoreButton(
                            text = "Draft SOAP Note with Gemini",
                            leadingIcon = Icons.Default.AutoAwesome,
                            isLoading = isGeneratingAiDraft,
                            onClick = {
                                if (!isGeneratingAiDraft) {
                                    isGeneratingAiDraft = true
                                    errorMessage = null
                                    coroutineScope.launch {
                                        try {
                                            MediCoreEnterpriseRepository.generateAiClinicalDraft(
                                                patientName = patientName,
                                                clinicalNotes = clinicalNotes
                                            )
                                        } catch (e: Exception) {
                                            errorMessage = e.message ?: "AI consent required."
                                        } finally {
                                            isGeneratingAiDraft = false
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            item {
                Text(
                    text = "AI Drafts Requiring Approval (${drafts.size})",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextDark
                )
            }

            if (drafts.isEmpty()) {
                item {
                    MediCoreEmptyState(
                        title = "No pending AI drafts.",
                        description = "Draft clinical notes with AI to review and sign off before finalization in EHR.",
                        icon = Icons.Default.AutoAwesome
                    )
                }
            } else {
                items(drafts, key = { it.id }) { draft ->
                    MediCoreCard {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = draft.patientName,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MediCoreTextDark
                                )
                                MediCoreStatusBadge(label = draft.status, statusType = draft.status)
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(MediCoreSurfaceVariant)
                                    .padding(10.dp)
                            ) {
                                Text(
                                    text = draft.generatedSoapNote,
                                    fontSize = 12.sp,
                                    color = MediCoreTextDark
                                )
                            }
                            if (draft.status != "APPROVED_BY_DOCTOR") {
                                Spacer(modifier = Modifier.height(10.dp))
                                MediCoreButton(
                                    text = "Approve & Sign as Attending Doctor",
                                    leadingIcon = Icons.Default.CheckCircle,
                                    onClick = {
                                        MediCoreEnterpriseRepository.approveAiClinicalDraft(draft.id)
                                    },
                                    modifier = Modifier.fillMaxWidth()
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
// 6. SECURITY & NOTIFICATIONS OUTBOX HUB (Phase 8)
// =============================================================================

@Composable
fun SecurityOutboxHubScreen(
    onNavigateBack: () -> Unit
) {
    BackHandler { onNavigateBack() }
    val mfaEnabled by MediCoreEnterpriseRepository.mfaEnabled.collectAsState()
    val notifications by MediCoreEnterpriseRepository.notifications.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .testTag("security_outbox_hub_screen")
    ) {
        MediCoreTopBar(
            title = "Security & Notifications",
            subtitle = "TOTP MFA • Lock-Screen PHI Redaction • Transactional Outbox",
            onNavigateBack = onNavigateBack
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                MediCoreCard {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Shield,
                                    contentDescription = null,
                                    tint = MediCorePrimary,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text(
                                        text = "Two-Factor Authentication (MFA)",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MediCoreTextDark
                                    )
                                    Text(
                                        text = "Enforce TOTP authenticator code on sensitive clinical actions",
                                        fontSize = 12.sp,
                                        color = MediCoreTextMuted
                                    )
                                }
                            }
                            Switch(
                                checked = mfaEnabled,
                                onCheckedChange = { MediCoreEnterpriseRepository.setMfaEnabled(it) },
                                colors = SwitchDefaults.colors(checkedThumbColor = MediCorePrimary)
                            )
                        }
                    }
                }
            }

            item {
                MediCoreCard {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = "Dispatch PHI-Safe Outbox Notification",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = MediCorePrimary
                        )
                        Text(
                            text = "Redacts clinical conditions, HIV/cancer terms, and specific lab values from lock-screen preview.",
                            fontSize = 12.sp,
                            color = MediCoreTextMuted
                        )
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            MediCoreButton(
                                text = "Send Lab Alert",
                                onClick = {
                                    MediCoreEnterpriseRepository.dispatchLockScreenSafeNotification(
                                        recipientLabel = "Patient Account",
                                        channel = "PUSH",
                                        category = "LAB"
                                    )
                                },
                                modifier = Modifier.weight(1f)
                            )
                            MediCoreButton(
                                text = "Send Bill Alert",
                                isOutline = true,
                                onClick = {
                                    MediCoreEnterpriseRepository.dispatchLockScreenSafeNotification(
                                        recipientLabel = "Billing Account",
                                        channel = "SMS",
                                        category = "BILLING"
                                    )
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            item {
                Text(
                    text = "Outbox Delivery Log (${notifications.size})",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextDark
                )
            }

            if (notifications.isEmpty()) {
                item {
                    MediCoreEmptyState(
                        title = "No notifications yet.",
                        description = "Outbox message logs will appear here with delivery timestamps and redacted preview text.",
                        icon = Icons.Default.NotificationsActive
                    )
                }
            } else {
                items(notifications, key = { it.id }) { n ->
                    MediCoreCard {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp)
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = n.lockScreenSafeTitle,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MediCoreTextDark
                                )
                                Text(
                                    text = "Recipient: ${n.recipientLabel} • Channel: ${n.channel}",
                                    fontSize = 12.sp,
                                    color = MediCoreTextMuted
                                )
                            }
                            MediCoreStatusBadge(label = n.status, statusType = n.status)
                        }
                    }
                }
            }
        }
    }
}

// =============================================================================
// 7. SAAS PORTAL & PLANS HUB (Phase 9)
// =============================================================================

@Composable
fun SaasPortalHubScreen(
    onNavigateBack: () -> Unit
) {
    BackHandler { onNavigateBack() }
    val plans = MediCoreEnterpriseRepository.saasPlans
    val activePlanCode by MediCoreEnterpriseRepository.activeSubscriptionPlanCode.collectAsState()
    val applications by MediCoreEnterpriseRepository.onboardingApplications.collectAsState()
    val tickets by MediCoreEnterpriseRepository.supportTickets.collectAsState()

    var showTicketDialog by remember { mutableStateOf(false) }
    var ticketSubject by remember { mutableStateOf("") }
    var ticketCategory by remember { mutableStateOf("Billing") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .testTag("saas_portal_hub_screen")
    ) {
        MediCoreTopBar(
            title = "MediCore SaaS Management",
            subtitle = "Subscription Plans • Hospital Onboarding • Support Tickets",
            onNavigateBack = onNavigateBack
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                Text(
                    text = "Configurable SaaS Subscription Plans",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextDark
                )
            }

            items(plans, key = { it.code }) { plan ->
                val isSelected = plan.code == activePlanCode
                MediCoreCard(
                    border = androidx.compose.foundation.BorderStroke(
                        if (isSelected) 2.dp else 1.dp,
                        if (isSelected) MediCorePrimary else MediCoreBorder
                    )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column {
                                Text(
                                    text = plan.name,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MediCoreTextDark
                                )
                                Text(
                                    text = "₹${plan.monthlyPricePaise / 100}/mo • ₹${plan.annualPricePaise / 100}/yr",
                                    fontSize = 13.sp,
                                    color = MediCorePrimary,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            if (isSelected) {
                                MediCoreStatusBadge(label = "Active Tier", statusType = "ACTIVE")
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Limits: Max ${plan.maxDoctors} Doctors • ${plan.maxPatients} Patients • ${plan.maxBranches} Branches",
                            fontSize = 12.sp,
                            color = MediCoreTextDark
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Included: ${plan.features.joinToString(", ")}",
                            fontSize = 11.sp,
                            color = MediCoreTextMuted
                        )
                        if (!isSelected) {
                            Spacer(modifier = Modifier.height(10.dp))
                            MediCoreButton(
                                text = "Select ${plan.name}",
                                isOutline = true,
                                onClick = {
                                    MediCoreEnterpriseRepository.selectSubscriptionPlan(plan.code)
                                },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
            }

            // Onboarding Applications
            item {
                Text(
                    text = "Hospital Onboarding Claims (${applications.size})",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextDark
                )
            }

            if (applications.isEmpty()) {
                item {
                    MediCoreEmptyState(
                        title = "No pending onboarding applications.",
                        description = "When a hospital claims a directory record or registers, its onboarding workflow appears here.",
                        icon = Icons.Default.DomainVerification
                    )
                }
            } else {
                items(applications, key = { it.id }) { app ->
                    MediCoreCard {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "${app.hospitalName} (${app.city})",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MediCoreTextDark
                                    )
                                    Text(
                                        text = "Admin: ${app.adminEmail} • Lic: ${app.registrationLicenseNumber}",
                                        fontSize = 12.sp,
                                        color = MediCoreTextMuted
                                    )
                                }
                                MediCoreStatusBadge(label = app.status, statusType = app.status)
                            }

                            if (app.status != "ACTIVATED") {
                                Spacer(modifier = Modifier.height(10.dp))
                                MediCoreButton(
                                    text = "Approve & Activate Tenant",
                                    onClick = {
                                        MediCoreEnterpriseRepository.approveAndActivateOnboarding(app.id)
                                    },
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                    }
                }
            }

            // Support Tickets
            item {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Customer Support Tickets (${tickets.size})",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = MediCoreTextDark
                    )
                    MediCoreButton(
                        text = "New Ticket",
                        onClick = { showTicketDialog = true }
                    )
                }
            }

            if (tickets.isEmpty()) {
                item {
                    MediCoreEmptyState(
                        title = "No support tickets open.",
                        description = "All hospital tenant queries and tickets are currently resolved.",
                        icon = Icons.Default.CheckCircle,
                        actionLabel = "Open Support Ticket",
                        onActionClick = { showTicketDialog = true }
                    )
                }
            } else {
                items(tickets, key = { it.id }) { tkt ->
                    MediCoreCard {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "${tkt.ticketNumber} • ${tkt.subject}",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MediCoreTextDark
                                    )
                                    Text(
                                        text = "Hospital: ${tkt.hospitalName} (${tkt.category}, Priority: ${tkt.priority})",
                                        fontSize = 12.sp,
                                        color = MediCoreTextMuted
                                    )
                                }
                                MediCoreStatusBadge(label = tkt.status, statusType = tkt.status)
                            }
                        }
                    }
                }
            }
        }
    }

    if (showTicketDialog) {
        AlertDialog(
            onDismissRequest = { showTicketDialog = false },
            containerColor = MediCoreSurface,
            title = {
                Text("Open Customer Support Ticket", fontWeight = FontWeight.Bold, color = MediCoreTextDark)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    MediCoreTextField(value = ticketSubject, onValueChange = { ticketSubject = it }, label = "Issue Subject")
                    MediCoreTextField(value = ticketCategory, onValueChange = { ticketCategory = it }, label = "Category (Billing, Integration, EHR)")
                }
            },
            confirmButton = {
                MediCoreButton(
                    text = "Submit Ticket",
                    onClick = {
                        if (ticketSubject.isNotBlank()) {
                            MediCoreEnterpriseRepository.createSupportTicket(
                                hospitalName = "Ranchi Medical Facility",
                                subject = ticketSubject,
                                category = ticketCategory,
                                priority = "HIGH"
                            )
                            ticketSubject = ""
                            showTicketDialog = false
                        }
                    }
                )
            },
            dismissButton = {
                TextButton(onClick = { showTicketDialog = false }) {
                    Text("Cancel", color = MediCorePrimary)
                }
            }
        )
    }
}
