package com.example.core.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface MediCoreApiService {

    // 1. Authentication (/api/v1/auth/*)
    @POST("api/v1/auth/register")
    suspend fun register(@Body request: RegisterRequestDto): Response<ApiEnvelope<AuthResponseDto>>

    @POST("api/v1/auth/login")
    suspend fun login(@Body request: LoginRequestDto): Response<ApiEnvelope<AuthResponseDto>>

    @POST("api/v1/auth/refresh")
    suspend fun refresh(@Body request: RefreshRequestDto): Response<ApiEnvelope<AuthResponseDto>>

    @POST("api/v1/auth/logout")
    suspend fun logout(@Body request: LogoutRequestDto): Response<ApiEnvelope<Map<String, Boolean>>>

    @POST("api/v1/auth/forgot-password")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequestDto): Response<ApiEnvelope<ForgotPasswordResponseDto>>

    @POST("api/v1/auth/reset-password")
    suspend fun resetPassword(@Body request: ResetPasswordRequestDto): Response<ApiEnvelope<Map<String, Boolean>>>

    @POST("api/v1/auth/verify-email")
    suspend fun verifyEmail(@Body request: VerifyEmailRequestDto): Response<ApiEnvelope<Map<String, Any>>>

    @GET("api/v1/auth/me")
    suspend fun getMe(): Response<ApiEnvelope<UserProfileDto>>

    // 2. Hospitals (/api/v1/hospitals/*)
    @GET("api/v1/hospitals")
    suspend fun getHospitals(
        @Query("search") search: String? = null,
        @Query("category") category: String? = null,
        @Query("status") status: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<ApiEnvelope<List<HospitalDto>>>

    @POST("api/v1/hospitals")
    suspend fun createHospital(@Body request: CreateHospitalRequestDto): Response<ApiEnvelope<HospitalDto>>

    @GET("api/v1/hospitals/{id}")
    suspend fun getHospitalById(@Path("id") id: String): Response<ApiEnvelope<HospitalDto>>

    @PATCH("api/v1/hospitals/{id}")
    suspend fun updateHospital(
        @Path("id") id: String,
        @Body request: UpdateHospitalRequestDto
    ): Response<ApiEnvelope<HospitalDto>>

    @POST("api/v1/hospitals/{id}/select")
    suspend fun selectHospital(@Path("id") id: String): Response<ApiEnvelope<SelectHospitalResponseDto>>

    // 3. Memberships & Invitations (/api/v1/memberships & /api/v1/invitations/*)
    @GET("api/v1/memberships")
    suspend fun getMemberships(
        @Query("hospitalId") hospitalId: String? = null
    ): Response<ApiEnvelope<List<MembershipDto>>>

    @POST("api/v1/hospitals/{id}/invitations")
    suspend fun createInvitation(
        @Path("id") hospitalId: String,
        @Body request: CreateInvitationRequestDto
    ): Response<ApiEnvelope<InvitationDto>>

    @POST("api/v1/invitations/accept")
    suspend fun acceptInvitation(@Body request: AcceptInvitationRequestDto): Response<ApiEnvelope<MembershipDto>>

    @PATCH("api/v1/memberships/{id}")
    suspend fun updateMembership(
        @Path("id") membershipId: String,
        @Body request: UpdateMembershipRequestDto
    ): Response<ApiEnvelope<MembershipDto>>

    // 4. Super Admin (/api/v1/admin/*)
    @GET("api/v1/admin/hospitals")
    suspend fun getAdminHospitals(
        @Query("status") status: String? = null
    ): Response<ApiEnvelope<List<HospitalDto>>>

    @POST("api/v1/admin/hospitals/{id}/approve")
    suspend fun approveHospital(@Path("id") hospitalId: String): Response<ApiEnvelope<HospitalDto>>

    @POST("api/v1/admin/hospitals/{id}/reject")
    suspend fun rejectHospital(
        @Path("id") hospitalId: String,
        @Body request: RejectOrSuspendHospitalRequestDto
    ): Response<ApiEnvelope<HospitalDto>>

    @POST("api/v1/admin/hospitals/{id}/suspend")
    suspend fun suspendHospital(
        @Path("id") hospitalId: String,
        @Body request: RejectOrSuspendHospitalRequestDto
    ): Response<ApiEnvelope<HospitalDto>>
}
