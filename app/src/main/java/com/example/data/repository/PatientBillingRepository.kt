package com.example.data.repository

import android.content.Context
import com.example.core.network.BillingDashboardEnvelope
import com.example.core.network.CancelOrFailPaymentRequestDto
import com.example.core.network.CreatePaymentOrderRequestDto
import com.example.core.network.CreatePaymentOrderResponseDto
import com.example.core.network.MediCoreApiService
import com.example.core.network.NetworkClientProvider
import com.example.core.network.PatientInvoiceDetailDto
import com.example.core.network.PatientPaymentDto
import com.example.core.network.PaymentReceiptDetailDto
import com.example.core.network.PaymentStatusResponseDto
import com.example.core.network.VerifyPaymentRequestDto
import com.example.core.network.VerifyPaymentResponseDto
import java.io.File
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID

class PatientBillingRepository(
    private val context: Context? = null,
    private val apiService: MediCoreApiService = requireNotNull(
        context?.let { NetworkClientProvider.getApiService(it) }
    ) { "Context or explicit MediCoreApiService is required" }
) {
    suspend fun getBillingDashboard(
        status: String = "ALL",
        sortBy: String = "newest",
        search: String? = null,
        page: Int = 1,
        limit: Int = 20
    ): ApiResult<BillingDashboardEnvelope> {
        return try {
            val response = apiService.getPatientInvoicesDashboard(
                status = status,
                sortBy = sortBy,
                search = search?.takeIf { it.isNotBlank() },
                page = page,
                limit = limit
            )
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null && body.success) {
                    ApiResult.Success(body, body.meta)
                } else {
                    ApiResult.Error(
                        code = body?.error?.code ?: "EMPTY_RESPONSE",
                        message = body?.error?.message ?: "Unable to load billing summary.",
                        httpStatus = response.code()
                    )
                }
            } else {
                ApiResult.Error(
                    code = "HTTP_${response.code()}",
                    message = when (response.code()) {
                        401 -> "Session expired. Please sign in again."
                        403 -> "Access restricted to your patient billing account."
                        else -> "Unable to load billing summary (HTTP ${response.code()})."
                    },
                    httpStatus = response.code()
                )
            }
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Network unavailable while loading invoices.")
        }
    }

    suspend fun getInvoiceDetail(invoiceId: String): ApiResult<PatientInvoiceDetailDto> {
        return try {
            ApiResponseParser.parse(apiService.getPatientInvoiceDetail(invoiceId))
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to fetch invoice details.")
        }
    }

    suspend fun createPaymentOrder(
        invoiceId: String,
        amountPaise: Long?,
        method: String,
        methodDetail: String? = null,
        idempotencyKey: String = UUID.randomUUID().toString()
    ): ApiResult<CreatePaymentOrderResponseDto> {
        return try {
            ApiResponseParser.parse(
                apiService.createPatientPaymentOrder(
                    invoiceId = invoiceId,
                    request = CreatePaymentOrderRequestDto(
                        amountPaise = amountPaise,
                        method = method,
                        methodDetail = methodDetail?.takeIf { it.isNotBlank() },
                        idempotencyKey = idempotencyKey
                    )
                )
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to initialize payment order.")
        }
    }

    suspend fun verifyPayment(
        paymentId: String,
        gatewayOrderId: String,
        gatewayPaymentId: String,
        gatewaySignature: String
    ): ApiResult<VerifyPaymentResponseDto> {
        return try {
            ApiResponseParser.parse(
                apiService.verifyPatientPayment(
                    paymentId = paymentId,
                    request = VerifyPaymentRequestDto(
                        gatewayOrderId = gatewayOrderId,
                        gatewayPaymentId = gatewayPaymentId,
                        gatewaySignature = gatewaySignature
                    )
                )
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Payment verification request failed.")
        }
    }

    suspend fun cancelOrFailPayment(
        paymentId: String,
        outcome: String,
        reason: String? = null
    ): ApiResult<PatientPaymentDto> {
        return try {
            ApiResponseParser.parse(
                apiService.cancelOrFailPatientPayment(
                    paymentId = paymentId,
                    request = CancelOrFailPaymentRequestDto(outcome = outcome, reason = reason)
                )
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to update payment status.")
        }
    }

    suspend fun getPaymentStatus(paymentId: String): ApiResult<PaymentStatusResponseDto> {
        return try {
            ApiResponseParser.parse(apiService.getPatientPaymentStatus(paymentId))
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to fetch payment status.")
        }
    }

    suspend fun listPayments(status: String = "ALL", page: Int = 1): ApiResult<List<PatientPaymentDto>> {
        return try {
            ApiResponseParser.parse(apiService.listPatientPayments(status = status, page = page))
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to load payment history.")
        }
    }

    suspend fun getPaymentReceipt(paymentId: String): ApiResult<PaymentReceiptDetailDto> {
        return try {
            ApiResponseParser.parse(apiService.getPatientPaymentReceipt(paymentId))
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to load verified receipt.")
        }
    }

    suspend fun downloadInvoicePdfToCache(invoiceId: String): ApiResult<File> {
        val ctx = context ?: return ApiResult.Error("NO_CONTEXT", "Application context is required to save PDFs.")
        return try {
            val response = apiService.downloadInvoicePdf(invoiceId)
            if (response.isSuccessful) {
                val body = response.body() ?: return ApiResult.Error("EMPTY_PDF", "Empty PDF response.")
                val docsDir = File(ctx.cacheDir, "docs").apply { mkdirs() }
                val target = File(docsDir, "MediCore-Invoice-$invoiceId.pdf")
                body.byteStream().use { input ->
                    target.outputStream().use { output -> input.copyTo(output) }
                }
                ApiResult.Success(target)
            } else {
                ApiResult.Error("PDF_ERROR", "Unable to download invoice PDF (HTTP ${response.code()}).", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to download invoice PDF.")
        }
    }

    suspend fun downloadReceiptPdfToCache(paymentId: String): ApiResult<File> {
        val ctx = context ?: return ApiResult.Error("NO_CONTEXT", "Application context is required to save PDFs.")
        return try {
            val response = apiService.downloadReceiptPdf(paymentId)
            if (response.isSuccessful) {
                val body = response.body() ?: return ApiResult.Error("EMPTY_PDF", "Empty PDF response.")
                val docsDir = File(ctx.cacheDir, "docs").apply { mkdirs() }
                val target = File(docsDir, "MediCore-Receipt-$paymentId.pdf")
                body.byteStream().use { input ->
                    target.outputStream().use { output -> input.copyTo(output) }
                }
                ApiResult.Success(target)
            } else {
                ApiResult.Error("PDF_ERROR", "Receipt PDF unavailable (HTTP ${response.code()}).", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Unable to download receipt PDF.")
        }
    }

    companion object {
        fun formatInrFromPaise(paise: Long): String {
            val negative = paise < 0
            val abs = kotlin.math.abs(paise)
            val rupees = abs / 100
            val cents = (abs % 100).toInt().toString().padStart(2, '0')
            val prefix = if (negative) "-₹" else "₹"
            return "$prefix$rupees.$cents"
        }

        fun parseRupeesToPaise(input: String): Long? {
            val clean = input.trim().replace(",", "")
            if (clean.isEmpty()) return null
            return try {
                val bd = BigDecimal(clean).setScale(2, RoundingMode.HALF_UP)
                val paise = bd.multiply(BigDecimal(100)).longValueExact()
                if (paise > 0L) paise else null
            } catch (_: Exception) {
                null
            }
        }
    }
}
