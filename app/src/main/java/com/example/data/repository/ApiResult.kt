package com.example.data.repository

import com.example.core.network.ApiEnvelope
import com.example.core.network.ApiErrorDto
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import retrofit2.Response

sealed class ApiResult<out T> {
    data class Success<T>(val data: T, val meta: com.example.core.network.PaginationMetaDto? = null) : ApiResult<T>()
    data class Error(
        val code: String,
        val message: String,
        val httpStatus: Int? = null
    ) : ApiResult<Nothing>()
}

private data class ApiErrorEnvelope(
    val success: Boolean = false,
    val error: ApiErrorDto? = null
)

object ApiResponseParser {
    private val moshi: Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    fun <T> parse(response: Response<ApiEnvelope<T>>): ApiResult<T> {
        return if (response.isSuccessful) {
            val body = response.body()
            if (body != null && body.success && body.data != null) {
                ApiResult.Success(body.data, body.meta)
            } else {
                ApiResult.Error(
                    code = body?.error?.code ?: "EMPTY_RESPONSE",
                    message = body?.error?.message ?: "Unexpected server response",
                    httpStatus = response.code()
                )
            }
        } else {
            val rawError = try {
                response.errorBody()?.string()
            } catch (_: Exception) {
                null
            }
            val parsedError = rawError?.let {
                try {
                    val adapter = moshi.adapter(ApiErrorEnvelope::class.java)
                    adapter.fromJson(it)?.error
                } catch (_: Exception) {
                    null
                }
            }
            ApiResult.Error(
                code = parsedError?.code ?: "HTTP_${response.code()}",
                message = parsedError?.message ?: friendlyHttpError(response.code()),
                httpStatus = response.code()
            )
        }
    }

    private fun friendlyHttpError(code: Int): String = when (code) {
        400 -> "Please check your entered details and try again."
        401 -> "Authentication failed or session expired."
        403 -> "Access denied for this account."
        404 -> "Requested record was not found."
        409 -> "This slot or record conflicts with an existing entry."
        429 -> "Too many requests. Please wait a moment and retry."
        in 500..599 -> "Server is temporarily unavailable. Please try again shortly."
        else -> "Network request failed (HTTP $code)."
    }
}
