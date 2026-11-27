package com.example.core.network

data class ApiEnvelope<T>(
    val success: Boolean,
    val data: T? = null,
    val error: ApiErrorDto? = null,
    val meta: PaginationMetaDto? = null,
    val statistics: PlatformStatisticsDto? = null
)

data class ApiErrorDto(
    val code: String,
    val message: String
)

data class PaginationMetaDto(
    val page: Int,
    val limit: Int,
    val total: Int,
    val totalPages: Int
)

// Auth DTOs
data class RegisterRequestDto(
    val fullName: String,
    val email: String,
    val phone: String? = null,
    val password: String,
    val hospitalId: String? = null
)

data class LoginRequestDto(
    val emailOrPhone: String,
    val password: String,
    val deviceInfo: String = "Android MediCore Client"
)

data class RefreshRequestDto(
    val refreshToken: String
)

data class LogoutRequestDto(
    val refreshToken: String? = null
)

data class ForgotPasswordRequestDto(
    val emailOrPhone: String
)

data class ResetPasswordRequestDto(
    val emailOrPhone: String,
    val otpCode: String,
    val newPassword: String
)

data class VerifyEmailRequestDto(
    val email: String,
    val code: String
)

data class AuthResponseDto(
    val user: UserProfileDto,
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Long,
    val verificationCodePreview: String? = null
)

data class ForgotPasswordResponseDto(
    val message: String,
    val otpCodePreview: String? = null
)

data class UserProfileDto(
    val id: String,
    val fullName: String,
    val email: String,
    val phone: String? = null,
    val isEmailVerified: Boolean,
    val isActive: Boolean,
    val activeHospitalId: String? = null,
    val globalRoles: List<String> = emptyList(),
    val activeRoles: List<String> = emptyList(),
    val permissions: List<String> = emptyList(),
    val memberships: List<MembershipDto> = emptyList()
)

data class MembershipDto(
    val id: String? = null,
    val membershipId: String? = null,
    val userId: String? = null,
    val userFullName: String? = null,
    val userEmail: String? = null,
    val userPhone: String? = null,
    val hospitalId: String,
    val hospitalName: String,
    val hospitalCity: String = "",
    val hospitalCategory: String = "",
    val hospitalStatus: String = "APPROVED",
    val department: String? = "General",
    val employeeCode: String? = null,
    val status: String = "ACTIVE",
    val roles: List<String> = emptyList(),
    val joinedAt: String = ""
)

// Hospital DTOs
data class CreateHospitalRequestDto(
    val name: String,
    val registrationNumber: String,
    val category: String,
    val logoUrl: String? = null,
    val address: String,
    val city: String,
    val state: String,
    val contactEmail: String,
    val contactPhone: String,
    val totalBeds: Int = 120,
    val availableBeds: Int = 35,
    val departments: List<String> = listOf("General Medicine", "Cardiology", "Emergency", "Pediatrics")
)

data class UpdateHospitalRequestDto(
    val name: String? = null,
    val category: String? = null,
    val logoUrl: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val contactEmail: String? = null,
    val contactPhone: String? = null,
    val totalBeds: Int? = null,
    val availableBeds: Int? = null,
    val departments: List<String>? = null
)

data class HospitalDto(
    val id: String,
    val name: String,
    val registrationNumber: String,
    val category: String,
    val logoUrl: String? = null,
    val address: String,
    val city: String,
    val state: String,
    val contactEmail: String,
    val contactPhone: String,
    val totalBeds: Int,
    val availableBeds: Int,
    val status: String,
    val departments: List<String> = emptyList(),
    val createdByUserId: String? = null,
    val approvedByUserId: String? = null,
    val rejectionReason: String? = null
)

data class SelectHospitalResponseDto(
    val selectedHospital: HospitalDto,
    val accessToken: String,
    val user: UserProfileDto
)

// Invitation & Membership Update DTOs
data class CreateInvitationRequestDto(
    val email: String,
    val roleCode: String,
    val department: String = "General"
)

data class InvitationDto(
    val id: String,
    val hospitalId: String,
    val email: String,
    val roleCode: String,
    val department: String? = null,
    val inviteCode: String,
    val status: String,
    val createdAt: String
)

data class AcceptInvitationRequestDto(
    val inviteCode: String
)

data class UpdateMembershipRequestDto(
    val status: String? = null,
    val department: String? = null,
    val roles: List<String>? = null
)

data class RejectOrSuspendHospitalRequestDto(
    val reason: String? = null
)

data class PlatformStatisticsDto(
    val totalHospitals: Int,
    val approvedHospitals: Int,
    val pendingHospitals: Int,
    val rejectedHospitals: Int,
    val suspendedHospitals: Int,
    val totalUsers: Int,
    val totalMemberships: Int,
    val recentAuditLogs: List<AuditLogDto> = emptyList()
)

data class AuditLogDto(
    val id: String,
    val userId: String? = null,
    val hospitalId: String? = null,
    val action: String,
    val entityType: String,
    val entityId: String? = null,
    val createdAt: String
)
