package com.example.feature.billing

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.R
import com.example.core.designsystem.components.MediCoreButton
import com.example.core.designsystem.components.MediCoreCard
import com.example.core.designsystem.components.MediCoreEmptyState
import com.example.core.designsystem.components.MediCoreErrorState
import com.example.core.designsystem.components.MediCoreLoadingState
import com.example.core.designsystem.components.MediCoreStatusBadge
import com.example.core.designsystem.components.MediCoreTopBar
import com.example.data.repository.PatientBillingRepository
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCoreBorder
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCoreSuccess
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted

@Composable
fun PaymentHistoryScreen(
    onNavigateBack: () -> Unit,
    onOpenReceipt: (String) -> Unit,
    onOpenStatus: (String) -> Unit,
    viewModel: BillingViewModel = viewModel()
) {
    BackHandler { onNavigateBack() }
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadPaymentHistory("ALL")
    }

    val statusFilters = listOf("ALL", "SUCCESS", "PENDING", "FAILED", "CANCELLED", "REFUNDED")

    Scaffold(
        containerColor = MediCoreBackground,
        topBar = {
            MediCoreTopBar(
                title = stringResource(R.string.payment_history_title),
                subtitle = "All transactions and official receipts",
                onNavigateBack = onNavigateBack
            )
        },
        modifier = Modifier.testTag("payment_history_screen")
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp)
            ) {
                items(statusFilters) { status ->
                    FilterChip(
                        selected = uiState.paymentHistoryFilter == status,
                        onClick = { viewModel.loadPaymentHistory(status) },
                        label = { Text(status) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MediCorePrimary,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            when {
                uiState.isLoading && uiState.paymentHistory.isEmpty() -> {
                    MediCoreLoadingState(message = "Loading payment history...")
                }
                uiState.errorMessage != null && uiState.paymentHistory.isEmpty() -> {
                    MediCoreErrorState(
                        message = uiState.errorMessage ?: "Unable to fetch payment history.",
                        onRetry = { viewModel.loadPaymentHistory() }
                    )
                }
                uiState.paymentHistory.isEmpty() -> {
                    MediCoreEmptyState(
                        title = "No transactions yet",
                        description = "Completed and pending hospital payments will appear here.",
                        icon = Icons.Default.History
                    )
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(uiState.paymentHistory, key = { it.id }) { tx ->
                            MediCoreCard(
                                onClick = {
                                    if (tx.receiptAvailable) onOpenReceipt(tx.id) else onOpenStatus(tx.id)
                                },
                                modifier = Modifier.testTag("payment_history_item_${tx.id}")
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text(
                                            text = tx.hospitalName ?: "MediCore Hospital",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MediCoreTextDark,
                                            modifier = Modifier.weight(1f)
                                        )
                                        MediCoreStatusBadge(label = tx.status, statusType = tx.status)
                                    }
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "${tx.method} • Invoice ${tx.invoiceNumber ?: tx.invoiceId}",
                                        fontSize = 12.sp,
                                        color = MediCoreTextMuted
                                    )
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(top = 8.dp)
                                    ) {
                                        Text(
                                            text = PatientBillingRepository.formatInrFromPaise(tx.amountPaise),
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MediCorePrimary
                                        )
                                        if (tx.receiptAvailable) {
                                            MediCoreButton(
                                                text = "Receipt",
                                                isOutline = true,
                                                leadingIcon = Icons.Default.Receipt,
                                                onClick = { onOpenReceipt(tx.id) }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ReceiptViewerScreen(
    paymentId: String,
    onNavigateBack: () -> Unit,
    viewModel: BillingViewModel = viewModel()
) {
    BackHandler { onNavigateBack() }
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(paymentId) {
        viewModel.loadReceiptDetail(paymentId)
    }

    LaunchedEffect(uiState.feedbackMessage) {
        uiState.feedbackMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.clearFeedback()
        }
    }

    Scaffold(
        containerColor = MediCoreBackground,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            MediCoreTopBar(
                title = stringResource(R.string.receipt_viewer_title),
                subtitle = uiState.receiptDetail?.receipt?.receiptNumber ?: "Verified Receipt",
                onNavigateBack = onNavigateBack
            )
        },
        modifier = Modifier.testTag("receipt_viewer_screen")
    ) { innerPadding ->
        val detail = uiState.receiptDetail
        when {
            uiState.isLoading && detail == null -> {
                MediCoreLoadingState(message = "Loading verified receipt...", modifier = Modifier.padding(innerPadding))
            }
            uiState.errorMessage != null && detail == null -> {
                MediCoreErrorState(
                    message = uiState.errorMessage ?: "Receipt is unavailable.",
                    onRetry = { viewModel.loadReceiptDetail(paymentId) },
                    modifier = Modifier.padding(innerPadding)
                )
            }
            detail != null -> {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                ) {
                    item {
                        MediCoreCard {
                            Column(
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Verified, contentDescription = null, tint = MediCoreSuccess)
                                    Text(
                                        text = "Verified Receipt ${detail.receipt.receiptNumber}",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MediCoreSuccess,
                                        modifier = Modifier.padding(start = 8.dp)
                                    )
                                }
                                HorizontalDivider(color = MediCoreBorder)
                                ReceiptMetaLine("Hospital", detail.hospitalName)
                                ReceiptMetaLine("Invoice Number", detail.invoiceNumber)
                                ReceiptMetaLine("Amount Paid", PatientBillingRepository.formatInrFromPaise(detail.receipt.amountPaise))
                                ReceiptMetaLine("Payment Method", detail.payment.method)
                                ReceiptMetaLine("Gateway Ref", detail.payment.gatewayPaymentId ?: detail.payment.gatewayOrderId ?: "N/A")
                                ReceiptMetaLine("Issued Timestamp", detail.receipt.issuedAt)
                            }
                        }
                    }

                    if (detail.invoiceItems.isNotEmpty()) {
                        item {
                            MediCoreCard {
                                Column(
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.padding(16.dp)
                                ) {
                                    Text("Covered Invoice Items", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MediCoreTextDark)
                                    detail.invoiceItems.forEach { item ->
                                        Row(
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Text(
                                                text = "${item.description} (×${item.quantity})",
                                                fontSize = 13.sp,
                                                color = MediCoreTextDark,
                                                modifier = Modifier.weight(1f)
                                            )
                                            Text(
                                                text = PatientBillingRepository.formatInrFromPaise(item.lineTotalPaise),
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = MediCoreTextDark
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    item {
                        MediCoreButton(
                            text = "Download / Share Receipt PDF",
                            leadingIcon = Icons.Default.Download,
                            isLoading = uiState.isMutating,
                            onClick = { viewModel.shareReceiptPdf(detail.payment.id) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("download_receipt_pdf_button")
                        )
                    }
                    item { Spacer(modifier = Modifier.height(16.dp)) }
                }
            }
        }
    }
}

@Composable
private fun ReceiptMetaLine(label: String, value: String) {
    Row(
        horizontalArrangement = Arrangement.SpaceBetween,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(label, fontSize = 12.sp, color = MediCoreTextMuted)
        Text(value, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MediCoreTextDark)
    }
}
