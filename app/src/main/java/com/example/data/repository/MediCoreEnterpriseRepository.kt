package com.example.data.repository

import com.example.core.model.DirectoryVerificationStatus
import com.example.core.model.Hospital
import com.example.core.model.HospitalStatus
import com.example.data.mock.SampleData
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale
import kotlin.math.roundToInt

data class DirectoryImportSummary(
    val totalInputRecords: Int,
    val importedCount: Int,
    val updatedCount: Int,
    val skippedDuplicatesCount: Int,
    val incompleteRecordsCount: Int
)

data class DirectoryIssueReport(
    val id: String,
    val hospitalId: String,
    val hospitalName: String,
    val reporterEmail: String,
    val issueDescription: String,
    val suggestedCorrection: String,
    val status: String = "OPEN",
    val createdAt: String = "Just now"
)

data class PatientRecord(
    val id: String,
    val globalPatientId: String,
    val hospitalRegistrationNumber: String,
    val hospitalId: String,
    val fullName: String,
    val dateOfBirth: String,
    val gender: String,
    val bloodGroup: String,
    val phone: String,
    val emergencyContact: String,
    val address: String,
    val allergies: List<String> = emptyList(),
    val chronicConditions: List<String> = emptyList()
)

data class AppointmentItem(
    val id: String,
    val bookingNumber: String,
    val hospitalId: String,
    val patientName: String,
    val doctorName: String,
    val department: String,
    val appointmentDate: String,
    val slotTime: String,
    val status: String = "CONFIRMED",
    val queueToken: Int = 1
)

data class VitalSignEntry(
    val id: String,
    val patientId: String,
    val patientName: String,
    val systolicBp: Int,
    val diastolicBp: Int,
    val heartRateBpm: Int,
    val temperatureCelsius: Double,
    val oxygenSaturation: Int,
    val heightCm: Double,
    val weightKg: Double,
    val bmi: Double
)

data class ClinicalEncounterItem(
    val id: String,
    val patientId: String,
    val patientName: String,
    val hospitalId: String,
    val chiefComplaint: String,
    val icd10Code: String,
    val diagnosisDescription: String,
    val prescriptionSummary: String,
    val versionNumber: Int = 1,
    val status: String = "FINALIZED"
)

data class LabTestOrderItem(
    val id: String,
    val sampleTrackingId: String,
    val patientName: String,
    val testName: String,
    val category: String,
    val pricePaise: Long,
    val resultSummary: String? = null,
    val isCritical: Boolean = false,
    val status: String = "SAMPLE_COLLECTED"
)

data class PharmacyBatchItem(
    val id: String,
    val medicineName: String,
    val batchNumber: String,
    val expiryDate: String,
    val availableQuantity: Int,
    val unitPricePaise: Long,
    val isExpired: Boolean = false
)

data class BillingInvoiceItem(
    val id: String,
    val invoiceNumber: String,
    val hospitalId: String,
    val patientName: String,
    val serviceCategory: String,
    val subtotalPaise: Long,
    val taxPaise: Long,
    val discountPaise: Long,
    val totalAmountPaise: Long,
    val paidAmountPaise: Long = 0L,
    val status: String = "ISSUED"
) {
    val balanceDuePaise: Long
        get() = (totalAmountPaise - paidAmountPaise).coerceAtLeast(0L)
}

data class AiClinicalDraftItem(
    val id: String,
    val patientName: String,
    val promptSummary: String,
    val generatedSoapNote: String,
    val safetyFlags: List<String>,
    val status: String = "PENDING_DOCTOR_APPROVAL"
)

data class OutboxNotificationItem(
    val id: String,
    val recipientLabel: String,
    val channel: String,
    val lockScreenSafeTitle: String,
    val status: String = "DELIVERED",
    val retryCount: Int = 0
)

data class SaasOnboardingApplication(
    val id: String,
    val directoryCode: String?,
    val hospitalName: String,
    val city: String,
    val adminEmail: String,
    val registrationLicenseNumber: String,
    val gstNumber: String?,
    val status: String = "REGISTERED", // REGISTERED, DOCUMENTS_SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, ACTIVATED
    val selectedPlanCode: String = "PROFESSIONAL"
)

data class SaasPlanDefinition(
    val code: String,
    val name: String,
    val monthlyPricePaise: Long,
    val annualPricePaise: Long,
    val maxDoctors: Int,
    val maxPatients: Int,
    val maxBranches: Int,
    val features: List<String>
)

data class SupportTicketItem(
    val id: String,
    val ticketNumber: String,
    val hospitalName: String,
    val subject: String,
    val category: String,
    val priority: String,
    val status: String = "OPEN",
    val latestReply: String = "Awaiting support engineer review"
)

object MediCoreEnterpriseRepository {

    private val _directoryHospitals = MutableStateFlow<List<Hospital>>(SampleData.ranchiDirectoryHospitals)
    val directoryHospitals: StateFlow<List<Hospital>> = _directoryHospitals.asStateFlow()

    private val _directoryIssues = MutableStateFlow<List<DirectoryIssueReport>>(emptyList())
    val directoryIssues: StateFlow<List<DirectoryIssueReport>> = _directoryIssues.asStateFlow()

    private val _patients = MutableStateFlow<List<PatientRecord>>(emptyList())
    val patients: StateFlow<List<PatientRecord>> = _patients.asStateFlow()

    private val _appointments = MutableStateFlow<List<AppointmentItem>>(emptyList())
    val appointments: StateFlow<List<AppointmentItem>> = _appointments.asStateFlow()

    private val _vitals = MutableStateFlow<List<VitalSignEntry>>(emptyList())
    val vitals: StateFlow<List<VitalSignEntry>> = _vitals.asStateFlow()

    private val _encounters = MutableStateFlow<List<ClinicalEncounterItem>>(emptyList())
    val encounters: StateFlow<List<ClinicalEncounterItem>> = _encounters.asStateFlow()

    private val _labOrders = MutableStateFlow<List<LabTestOrderItem>>(emptyList())
    val labOrders: StateFlow<List<LabTestOrderItem>> = _labOrders.asStateFlow()

    private val _pharmacyBatches = MutableStateFlow<List<PharmacyBatchItem>>(emptyList())
    val pharmacyBatches: StateFlow<List<PharmacyBatchItem>> = _pharmacyBatches.asStateFlow()

    private val _invoices = MutableStateFlow<List<BillingInvoiceItem>>(emptyList())
    val invoices: StateFlow<List<BillingInvoiceItem>> = _invoices.asStateFlow()

    private val _aiConsentGranted = MutableStateFlow(false)
    val aiConsentGranted: StateFlow<Boolean> = _aiConsentGranted.asStateFlow()

    private val _aiDrafts = MutableStateFlow<List<AiClinicalDraftItem>>(emptyList())
    val aiDrafts: StateFlow<List<AiClinicalDraftItem>> = _aiDrafts.asStateFlow()

    private val _mfaEnabled = MutableStateFlow(false)
    val mfaEnabled: StateFlow<Boolean> = _mfaEnabled.asStateFlow()

    private val _notifications = MutableStateFlow<List<OutboxNotificationItem>>(emptyList())
    val notifications: StateFlow<List<OutboxNotificationItem>> = _notifications.asStateFlow()

    private val _onboardingApplications = MutableStateFlow<List<SaasOnboardingApplication>>(emptyList())
    val onboardingApplications: StateFlow<List<SaasOnboardingApplication>> = _onboardingApplications.asStateFlow()

    private val _activeSubscriptionPlanCode = MutableStateFlow("PROFESSIONAL")
    val activeSubscriptionPlanCode: StateFlow<String> = _activeSubscriptionPlanCode.asStateFlow()

    private val _supportTickets = MutableStateFlow<List<SupportTicketItem>>(emptyList())
    val supportTickets: StateFlow<List<SupportTicketItem>> = _supportTickets.asStateFlow()

    val saasPlans: List<SaasPlanDefinition> = listOf(
        SaasPlanDefinition(
            code = "STARTER",
            name = "Starter Clinic Plan",
            monthlyPricePaise = 499900L,
            annualPricePaise = 4999000L,
            maxDoctors = 10,
            maxPatients = 2000,
            maxBranches = 1,
            features = listOf("PATIENT_MANAGEMENT", "APPOINTMENTS", "EHR", "BILLING")
        ),
        SaasPlanDefinition(
            code = "PROFESSIONAL",
            name = "Professional Hospital Plan",
            monthlyPricePaise = 1499900L,
            annualPricePaise = 14999000L,
            maxDoctors = 50,
            maxPatients = 25000,
            maxBranches = 3,
            features = listOf("PATIENT_MANAGEMENT", "APPOINTMENTS", "EHR", "LAB", "PHARMACY", "INVENTORY", "BILLING", "INSURANCE")
        ),
        SaasPlanDefinition(
            code = "ENTERPRISE",
            name = "Enterprise Multi-Chain Plan",
            monthlyPricePaise = 3999900L,
            annualPricePaise = 39999000L,
            maxDoctors = 500,
            maxPatients = 500000,
            maxBranches = 25,
            features = listOf("PATIENT_MANAGEMENT", "APPOINTMENTS", "EHR", "LAB", "PHARMACY", "INVENTORY", "IPD", "BILLING", "INSURANCE", "AI_ASSISTANT", "ANALYTICS", "MULTI_BRANCH")
        )
    )

    fun resetForTest() {
        _directoryHospitals.value = SampleData.ranchiDirectoryHospitals
        _directoryIssues.value = emptyList()
        _patients.value = emptyList()
        _appointments.value = emptyList()
        _vitals.value = emptyList()
        _encounters.value = emptyList()
        _labOrders.value = emptyList()
        _pharmacyBatches.value = emptyList()
        _invoices.value = emptyList()
        _aiConsentGranted.value = false
        _aiDrafts.value = emptyList()
        _mfaEnabled.value = false
        _notifications.value = emptyList()
        _onboardingApplications.value = emptyList()
        _activeSubscriptionPlanCode.value = "PROFESSIONAL"
        _supportTickets.value = emptyList()
    }

    // =========================================================================
    // 1. RANCHI HOSPITAL DIRECTORY & IMPORT SERVICE
    // =========================================================================

    fun importRanchiDirectoryDataset(
        records: List<Hospital> = SampleData.ranchiDirectoryHospitals
    ): DirectoryImportSummary {
        val currentMap = _directoryHospitals.value.associateBy { it.directoryCode }.toMutableMap()
        var importedCount = 0
        var updatedCount = 0
        var skippedDuplicatesCount = 0
        var incompleteRecordsCount = 0

        for (incoming in records) {
            if (incoming.primaryPhone == null || incoming.email == null || incoming.website == null) {
                incompleteRecordsCount++
            }
            val existing = currentMap[incoming.directoryCode] ?: currentMap.values.firstOrNull {
                it.name.equals(incoming.name, ignoreCase = true) && it.city.equals(incoming.city, ignoreCase = true)
            }
            if (existing == null) {
                currentMap[incoming.directoryCode] = incoming.copy(
                    verificationStatus = DirectoryVerificationStatus.PENDING_VERIFICATION,
                    isActiveTenant = false
                )
                importedCount++
            } else if (existing.verificationStatus == DirectoryVerificationStatus.VERIFIED) {
                // Never overwrite admin-verified hospital data with unverified import data
                skippedDuplicatesCount++
            } else {
                currentMap[existing.directoryCode] = existing.copy(
                    primaryPhone = existing.primaryPhone ?: incoming.primaryPhone,
                    secondaryPhone = existing.secondaryPhone ?: incoming.secondaryPhone,
                    email = existing.email ?: incoming.email,
                    website = existing.website ?: incoming.website,
                    specialties = (existing.specialties + incoming.specialties).distinct()
                )
                updatedCount++
                skippedDuplicatesCount++
            }
        }

        _directoryHospitals.value = currentMap.values.sortedBy { it.directoryCode }
        return DirectoryImportSummary(
            totalInputRecords = records.size,
            importedCount = importedCount,
            updatedCount = updatedCount,
            skippedDuplicatesCount = skippedDuplicatesCount,
            incompleteRecordsCount = incompleteRecordsCount
        )
    }

    fun searchDirectoryHospitals(
        query: String = "",
        ownershipFilter: String = "All",
        specialtyFilter: String = "All",
        verificationFilter: String = "All",
        emergencyOnly: Boolean = false,
        sortAscending: Boolean = true
    ): List<Hospital> {
        val q = query.trim().lowercase(Locale.ROOT)
        val filtered = _directoryHospitals.value.filter { hosp ->
            val matchesQuery = q.isEmpty() ||
                hosp.name.lowercase(Locale.ROOT).contains(q) ||
                hosp.directoryCode.lowercase(Locale.ROOT).contains(q) ||
                hosp.address.lowercase(Locale.ROOT).contains(q) ||
                (hosp.pincode?.lowercase(Locale.ROOT)?.contains(q) == true) ||
                hosp.facilityType.lowercase(Locale.ROOT).contains(q) ||
                hosp.specialties.any { it.lowercase(Locale.ROOT).contains(q) }

            val matchesOwnership = ownershipFilter == "All" ||
                hosp.ownershipType.contains(ownershipFilter, ignoreCase = true)

            val matchesSpecialty = specialtyFilter == "All" ||
                hosp.specialties.any { it.contains(specialtyFilter, ignoreCase = true) }

            val matchesVerification = verificationFilter == "All" ||
                hosp.verificationStatus.name.equals(verificationFilter, ignoreCase = true) ||
                hosp.verificationStatus.label.equals(verificationFilter, ignoreCase = true)

            val matchesEmergency = !emergencyOnly || hosp.emergencyAvailable == true

            matchesQuery && matchesOwnership && matchesSpecialty && matchesVerification && matchesEmergency
        }

        return if (sortAscending) {
            filtered.sortedBy { it.name.lowercase(Locale.ROOT) }
        } else {
            filtered.sortedByDescending { it.name.lowercase(Locale.ROOT) }
        }
    }

    fun getHospitalByIdOrCode(idOrCode: String): Hospital? {
        return _directoryHospitals.value.firstOrNull {
            it.id.equals(idOrCode, ignoreCase = true) || it.directoryCode.equals(idOrCode, ignoreCase = true)
        }
    }

    fun verifyHospitalDirectoryRecord(
        hospitalId: String,
        primaryPhone: String? = null,
        email: String? = null,
        website: String? = null
    ): Hospital? {
        var updatedHospital: Hospital? = null
        _directoryHospitals.value = _directoryHospitals.value.map { hosp ->
            if (hosp.id == hospitalId || hosp.directoryCode == hospitalId) {
                val verified = hosp.copy(
                    primaryPhone = primaryPhone?.takeIf { it.isNotBlank() } ?: hosp.primaryPhone,
                    email = email?.takeIf { it.isNotBlank() } ?: hosp.email,
                    website = website?.takeIf { it.isNotBlank() } ?: hosp.website,
                    verificationStatus = DirectoryVerificationStatus.VERIFIED,
                    status = HospitalStatus.APPROVED,
                    lastVerifiedAt = "Verified by Super Admin",
                    dataStatus = "Verified by MediCore Super Admin"
                )
                updatedHospital = verified
                verified
            } else hosp
        }
        return updatedHospital
    }

    fun updateHospitalVerificationStatus(
        hospitalId: String,
        newStatus: DirectoryVerificationStatus,
        reason: String? = null
    ): Hospital? {
        var updatedHospital: Hospital? = null
        _directoryHospitals.value = _directoryHospitals.value.map { hosp ->
            if (hosp.id == hospitalId || hosp.directoryCode == hospitalId) {
                val mappedStatus = when (newStatus) {
                    DirectoryVerificationStatus.VERIFIED -> HospitalStatus.APPROVED
                    DirectoryVerificationStatus.REJECTED -> HospitalStatus.REJECTED
                    DirectoryVerificationStatus.SUSPENDED -> HospitalStatus.SUSPENDED
                    else -> HospitalStatus.PENDING
                }
                val updated = hosp.copy(
                    verificationStatus = newStatus,
                    status = mappedStatus,
                    rejectionReason = reason
                )
                updatedHospital = updated
                updated
            } else hosp
        }
        return updatedHospital
    }

    fun addHospitalToDirectory(
        name: String,
        facilityType: String,
        ownershipType: String,
        address: String,
        pincode: String?,
        primaryPhone: String?,
        email: String?,
        website: String?,
        specialties: List<String>
    ): Hospital {
        val nextIndex = _directoryHospitals.value.size + 1
        val code = String.format(Locale.US, "RNC%03d", nextIndex)
        val created = Hospital(
            id = code,
            directoryCode = code,
            name = name.trim(),
            facilityType = facilityType.trim(),
            ownershipType = ownershipType.trim(),
            address = address.trim(),
            pincode = pincode?.trim()?.takeIf { it.isNotEmpty() },
            primaryPhone = primaryPhone?.trim()?.takeIf { it.isNotEmpty() },
            email = email?.trim()?.takeIf { it.isNotEmpty() },
            website = website?.trim()?.takeIf { it.isNotEmpty() },
            specialties = specialties.filter { it.isNotBlank() },
            verificationStatus = DirectoryVerificationStatus.PENDING_VERIFICATION,
            isActiveTenant = false
        )
        _directoryHospitals.value = _directoryHospitals.value + created
        return created
    }

    fun deleteDraftHospitalRecord(hospitalId: String): Boolean {
        val target = getHospitalByIdOrCode(hospitalId) ?: return false
        if (target.isActiveTenant || target.verificationStatus == DirectoryVerificationStatus.VERIFIED) {
            return false
        }
        _directoryHospitals.value = _directoryHospitals.value.filterNot { it.id == target.id }
        return true
    }

    fun reportDirectoryIssue(
        hospitalId: String,
        reporterEmail: String,
        issueDescription: String,
        suggestedCorrection: String
    ): DirectoryIssueReport {
        val hosp = getHospitalByIdOrCode(hospitalId)
        val report = DirectoryIssueReport(
            id = "ISS-${_directoryIssues.value.size + 101}",
            hospitalId = hospitalId,
            hospitalName = hosp?.name ?: hospitalId,
            reporterEmail = reporterEmail.trim(),
            issueDescription = issueDescription.trim(),
            suggestedCorrection = suggestedCorrection.trim()
        )
        _directoryIssues.value = listOf(report) + _directoryIssues.value
        return report
    }

    // =========================================================================
    // 2. PHASE 9 HOSPITAL CLAIM & SAAS ONBOARDING WORKFLOW
    // =========================================================================

    fun claimHospitalForOnboarding(
        directoryCode: String?,
        hospitalName: String,
        city: String,
        adminEmail: String,
        registrationLicenseNumber: String,
        gstNumber: String?,
        selectedPlanCode: String = "PROFESSIONAL"
    ): SaasOnboardingApplication {
        val app = SaasOnboardingApplication(
            id = "ONB-${_onboardingApplications.value.size + 1001}",
            directoryCode = directoryCode,
            hospitalName = hospitalName.trim(),
            city = city.trim(),
            adminEmail = adminEmail.trim(),
            registrationLicenseNumber = registrationLicenseNumber.trim(),
            gstNumber = gstNumber?.trim()?.takeIf { it.isNotEmpty() },
            status = "UNDER_REVIEW",
            selectedPlanCode = selectedPlanCode
        )
        _onboardingApplications.value = listOf(app) + _onboardingApplications.value

        if (directoryCode != null) {
            updateHospitalVerificationStatus(directoryCode, DirectoryVerificationStatus.UNDER_REVIEW)
        }
        return app
    }

    fun approveAndActivateOnboarding(applicationId: String): SaasOnboardingApplication? {
        var activatedApp: SaasOnboardingApplication? = null
        _onboardingApplications.value = _onboardingApplications.value.map { app ->
            if (app.id == applicationId) {
                val updated = app.copy(status = "ACTIVATED")
                activatedApp = updated
                if (app.directoryCode != null) {
                    _directoryHospitals.value = _directoryHospitals.value.map { hosp ->
                        if (hosp.directoryCode == app.directoryCode) {
                            hosp.copy(
                                verificationStatus = DirectoryVerificationStatus.VERIFIED,
                                status = HospitalStatus.APPROVED,
                                isActiveTenant = true,
                                lastVerifiedAt = "Activated via SaaS Onboarding"
                            )
                        } else hosp
                    }
                }
                _activeSubscriptionPlanCode.value = app.selectedPlanCode
                updated
            } else app
        }
        return activatedApp
    }

    fun selectSubscriptionPlan(planCode: String) {
        if (saasPlans.any { it.code == planCode }) {
            _activeSubscriptionPlanCode.value = planCode
        }
    }

    fun isFeatureEntitled(featureKey: String): Boolean {
        val currentPlan = saasPlans.firstOrNull { it.code == _activeSubscriptionPlanCode.value }
            ?: return false
        return currentPlan.features.contains(featureKey.uppercase(Locale.ROOT))
    }

    fun createSupportTicket(
        hospitalName: String,
        subject: String,
        category: String,
        priority: String
    ): SupportTicketItem {
        val idx = _supportTickets.value.size + 1
        val ticket = SupportTicketItem(
            id = "TKT-$idx",
            ticketNumber = String.format(Locale.US, "SUP-2026-%04d", idx),
            hospitalName = hospitalName,
            subject = subject.trim(),
            category = category,
            priority = priority
        )
        _supportTickets.value = listOf(ticket) + _supportTickets.value
        return ticket
    }

    // =========================================================================
    // 3. PHASE 3–8 CLINICAL, OPERATIONS, BILLING, AI & SECURITY
    // =========================================================================

    fun registerPatient(
        hospitalId: String,
        fullName: String,
        dateOfBirth: String,
        gender: String,
        bloodGroup: String,
        phone: String,
        emergencyContact: String,
        address: String,
        allergies: List<String> = emptyList()
    ): PatientRecord {
        val idx = _patients.value.size + 1
        val record = PatientRecord(
            id = "PAT-$idx",
            globalPatientId = String.format(Locale.US, "MC-GLOBAL-%05d", idx),
            hospitalRegistrationNumber = String.format(Locale.US, "%s-REG-%04d", hospitalId, idx),
            hospitalId = hospitalId,
            fullName = fullName.trim(),
            dateOfBirth = dateOfBirth.trim(),
            gender = gender,
            bloodGroup = bloodGroup,
            phone = phone.trim(),
            emergencyContact = emergencyContact.trim(),
            address = address.trim(),
            allergies = allergies
        )
        _patients.value = listOf(record) + _patients.value
        return record
    }

    fun scheduleAppointment(
        hospitalId: String,
        patientName: String,
        doctorName: String,
        department: String,
        appointmentDate: String,
        slotTime: String
    ): AppointmentItem {
        // Double-booking prevention check
        val conflict = _appointments.value.any {
            it.hospitalId == hospitalId &&
                it.doctorName.equals(doctorName.trim(), ignoreCase = true) &&
                it.appointmentDate == appointmentDate.trim() &&
                it.slotTime == slotTime.trim() &&
                it.status != "CANCELLED"
        }
        require(!conflict) { "Selected doctor slot ($appointmentDate at $slotTime) is already booked." }

        val idx = _appointments.value.size + 1
        val item = AppointmentItem(
            id = "APT-$idx",
            bookingNumber = String.format(Locale.US, "OPD-%04d", idx),
            hospitalId = hospitalId,
            patientName = patientName.trim(),
            doctorName = doctorName.trim(),
            department = department.trim(),
            appointmentDate = appointmentDate.trim(),
            slotTime = slotTime.trim(),
            queueToken = idx
        )
        _appointments.value = listOf(item) + _appointments.value
        return item
    }

    fun recordVitalsWithBmi(
        patientId: String,
        patientName: String,
        systolicBp: Int,
        diastolicBp: Int,
        heartRateBpm: Int,
        temperatureCelsius: Double,
        oxygenSaturation: Int,
        heightCm: Double,
        weightKg: Double
    ): VitalSignEntry {
        val heightM = (heightCm / 100.0).coerceAtLeast(0.5)
        val rawBmi = weightKg / (heightM * heightM)
        val bmi = (rawBmi * 10.0).roundToInt() / 10.0
        val entry = VitalSignEntry(
            id = "VIT-${_vitals.value.size + 1}",
            patientId = patientId,
            patientName = patientName,
            systolicBp = systolicBp,
            diastolicBp = diastolicBp,
            heartRateBpm = heartRateBpm,
            temperatureCelsius = temperatureCelsius,
            oxygenSaturation = oxygenSaturation,
            heightCm = heightCm,
            weightKg = weightKg,
            bmi = bmi
        )
        _vitals.value = listOf(entry) + _vitals.value
        return entry
    }

    fun createClinicalEncounter(
        patientId: String,
        patientName: String,
        hospitalId: String,
        chiefComplaint: String,
        icd10Code: String,
        diagnosisDescription: String,
        prescriptionSummary: String
    ): ClinicalEncounterItem {
        val item = ClinicalEncounterItem(
            id = "ENC-${_encounters.value.size + 1}",
            patientId = patientId,
            patientName = patientName.trim(),
            hospitalId = hospitalId,
            chiefComplaint = chiefComplaint.trim(),
            icd10Code = icd10Code.trim().uppercase(Locale.ROOT),
            diagnosisDescription = diagnosisDescription.trim(),
            prescriptionSummary = prescriptionSummary.trim()
        )
        _encounters.value = listOf(item) + _encounters.value
        return item
    }

    fun orderLabTest(
        patientName: String,
        testName: String,
        category: String,
        pricePaise: Long
    ): LabTestOrderItem {
        val idx = _labOrders.value.size + 1
        val item = LabTestOrderItem(
            id = "LAB-$idx",
            sampleTrackingId = String.format(Locale.US, "SMP-2026-%04d", idx),
            patientName = patientName.trim(),
            testName = testName.trim(),
            category = category.trim(),
            pricePaise = pricePaise
        )
        _labOrders.value = listOf(item) + _labOrders.value
        return item
    }

    fun addPharmacyBatch(
        medicineName: String,
        batchNumber: String,
        expiryDate: String,
        quantity: Int,
        unitPricePaise: Long,
        isExpired: Boolean = false
    ): PharmacyBatchItem {
        val item = PharmacyBatchItem(
            id = "BAT-${_pharmacyBatches.value.size + 1}",
            medicineName = medicineName.trim(),
            batchNumber = batchNumber.trim(),
            expiryDate = expiryDate.trim(),
            availableQuantity = quantity,
            unitPricePaise = unitPricePaise,
            isExpired = isExpired
        )
        _pharmacyBatches.value = listOf(item) + _pharmacyBatches.value
        return item
    }

    fun dispensePharmacyBatch(batchId: String, quantityToDispense: Int): PharmacyBatchItem {
        val target = _pharmacyBatches.value.firstOrNull { it.id == batchId }
            ?: throw IllegalArgumentException("Batch not found")
        require(!target.isExpired) { "Cannot dispense expired medicine batch (${target.batchNumber})." }
        require(target.availableQuantity >= quantityToDispense) { "Insufficient batch stock." }

        val updated = target.copy(availableQuantity = target.availableQuantity - quantityToDispense)
        _pharmacyBatches.value = _pharmacyBatches.value.map { if (it.id == batchId) updated else it }
        return updated
    }

    fun createInvoiceInPaise(
        hospitalId: String,
        patientName: String,
        serviceCategory: String,
        subtotalPaise: Long,
        taxPercent: Int = 5,
        discountPaise: Long = 0L
    ): BillingInvoiceItem {
        val taxPaise = ((subtotalPaise * taxPercent) / 100L).coerceAtLeast(0L)
        val totalPaise = (subtotalPaise + taxPaise - discountPaise).coerceAtLeast(0L)
        val idx = _invoices.value.size + 1
        val invoice = BillingInvoiceItem(
            id = "INV-$idx",
            invoiceNumber = String.format(Locale.US, "MC-INV-2026-%04d", idx),
            hospitalId = hospitalId,
            patientName = patientName.trim(),
            serviceCategory = serviceCategory,
            subtotalPaise = subtotalPaise,
            taxPaise = taxPaise,
            discountPaise = discountPaise,
            totalAmountPaise = totalPaise
        )
        _invoices.value = listOf(invoice) + _invoices.value
        return invoice
    }

    fun recordInvoicePaymentInPaise(invoiceId: String, amountPaise: Long): BillingInvoiceItem {
        var updatedInv: BillingInvoiceItem? = null
        _invoices.value = _invoices.value.map { inv ->
            if (inv.id == invoiceId) {
                val newPaid = (inv.paidAmountPaise + amountPaise).coerceAtMost(inv.totalAmountPaise)
                val newStatus = if (newPaid >= inv.totalAmountPaise) "PAID" else "PARTIALLY_PAID"
                val copy = inv.copy(paidAmountPaise = newPaid, status = newStatus)
                updatedInv = copy
                copy
            } else inv
        }
        return updatedInv ?: throw IllegalArgumentException("Invoice not found")
    }

    fun setAiConsent(granted: Boolean) {
        _aiConsentGranted.value = granted
    }

    fun generateAiClinicalDraft(patientName: String, clinicalNotes: String): AiClinicalDraftItem {
        require(_aiConsentGranted.value) { "Explicit AI consent is required before generating AI clinical drafts." }
        val sanitized = clinicalNotes
            .replace(Regex("(?i)ignore previous instructions"), "[REDACTED_INJECTION]")
            .trim()
        val draft = AiClinicalDraftItem(
            id = "AI-DRAFT-${_aiDrafts.value.size + 1}",
            patientName = patientName.trim(),
            promptSummary = sanitized,
            generatedSoapNote = "S: Patient reports $sanitized\nO: Vitals & history reviewed in hospital EHR.\nA: Clinical assessment pending attending physician confirmation.\nP: Follow hospital protocol; verify allergies before prescribing.",
            safetyFlags = listOf("NON_DIAGNOSTIC_ASSISTANCE_ONLY", "DOCTOR_SIGNATURE_REQUIRED")
        )
        _aiDrafts.value = listOf(draft) + _aiDrafts.value
        return draft
    }

    fun approveAiClinicalDraft(draftId: String): AiClinicalDraftItem? {
        var approved: AiClinicalDraftItem? = null
        _aiDrafts.value = _aiDrafts.value.map { draft ->
            if (draft.id == draftId) {
                val updated = draft.copy(status = "APPROVED_BY_DOCTOR")
                approved = updated
                updated
            } else draft
        }
        return approved
    }

    fun setMfaEnabled(enabled: Boolean) {
        _mfaEnabled.value = enabled
    }

    fun dispatchLockScreenSafeNotification(
        recipientLabel: String,
        channel: String,
        category: String
    ): OutboxNotificationItem {
        // Never leak diagnosis, HIV/oncology terms, or lab values on lock-screen title
        val safeTitle = when (category.uppercase(Locale.ROOT)) {
            "LAB" -> "MediCore Alert: A new diagnostic update is available in your secure portal."
            "BILLING" -> "MediCore Alert: Billing statement updated in your hospital account."
            else -> "MediCore Alert: You have a new clinical appointment update."
        }
        val item = OutboxNotificationItem(
            id = "OUTBOX-${_notifications.value.size + 1}",
            recipientLabel = recipientLabel.trim(),
            channel = channel,
            lockScreenSafeTitle = safeTitle
        )
        _notifications.value = listOf(item) + _notifications.value
        return item
    }
}
