package com.example.core.model

enum class HospitalStatus(val label: String, val colorHex: Long) {
    PENDING("Pending Verification", 0xFFD97706),
    APPROVED("Verified", 0xFF16845B),
    REJECTED("Rejected", 0xFFB91C1C),
    SUSPENDED("Suspended", 0xFF8B474D)
}

enum class DirectoryVerificationStatus(val label: String) {
    UNVERIFIED("Unverified"),
    PENDING_VERIFICATION("Pending Verification"),
    UNDER_REVIEW("Under Review"),
    VERIFIED("Verified"),
    REJECTED("Rejected"),
    SUSPENDED("Suspended")
}

data class Hospital(
    val id: String,
    val directoryCode: String = id,
    val name: String,
    val legalName: String = name,
    val displayName: String = name,
    val registrationNumber: String = directoryCode,
    val facilityType: String = "Multi-Specialty Hospital",
    val ownershipType: String = "Private",
    val city: String = "Ranchi",
    val district: String = "Ranchi",
    val state: String = "Jharkhand",
    val country: String = "India",
    val pincode: String? = null,
    val address: String,
    val category: String = facilityType,
    val logoUrl: String? = null,
    val primaryPhone: String? = null,
    val secondaryPhone: String? = null,
    val email: String? = null,
    val website: String? = null,
    val specialties: List<String> = emptyList(),
    val emergencyAvailable: Boolean? = null,
    val verificationStatus: DirectoryVerificationStatus = DirectoryVerificationStatus.PENDING_VERIFICATION,
    val dataStatus: String = "Partial public record",
    val sourceName: String = "Ranchi Hospital Directory Dataset",
    val sourceUrl: String = "https://ranchi.nic.in",
    val isActiveTenant: Boolean = false,
    val lastVerifiedAt: String? = null,
    val status: HospitalStatus = HospitalStatus.PENDING,
    val totalBeds: Int = 0,
    val availableBeds: Int = 0,
    val rating: Double = 4.8,
    val distanceKm: String = "Ranchi, Jharkhand",
    val createdByUserId: String? = null,
    val approvedByUserId: String? = null,
    val rejectionReason: String? = null
) {
    // Compatibility helpers for existing screens
    val contactPhone: String
        get() = primaryPhone ?: "Not listed in public record"

    val contactEmail: String
        get() = email ?: "Not listed in public record"

    val departments: List<String>
        get() = specialties

    val isEmergencyConfirmed: Boolean
        get() = emergencyAvailable == true
}
