package com.example.core.network

import com.example.core.security.SecureTokenStorage
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Attaches Authorization Bearer token and device headers without forcing Content-Type
 * so Retrofit @Multipart uploads and JSON requests both serialize cleanly.
 */
class AuthInterceptor(
    private val tokenStorageProvider: () -> SecureTokenStorage
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val tokens = tokenStorageProvider().getCurrentTokensSync()

        val requestBuilder = original.newBuilder()
            .header("User-Agent", "MediCore-Patient-Android/1.0.0 (Linux; Android)")
            .header("Accept", "application/json")

        val isPublicAuthRoute = original.url.encodedPath.let { path ->
            path.endsWith("/auth/otp/request") ||
                path.endsWith("/auth/otp/verify") ||
                path.endsWith("/auth/patient/otp/request") ||
                path.endsWith("/auth/patient/otp/verify") ||
                path.endsWith("/auth/register") ||
                path.endsWith("/auth/patient/register") ||
                path.endsWith("/auth/refresh")
        }

        if (!isPublicAuthRoute && !tokens.accessToken.isNullOrBlank()) {
            requestBuilder.header("Authorization", "Bearer ${tokens.accessToken}")
        }

        if (!tokens.activeHospitalId.isNullOrBlank()) {
            requestBuilder.header("X-Hospital-Id", tokens.activeHospitalId)
        }

        return chain.proceed(requestBuilder.build())
    }
}
