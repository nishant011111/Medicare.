package com.example.feature.billing

import android.app.Application
import android.content.Intent
import androidx.core.content.FileProvider
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.core.network.BillingDashboardSummaryDto
import com.example.core.network.CreatePaymentOrderResponseDto
import com.example.core.network.PatientInvoiceDetailDto
import com.example.core.network.PatientInvoiceSummaryDto
import com.example.core.network.PatientPaymentDto
import com.example.core.network.PaymentReceiptDetailDto
import com.example.core.network.PaymentStatusResponseDto
import com.example.data.repository.ApiResult
import com.example.data.repository.PatientBillingRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

data class BillingUiState(
    val isLoading: Boolean = false,
    val isMutating: Boolean = false,
    val errorMessage: String? = null,
    val statusFilter: String = "ALL",
    val sortBy: String = "newest",
    val searchQuery: String = "",
    val summary: BillingDashboardSummaryDto = BillingDashboardSummaryDto(),
    val invoices: List<PatientInvoiceSummaryDto> = emptyList(),
    val recentTransactions: List<PatientPaymentDto> = emptyList(),
    val selectedInvoice: PatientInvoiceDetailDto? = null,
    val activeOrder: CreatePaymentOrderResponseDto? = null,
    val paymentStatus: PaymentStatusResponseDto? = null,
    val paymentHistoryFilter: String = "ALL",
    val paymentHistory: List<PatientPaymentDto> = emptyList(),
    val receiptDetail: PaymentReceiptDetailDto? = null,
    val feedbackMessage: String? = null
)

class BillingViewModel(
    application: Application,
    private val repository: PatientBillingRepository
) : AndroidViewModel(application) {

    @Suppress("unused")
    constructor(application: Application) : this(
        application,
        PatientBillingRepository(application.applicationContext)
    )

    private val _uiState = MutableStateFlow(BillingUiState())
    val uiState: StateFlow<BillingUiState> = _uiState.asStateFlow()

    fun loadDashboard() {
        val snapshot = _uiState.value
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        viewModelScope.launch {
            when (
                val res = repository.getBillingDashboard(
                    status = snapshot.statusFilter,
                    sortBy = snapshot.sortBy,
                    search = snapshot.searchQuery
                )
            ) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            summary = res.data.summary ?: BillingDashboardSummaryDto(),
                            invoices = res.data.data,
                            recentTransactions = res.data.recentTransactions,
                            errorMessage = null
                        )
                    }
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(isLoading = false, errorMessage = res.message) }
                }
            }
        }
    }

    fun updateFilter(status: String) {
        _uiState.update { it.copy(statusFilter = status) }
        loadDashboard()
    }

    fun updateSort(sortBy: String) {
        _uiState.update { it.copy(sortBy = sortBy) }
        loadDashboard()
    }

    fun updateSearch(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        loadDashboard()
    }

    fun loadInvoiceDetail(invoiceId: String) {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        viewModelScope.launch {
            when (val res = repository.getInvoiceDetail(invoiceId)) {
                is ApiResult.Success -> _uiState.update { it.copy(isLoading = false, selectedInvoice = res.data) }
                is ApiResult.Error -> _uiState.update { it.copy(isLoading = false, errorMessage = res.message) }
            }
        }
    }

    fun initiatePaymentOrder(
        invoiceId: String,
        amountPaise: Long?,
        method: String,
        methodDetail: String? = null,
        onOrderCreated: (CreatePaymentOrderResponseDto) -> Unit
    ) {
        _uiState.update { it.copy(isMutating = true, errorMessage = null) }
        viewModelScope.launch {
            val idemKey = UUID.randomUUID().toString()
            when (val res = repository.createPaymentOrder(invoiceId, amountPaise, method, methodDetail, idemKey)) {
                is ApiResult.Success -> {
                    _uiState.update { it.copy(isMutating = false, activeOrder = res.data) }
                    onOrderCreated(res.data)
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(isMutating = false, errorMessage = res.message) }
                }
            }
        }
    }

    fun verifyPaymentWithGateway(
        paymentId: String,
        gatewayOrderId: String,
        gatewayPaymentId: String,
        gatewaySignature: String,
        onCompleted: () -> Unit
    ) {
        _uiState.update { it.copy(isMutating = true, errorMessage = null) }
        viewModelScope.launch {
            when (
                val res = repository.verifyPayment(
                    paymentId = paymentId,
                    gatewayOrderId = gatewayOrderId,
                    gatewayPaymentId = gatewayPaymentId,
                    gatewaySignature = gatewaySignature
                )
            ) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isMutating = false,
                            feedbackMessage = "Payment verified securely on server."
                        )
                    }
                    loadPaymentStatus(paymentId)
                    loadDashboard()
                    onCompleted()
                }
                is ApiResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isMutating = false,
                            errorMessage = res.message
                        )
                    }
                }
            }
        }
    }

    fun cancelActivePayment(
        paymentId: String,
        outcome: String = "CANCELLED",
        reason: String? = "Cancelled by patient at checkout",
        onDone: () -> Unit
    ) {
        _uiState.update { it.copy(isMutating = true, errorMessage = null) }
        viewModelScope.launch {
            when (val res = repository.cancelOrFailPayment(paymentId, outcome, reason)) {
                is ApiResult.Success -> {
                    _uiState.update { it.copy(isMutating = false, activeOrder = null) }
                    loadPaymentStatus(paymentId)
                    loadDashboard()
                    onDone()
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(isMutating = false, errorMessage = res.message) }
                }
            }
        }
    }

    fun loadPaymentStatus(paymentId: String) {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        viewModelScope.launch {
            when (val res = repository.getPaymentStatus(paymentId)) {
                is ApiResult.Success -> _uiState.update { it.copy(isLoading = false, paymentStatus = res.data) }
                is ApiResult.Error -> _uiState.update { it.copy(isLoading = false, errorMessage = res.message) }
            }
        }
    }

    fun loadPaymentHistory(statusFilter: String = _uiState.value.paymentHistoryFilter) {
        _uiState.update { it.copy(isLoading = true, paymentHistoryFilter = statusFilter, errorMessage = null) }
        viewModelScope.launch {
            when (val res = repository.listPayments(status = statusFilter)) {
                is ApiResult.Success -> _uiState.update { it.copy(isLoading = false, paymentHistory = res.data) }
                is ApiResult.Error -> _uiState.update { it.copy(isLoading = false, errorMessage = res.message) }
            }
        }
    }

    fun loadReceiptDetail(paymentId: String) {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        viewModelScope.launch {
            when (val res = repository.getPaymentReceipt(paymentId)) {
                is ApiResult.Success -> _uiState.update { it.copy(isLoading = false, receiptDetail = res.data) }
                is ApiResult.Error -> _uiState.update { it.copy(isLoading = false, receiptDetail = null, errorMessage = res.message) }
            }
        }
    }

    fun shareInvoicePdf(invoiceId: String) {
        _uiState.update { it.copy(isMutating = true, errorMessage = null) }
        viewModelScope.launch {
            when (val res = repository.downloadInvoicePdfToCache(invoiceId)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(isMutating = false, feedbackMessage = "Invoice PDF saved to secure cache: ${res.data.name}")
                    }
                    launchPdfShareIntent(res.data, "MediCore Invoice PDF")
                }
                is ApiResult.Error -> _uiState.update { it.copy(isMutating = false, errorMessage = res.message) }
            }
        }
    }

    fun shareReceiptPdf(paymentId: String) {
        _uiState.update { it.copy(isMutating = true, errorMessage = null) }
        viewModelScope.launch {
            when (val res = repository.downloadReceiptPdfToCache(paymentId)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(isMutating = false, feedbackMessage = "Receipt PDF saved to secure cache: ${res.data.name}")
                    }
                    launchPdfShareIntent(res.data, "MediCore Payment Receipt PDF")
                }
                is ApiResult.Error -> _uiState.update { it.copy(isMutating = false, errorMessage = res.message) }
            }
        }
    }

    private fun launchPdfShareIntent(file: java.io.File, title: String) {
        try {
            val ctx = getApplication<Application>().applicationContext
            val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.fileprovider", file)
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            ctx.startActivity(Intent.createChooser(intent, title).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: Exception) {
            // Safe no-op in headless/test environments without chooser activity
        }
    }

    fun clearFeedback() {
        _uiState.update { it.copy(feedbackMessage = null) }
    }
}
