package com.example.core.network

import com.example.core.security.SecureTokenStorage
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route

/**
 * Automatically rotates access + refresh tokens on 401 Unauthorized responses.
 * Uses a synchronized lock so concurrent 401s trigger at most one refresh call,
 * and emits SessionExpired if the refresh token itself is rejected or revoked.
 */
class TokenAuthenticator(
    private val baseUrl: String,
    private val tokenStorageProvider: () -> SecureTokenStorage,
    private val moshi: Moshi
) : Authenticator {

    private val refreshLock = Any()
    private val bareClient = OkHttpClient.Builder().build()

    override fun authenticate(route: Route?, response: Response): Request? {
        val path = response.request.url.encodedPath
        if (path.endsWith("/auth/refresh") ||
            path.endsWith("/auth/login") ||
            path.endsWith("/auth/patient/login") ||
            path.endsWith("/auth/otp/request") ||
            path.endsWith("/auth/otp/verify") ||
            path.endsWith("/auth/patient/otp/request") ||
            path.endsWith("/auth/patient/otp/verify") ||
            path.endsWith("/auth/register") ||
            path.endsWith("/auth/patient/register")
        ) {
            return null
        }

        if (responseCount(response) >= 2) {
            return null
        }

        val tokenStorage = tokenStorageProvider()
        val requestToken = response.request.header("Authorization")?.removePrefix("Bearer ")?.trim()

        synchronized(refreshLock) {
            val currentTokens = runBlocking { tokenStorage.loadTokens() }
            val currentAccess = currentTokens.accessToken

            // Another thread already refreshed the token while we waited for the lock
            if (!currentAccess.isNullOrBlank() && currentAccess != requestToken) {
                return response.request.newBuilder()
                    .header("Authorization", "Bearer $currentAccess")
                    .build()
            }

            val refreshToken = currentTokens.refreshToken
            if (refreshToken.isNullOrBlank()) {
                runBlocking { tokenStorage.clearTokens() }
                SessionEventBus.emitSessionExpired("Please sign in to continue.")
                return null
            }

            return try {
                val payloadJson = """{"refreshToken":"${refreshToken.replace("\"", "")}"}"""
                val refreshUrl = baseUrl.trimEnd('/') + "/api/v1/auth/refresh"
                val refreshReq = Request.Builder()
                    .url(refreshUrl)
                    .post(payloadJson.toRequestBody("application/json".toMediaType()))
                    .header("Accept", "application/json")
                    .build()

                bareClient.newCall(refreshReq).execute().use { refreshResp ->
                    val rawBody = refreshResp.body?.string()
                    if (!refreshResp.isSuccessful || rawBody.isNullOrBlank()) {
                        runBlocking { tokenStorage.clearTokens() }
                        SessionEventBus.emitSessionExpired("Session expired. Please sign in again.")
                        return null
                    }

                    val type = Types.newParameterizedType(ApiEnvelope::class.java, AuthResponseDto::class.java)
                    val adapter = moshi.adapter<ApiEnvelope<AuthResponseDto>>(type)
                    val envelope = adapter.fromJson(rawBody)
                    val authData = envelope?.data

                    if (envelope?.success == true && authData != null) {
                        runBlocking {
                            tokenStorage.saveTokens(
                                accessToken = authData.accessToken,
                                refreshToken = authData.refreshToken,
                                expiresInSeconds = authData.expiresIn,
                                userId = authData.user.id,
                                activeHospitalId = authData.user.activeHospitalId,
                                userEmail = authData.user.email,
                                isEmailVerified = authData.user.isEmailVerified,
                                onboardingCompleted = currentTokens.onboardingCompleted
                            )
                        }
                        response.request.newBuilder()
                            .header("Authorization", "Bearer ${authData.accessToken}")
                            .build()
                    } else {
                        runBlocking { tokenStorage.clearTokens() }
                        SessionEventBus.emitSessionExpired("Session expired. Please sign in again.")
                        null
                    }
                }
            } catch (_: Exception) {
                runBlocking { tokenStorage.clearTokens() }
                SessionEventBus.emitSessionExpired("Unable to renew session. Please sign in again.")
                null
            }
        }
    }

    private fun responseCount(response: Response): Int {
        var result = 1
        var prior = response.priorResponse
        while (prior != null) {
            result++
            prior = prior.priorResponse
        }
        return result
    }
}
