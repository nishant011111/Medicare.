package com.example.core.model

enum class MembershipStatus(val label: String, val colorHex: Long) {
    ACTIVE("Active", 0xFF10B981),
    INACTIVE("Inactive", 0xFF64748B),
    INVITED("Invited", 0xFFF59E0B),
    SUSPENDED("Suspended", 0xFFEF4444)
}

data class HospitalMembership(
    val id: String,
    val userId: String,
    val userFullName: String,
    val userEmail: String,
    val userPhone: String? = null,
    val hospitalId: String,
    val hospitalName: String,
    val hospitalCity: String,
    val hospitalCategory: String,
    val hospitalStatus: HospitalStatus = HospitalStatus.APPROVED,
    val department: String? = "General",
    val employeeCode: String? = null,
    val status: MembershipStatus = MembershipStatus.ACTIVE,
    val roles: List<UserRole> = listOf(UserRole.PATIENT),
    val joinedAt: String = "2026-11-08"
)

data class HospitalInvitation(
    val id: String,
    val hospitalId: String,
    val hospitalName: String,
    val email: String,
    val role: UserRole,
    val department: String,
    val inviteCode: String,
    val status: String = "PENDING",
    val createdAt: String = "Just now"
)

data class AuditLogEntry(
    val id: String,
    val userId: String?,
    val userEmail: String?,
    val hospitalId: String?,
    val hospitalName: String?,
    val action: String,
    val entityType: String,
    val entityId: String?,
    val timestamp: String,
    val details: String
)

data class UserProfile(
    val id: String = "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    val fullName: String = "Rahul Verma",
    val email: String = "rahul.verma@citycare.org",
    val phone: String = "+91 98765 12345",
    val isEmailVerified: Boolean = true,
    val isActive: Boolean = true,
    val selectedHospitalId: String = "11111111-1111-4111-8111-111111111111",
    val role: UserRole = UserRole.PATIENT,
    val globalRoles: List<UserRole> = emptyList(),
    val activeRoles: List<UserRole> = listOf(UserRole.PATIENT),
    val permissions: List<String> = emptyList(),
    val memberships: List<HospitalMembership> = emptyList(),
    val avatarUrl: String? = null,
    val isDemoAccount: Boolean = false
)
