package com.example.core.network

import android.content.Context
import com.example.BuildConfig
import com.example.core.security.SecureTokenStorage
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Enterprise Network Client Provider for MediCore.
 * Attaches Keystore-backed Bearer tokens and device telemetry headers to all requests.
 */
object NetworkClientProvider {

    private const val DEFAULT_BASE_URL = "https://ais-dev-qg2jrlq77ujd54dw4uagat-853319477717.asia-southeast1.run.app/"

    @Volatile
    private var apiService: MediCoreApiService? = null

    fun getApiService(context: Context? = null): MediCoreApiService {
        return apiService ?: synchronized(this) {
            apiService ?: buildRetrofit(context).create(MediCoreApiService::class.java).also {
                apiService = it
            }
        }
    }

    private fun buildRetrofit(context: Context?): Retrofit {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val authInterceptor = Interceptor { chain ->
            val original = chain.request()
            val tokenStorage = context?.let { SecureTokenStorage.getInstance(it) } ?: SecureTokenStorage()
            val tokens = tokenStorage.getCurrentTokensSync()

            val requestBuilder = original.newBuilder()
                .header("User-Agent", "MediCore-Android/1.0.0 (Linux; Android Enterprise)")
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")

            if (!tokens.accessToken.isNullOrBlank()) {
                requestBuilder.header("Authorization", "Bearer ${tokens.accessToken}")
            }

            if (!tokens.activeHospitalId.isNullOrBlank()) {
                requestBuilder.header("X-Hospital-Id", tokens.activeHospitalId)
            }

            chain.proceed(requestBuilder.build())
        }

        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(20, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(DEFAULT_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create())
            .build()
    }
}
