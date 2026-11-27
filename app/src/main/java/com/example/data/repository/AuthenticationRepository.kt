package com.example.data.repository

import android.content.Context
import com.example.core.network.AuthResponseDto
import com.example.core.network.ForgotPasswordRequestDto
import com.example.core.network.ForgotPasswordResponseDto
import com.example.core.network.LoginRequestDto
import com.example.core.network.LogoutAllResponseDto
import com.example.core.network.LogoutRequestDto
import com.example.core.network.MediCoreApiService
import com.example.core.network.NetworkClientProvider
import com.example.core.network.PatientRegisterRequestDto
import com.example.core.network.RefreshRequestDto
import com.example.core.network.RequestPatientOtpRequestDto
import com.example.core.network.RequestPatientOtpResponseDto
import com.example.core.network.ResendVerificationRequestDto
import com.example.core.network.ResendVerificationResponseDto
import com.example.core.network.ResetPasswordRequestDto
import com.example.core.network.UserProfileDto
import com.example.core.network.VerifyEmailRequestDto
import com.example.core.network.VerifyEmailResponseDto
import com.example.core.network.VerifyPatientOtpRequestDto
import com.example.core.security.SecureTokenStorage

sealed class SessionRestoreState {
    data object Unauthenticated : SessionRestoreState()
    data class Authenticated(
        val user: UserProfileDto,
        val onboardingCompleted: Boolean
    ) : SessionRestoreState()
}

class AuthenticationRepository(
    private val context: Context,
    private val apiService: MediCoreApiService = NetworkClientProvider.getApiService(context),
    private val tokenStorage: SecureTokenStorage = SecureTokenStorage.getInstance(context)
) {

    suspend fun restoreSession(): SessionRestoreState {
        val stored = tokenStorage.loadTokens()
        if (!stored.hasRefreshSession && stored.accessToken.isNullOrBlank()) {
            return SessionRestoreState.Unauthenticated
        }

        // If access token expired but refresh token exists, rotate silently first
        if (stored.isExpired && !stored.refreshToken.isNullOrBlank()) {
            try {
                val refreshResp = apiService.refresh(RefreshRequestDto(stored.refreshToken))
                val refreshParsed = ApiResponseParser.parse(refreshResp)
                if (refreshParsed is ApiResult.Success) {
                    val data = refreshParsed.data
                    tokenStorage.saveTokens(
                        accessToken = data.accessToken,
                        refreshToken = data.refreshToken,
                        expiresInSeconds = data.expiresIn,
                        userId = data.user.id,
                        activeHospitalId = data.user.activeHospitalId,
                        userEmail = data.user.email,
                        isEmailVerified = data.user.isEmailVerified
                    )
                } else {
                    tokenStorage.clearTokens()
                    return SessionRestoreState.Unauthenticated
                }
            } catch (_: Exception) {
                return SessionRestoreState.Unauthenticated
            }
        }

        return try {
            val meResp = apiService.getMe()
            when (val meResult = ApiResponseParser.parse(meResp)) {
                is ApiResult.Success -> {
                    val user = meResult.data
                    val isPatient = user.globalRoles.contains("PATIENT") || user.activeRoles.contains("PATIENT")
                    if (!isPatient) {
                        tokenStorage.clearTokens()
                        return SessionRestoreState.Unauthenticated
                    }
                    // Fetch live onboardingCompleted from authoritative backend profile
                    var onboardingDone = stored.onboardingCompleted
                    try {
                        val profResp = apiService.getPatientFullProfile()
                        val profParsed = ApiResponseParser.parse(profResp)
                        if (profParsed is ApiResult.Success) {
                            onboardingDone = profParsed.data.patient.onboardingCompleted
                            tokenStorage.updateSessionMeta(
                                isEmailVerified = user.isEmailVerified,
                                onboardingCompleted = onboardingDone,
                                userEmail = user.email
                            )
                        }
                    } catch (_: Exception) {
                    }
                    SessionRestoreState.Authenticated(user = user, onboardingCompleted = onboardingDone)
                }
                is ApiResult.Error -> {
                    if (meResult.httpStatus == 401 || meResult.httpStatus == 403) {
                        tokenStorage.clearTokens()
                    }
                    SessionRestoreState.Unauthenticated
                }
            }
        } catch (_: Exception) {
            SessionRestoreState.Unauthenticated
        }
    }

    suspend fun registerPatient(
        fullName: String,
        email: String,
        phone: String,
        password: String,
        confirmPassword: String,
        dateOfBirth: String? = null,
        gender: String? = null,
        termsAccepted: Boolean
    ): ApiResult<AuthResponseDto> {
        return try {
            val resp = apiService.registerPatient(
                PatientRegisterRequestDto(
                    fullName = fullName.trim(),
                    email = email.trim(),
                    phone = phone.trim(),
                    password = password,
                    confirmPassword = confirmPassword,
                    dateOfBirth = dateOfBirth?.takeIf { it.isNotBlank() },
                    gender = gender?.takeIf { it.isNotBlank() },
                    termsAccepted = termsAccepted
                )
            )
            when (val parsed = ApiResponseParser.parse(resp)) {
                is ApiResult.Success -> {
                    val auth = parsed.data
                    tokenStorage.saveTokens(
                        accessToken = auth.accessToken,
                        refreshToken = auth.refreshToken,
                        expiresInSeconds = auth.expiresIn,
                        userId = auth.user.id,
                        activeHospitalId = auth.user.activeHospitalId,
                        userEmail = auth.user.email,
                        isEmailVerified = auth.user.isEmailVerified,
                        onboardingCompleted = false
                    )
                    parsed
                }
                is ApiResult.Error -> parsed
            }
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to connect to MediCore server.")
        }
    }

    suspend fun loginPatient(emailOrPhone: String, password: String): ApiResult<AuthResponseDto> {
        return try {
            val resp = apiService.loginPatient(
                LoginRequestDto(
                    emailOrPhone = emailOrPhone.trim(),
                    password = password
                )
            )
            when (val parsed = ApiResponseParser.parse(resp)) {
                is ApiResult.Success -> {
                    val auth = parsed.data
                    val isPatient = auth.user.globalRoles.contains("PATIENT") || auth.user.activeRoles.contains("PATIENT")
                    if (!isPatient) {
                        return ApiResult.Error(
                            code = "PATIENT_ROLE_REQUIRED",
                            message = "This mobile app is exclusively for patients. Staff accounts must sign in on the MediCore Web Portal.",
                            httpStatus = 403
                        )
                    }

                    tokenStorage.saveTokens(
                        accessToken = auth.accessToken,
                        refreshToken = auth.refreshToken,
                        expiresInSeconds = auth.expiresIn,
                        userId = auth.user.id,
                        activeHospitalId = auth.user.activeHospitalId,
                        userEmail = auth.user.email,
                        isEmailVerified = auth.user.isEmailVerified,
                        onboardingCompleted = false
                    )
                    // Sync live onboardingCompleted flag from PostgreSQL profile
                    try {
                        val prof = ApiResponseParser.parse(apiService.getPatientFullProfile())
                        if (prof is ApiResult.Success) {
                            tokenStorage.updateSessionMeta(
                                onboardingCompleted = prof.data.patient.onboardingCompleted
                            )
                        }
                    } catch (_: Exception) {
                    }
                    parsed
                }
                is ApiResult.Error -> parsed
            }
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to connect to MediCore server.")
        }
    }

    suspend fun requestPatientOtp(
        emailOrPhone: String,
        channel: String
    ): ApiResult<RequestPatientOtpResponseDto> {
        return try {
            ApiResponseParser.parse(
                apiService.requestPatientOtp(
                    RequestPatientOtpRequestDto(
                        emailOrPhone = emailOrPhone.trim(),
                        channel = channel
                    )
                )
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to connect to MediCore server.")
        }
    }

    suspend fun verifyPatientOtp(
        emailOrPhone: String,
        otpCode: String,
        channel: String
    ): ApiResult<AuthResponseDto> {
        return try {
            val resp = apiService.verifyPatientOtp(
                VerifyPatientOtpRequestDto(
                    emailOrPhone = emailOrPhone.trim(),
                    otpCode = otpCode.trim(),
                    channel = channel
                )
            )
            when (val parsed = ApiResponseParser.parse(resp)) {
                is ApiResult.Success -> {
                    val auth = parsed.data
                    val isPatient = auth.user.globalRoles.contains("PATIENT") || auth.user.activeRoles.contains("PATIENT")
                    if (!isPatient) {
                        return ApiResult.Error(
                            code = "PATIENT_ROLE_REQUIRED",
                            message = "This mobile app is exclusively for patients. Staff accounts must sign in on the MediCore Web Portal.",
                            httpStatus = 403
                        )
                    }

                    tokenStorage.saveTokens(
                        accessToken = auth.accessToken,
                        refreshToken = auth.refreshToken,
                        expiresInSeconds = auth.expiresIn,
                        userId = auth.user.id,
                        activeHospitalId = auth.user.activeHospitalId,
                        userEmail = auth.user.email,
                        isEmailVerified = auth.user.isEmailVerified,
                        onboardingCompleted = false
                    )
                    try {
                        val prof = ApiResponseParser.parse(apiService.getPatientFullProfile())
                        if (prof is ApiResult.Success) {
                            tokenStorage.updateSessionMeta(
                                onboardingCompleted = prof.data.patient.onboardingCompleted
                            )
                        }
                    } catch (_: Exception) {
                    }
                    parsed
                }
                is ApiResult.Error -> parsed
            }
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to connect to MediCore server.")
        }
    }

    suspend fun verifyEmail(email: String, code: String): ApiResult<VerifyEmailResponseDto> {
        return try {
            val resp = apiService.verifyEmail(VerifyEmailRequestDto(email.trim(), code.trim()))
            val parsed = ApiResponseParser.parse(resp)
            if (parsed is ApiResult.Success) {
                tokenStorage.updateSessionMeta(isEmailVerified = true)
            }
            parsed
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Network error while verifying email.")
        }
    }

    suspend fun resendVerification(email: String): ApiResult<ResendVerificationResponseDto> {
        return try {
            ApiResponseParser.parse(apiService.resendVerification(ResendVerificationRequestDto(email.trim())))
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Network error while resending code.")
        }
    }

    suspend fun forgotPassword(emailOrPhone: String): ApiResult<ForgotPasswordResponseDto> {
        return try {
            ApiResponseParser.parse(apiService.forgotPassword(ForgotPasswordRequestDto(emailOrPhone.trim())))
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Network error requesting password reset.")
        }
    }

    suspend fun resetPassword(emailOrPhone: String, otpCode: String, newPassword: String): ApiResult<Map<String, Boolean>> {
        return try {
            ApiResponseParser.parse(
                apiService.resetPassword(
                    ResetPasswordRequestDto(
                        emailOrPhone = emailOrPhone.trim(),
                        otpCode = otpCode.trim(),
                        newPassword = newPassword
                    )
                )
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Network error resetting password.")
        }
    }

    suspend fun logoutCurrentDevice() {
        try {
            val refreshToken = tokenStorage.getCurrentTokensSync().refreshToken
            apiService.logout(LogoutRequestDto(refreshToken = refreshToken))
        } catch (_: Exception) {
        } finally {
            tokenStorage.clearTokens()
        }
    }

    suspend fun logoutAllDevices(): ApiResult<LogoutAllResponseDto> {
        return try {
            val result = ApiResponseParser.parse(apiService.logoutAll())
            tokenStorage.clearTokens()
            result
        } catch (e: Exception) {
            tokenStorage.clearTokens()
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Signed out locally.")
        }
    }
}
