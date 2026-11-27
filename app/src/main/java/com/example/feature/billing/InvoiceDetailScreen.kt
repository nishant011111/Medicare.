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
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.R
import com.example.core.designsystem.components.MediCoreButton
import com.example.core.designsystem.components.MediCoreCard
import com.example.core.designsystem.components.MediCoreErrorState
import com.example.core.designsystem.components.MediCoreLoadingState
import com.example.core.designsystem.components.MediCoreStatusBadge
import com.example.core.designsystem.components.MediCoreTopBar
import com.example.data.repository.PatientBillingRepository
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCoreBorder
import com.example.ui.theme.MediCoreError
import com.example.ui.theme.MediCorePrimaryDark
import com.example.ui.theme.MediCoreSuccess
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted

@Composable
fun InvoiceDetailScreen(
    invoiceId: String,
    onNavigateBack: () -> Unit,
    onPayInvoice: (String) -> Unit,
    onOpenReceipt: (String) -> Unit,
    viewModel: BillingViewModel = viewModel()
) {
    BackHandler { onNavigateBack() }
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(invoiceId) {
        viewModel.loadInvoiceDetail(invoiceId)
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
                title = uiState.selectedInvoice?.invoiceNumber ?: stringResource(R.string.invoice_detail_title),
                subtitle = uiState.selectedInvoice?.hospitalName,
                onNavigateBack = onNavigateBack
            )
        },
        modifier = Modifier.testTag("invoice_detail_screen")
    ) { innerPadding ->
        val invoice = uiState.selectedInvoice
        when {
            uiState.isLoading && invoice == null -> {
                MediCoreLoadingState(
                    message = "Loading itemized invoice...",
                    modifier = Modifier.padding(innerPadding)
                )
            }
            uiState.errorMessage != null && invoice == null -> {
                MediCoreErrorState(
                    message = uiState.errorMessage ?: "Unable to load invoice.",
                    onRetry = { viewModel.loadInvoiceDetail(invoiceId) },
                    modifier = Modifier.padding(innerPadding)
                )
            }
            invoice != null -> {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                ) {
                    // Header Summary Card
                    item {
                        MediCoreCard {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = invoice.hospitalName,
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MediCoreTextDark,
                                        modifier = Modifier.weight(1f)
                                    )
                                    MediCoreStatusBadge(
                                        label = invoice.displayStatus.replace('_', ' '),
                                        statusType = invoice.displayStatus
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "Invoice #: ${invoice.invoiceNumber}",
                                    fontSize = 13.sp,
                                    color = MediCoreTextMuted
                                )
                                Text(
                                    text = "Issued: ${invoice.invoiceDate}" +
                                        (invoice.dueDate?.let { " • Due: $it" } ?: ""),
                                    fontSize = 12.sp,
                                    color = if (invoice.isOverdue) MediCoreError else MediCoreTextMuted
                                )
                                invoice.notes?.takeIf { it.isNotBlank() }?.let { note ->
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(text = note, fontSize = 12.sp, color = MediCoreTextMuted)
                                }
                            }
                        }
                    }

                    // Line Items
                    item {
                        MediCoreCard {
                            Column(
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Text(
                                    text = "Itemized Hospital Charges",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MediCoreTextDark
                                )
                                invoice.items.forEach { item ->
                                    Row(
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = item.description,
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Medium,
                                                color = MediCoreTextDark
                                            )
                                            Text(
                                                text = "${item.serviceCategory} • Qty ${item.quantity} × ${PatientBillingRepository.formatInrFromPaise(item.unitPricePaise)} (Tax ${item.taxRatePercent}%)",
                                                fontSize = 12.sp,
                                                color = MediCoreTextMuted
                                            )
                                        }
                                        Text(
                                            text = PatientBillingRepository.formatInrFromPaise(item.lineTotalPaise),
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = MediCoreTextDark
                                        )
                                    }
                                    HorizontalDivider(color = MediCoreBorder)
                                }

                                AmountSummaryRow("Subtotal", PatientBillingRepository.formatInrFromPaise(invoice.subtotalPaise))
                                AmountSummaryRow("Discount", "-${PatientBillingRepository.formatInrFromPaise(invoice.discountPaise)}")
                                AmountSummaryRow("Taxes (GST)", PatientBillingRepository.formatInrFromPaise(invoice.taxPaise))
                                if (invoice.creditNotePaise > 0L) {
                                    AmountSummaryRow("Credit Notes", "-${PatientBillingRepository.formatInrFromPaise(invoice.creditNotePaise)}")
                                }
                                AmountSummaryRow("Total Billed", PatientBillingRepository.formatInrFromPaise(invoice.totalPaise), bold = true)
                                AmountSummaryRow("Paid to Date", PatientBillingRepository.formatInrFromPaise(invoice.paidPaise))
                                Row(
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Balance Due", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = MediCoreTextDark)
                                    Text(
                                        text = PatientBillingRepository.formatInrFromPaise(invoice.balanceDuePaise),
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (invoice.balanceDuePaise > 0) MediCoreError else MediCoreSuccess
                                    )
                                }
                            }
                        }
                    }

                    // Primary actions
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            if (invoice.balanceDuePaise > 0L && invoice.status != "VOID") {
                                MediCoreButton(
                                    text = "Proceed to Payment (${PatientBillingRepository.formatInrFromPaise(invoice.balanceDuePaise)})",
                                    leadingIcon = Icons.Default.Payments,
                                    onClick = { onPayInvoice(invoice.id) },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .testTag("invoice_detail_pay_button")
                                )
                            }
                            MediCoreButton(
                                text = "Download Invoice PDF",
                                isOutline = true,
                                isLoading = uiState.isMutating,
                                leadingIcon = Icons.Default.Download,
                                onClick = { viewModel.shareInvoicePdf(invoice.id) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("invoice_download_pdf_button")
                            )
                        }
                    }

                    // Invoice Payments & Verified Receipts
                    if (invoice.payments.isNotEmpty()) {
                        item {
                            Text(
                                text = "Payment Transactions (${invoice.payments.size})",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = MediCoreTextDark
                            )
                        }
                        items(invoice.payments, key = { it.id }) { pay ->
                            MediCoreCard {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp)
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "${pay.method} • ${PatientBillingRepository.formatInrFromPaise(pay.amountPaise)}",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = MediCoreTextDark
                                        )
                                        Text(
                                            text = pay.receiptNumber?.let { "Receipt: $it" } ?: "Status: ${pay.status}",
                                            fontSize = 12.sp,
                                            color = MediCoreTextMuted
                                        )
                                    }
                                    if (pay.receiptAvailable) {
                                        MediCoreButton(
                                            text = "Receipt",
                                            isOutline = true,
                                            leadingIcon = Icons.Default.Receipt,
                                            onClick = { onOpenReceipt(pay.id) },
                                            modifier = Modifier.testTag("view_receipt_button_${pay.id}")
                                        )
                                    } else {
                                        MediCoreStatusBadge(label = pay.status, statusType = pay.status)
                                    }
                                }
                            }
                        }
                    }

                    item { Spacer(modifier = Modifier.height(16.dp)) }
                }
            }
        }
    }
}

@Composable
private fun AmountSummaryRow(label: String, value: String, bold: Boolean = false) {
    Row(
        horizontalArrangement = Arrangement.SpaceBetween,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text = label,
            fontSize = 13.sp,
            fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal,
            color = if (bold) MediCoreTextDark else MediCoreTextMuted
        )
        Text(
            text = value,
            fontSize = 13.sp,
            fontWeight = if (bold) FontWeight.Bold else FontWeight.Medium,
            color = if (bold) MediCorePrimaryDark else MediCoreTextDark
        )
    }
}
