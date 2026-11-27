package com.example.feature.billing

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.core.designsystem.components.MediCoreButton
import com.example.core.designsystem.components.MediCoreCard
import com.example.core.designsystem.components.MediCoreEmptyState
import com.example.core.designsystem.components.MediCoreErrorState
import com.example.core.designsystem.components.MediCoreLoadingState
import com.example.core.designsystem.components.MediCoreStatusBadge
import com.example.core.designsystem.components.MediCoreTopBar
import com.example.core.network.PatientInvoiceSummaryDto
import com.example.core.network.PatientPaymentDto
import com.example.data.repository.PatientBillingRepository
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCoreBorder
import com.example.ui.theme.MediCoreError
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCorePrimaryDark
import com.example.ui.theme.MediCoreSuccess
import com.example.ui.theme.MediCoreSurface
import com.example.ui.theme.MediCoreSurfaceVariant
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted
import com.example.ui.theme.MediCoreWarning

@Composable
fun BillingDashboardScreen(
    onNavigateBack: () -> Unit,
    onOpenInvoiceDetail: (String) -> Unit,
    onPayInvoice: (String) -> Unit,
    onOpenPaymentHistory: () -> Unit,
    onOpenReceipt: (String) -> Unit,
    viewModel: BillingViewModel = viewModel()
) {
    BackHandler { onNavigateBack() }
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.loadDashboard()
    }

    LaunchedEffect(uiState.feedbackMessage) {
        uiState.feedbackMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.clearFeedback()
        }
    }

    val filterOptions = listOf(
        "ALL" to "All",
        "PENDING" to "Pending",
        "OVERDUE" to "Overdue",
        "PARTIALLY_PAID" to "Partial",
        "PAID" to "Paid"
    )
    val sortOptions = listOf(
        "newest" to "Newest",
        "highest_due" to "Highest Due",
        "due_date" to "Due Date",
        "oldest" to "Oldest"
    )

    Scaffold(
        containerColor = MediCoreBackground,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            MediCoreTopBar(
                title = "Bills & Payments",
                subtitle = "Verified hospital invoices and receipts",
                onNavigateBack = onNavigateBack,
                actions = {
                    IconButton(
                        onClick = onOpenPaymentHistory,
                        modifier = Modifier.testTag("billing_history_button")
                    ) {
                        Icon(Icons.Default.History, contentDescription = "Payment history", tint = MediCorePrimary)
                    }
                    IconButton(
                        onClick = { viewModel.loadDashboard() },
                        modifier = Modifier.testTag("billing_refresh_button")
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh bills", tint = MediCorePrimary)
                    }
                }
            )
        },
        modifier = Modifier.testTag("billing_dashboard_screen")
    ) { innerPadding ->
        when {
            uiState.isLoading && uiState.invoices.isEmpty() -> {
                MediCoreLoadingState(
                    message = "Loading your hospital invoices...",
                    modifier = Modifier.padding(innerPadding)
                )
            }
            uiState.errorMessage != null && uiState.invoices.isEmpty() -> {
                MediCoreErrorState(
                    message = uiState.errorMessage ?: "Unable to load billing records.",
                    onRetry = { viewModel.loadDashboard() },
                    modifier = Modifier.padding(innerPadding)
                )
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .testTag("billing_invoices_list")
                ) {
                    // Outstanding Summary Hero Card
                    item {
                        Surface(
                            color = MediCorePrimary,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("billing_outstanding_summary_card")
                        ) {
                            Column(modifier = Modifier.padding(18.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = "Total Outstanding Due",
                                        fontSize = 13.sp,
                                        color = Color.White.copy(alpha = 0.88f)
                                    )
                                    Icon(
                                        Icons.Default.AccountBalanceWallet,
                                        contentDescription = "Billing Summary",
                                        tint = Color.White,
                                        modifier = Modifier.size(22.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = PatientBillingRepository.formatInrFromPaise(uiState.summary.totalOutstandingPaise),
                                    fontSize = 28.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                Row(
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = "Paid: ${PatientBillingRepository.formatInrFromPaise(uiState.summary.totalPaidPaise)}",
                                        fontSize = 12.sp,
                                        color = Color.White.copy(alpha = 0.9f)
                                    )
                                    Text(
                                        text = "${uiState.summary.pendingInvoiceCount} Pending • ${uiState.summary.overdueInvoiceCount} Overdue",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color.White
                                    )
                                }
                            }
                        }
                    }

                    // Search bar
                    item {
                        OutlinedTextField(
                            value = uiState.searchQuery,
                            onValueChange = { viewModel.updateSearch(it) },
                            label = { Text("Search invoice # or hospital") },
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("billing_search_input")
                        )
                    }

                    // Status filter chips
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(filterOptions) { (key, label) ->
                                FilterChip(
                                    selected = uiState.statusFilter == key,
                                    onClick = { viewModel.updateFilter(key) },
                                    label = { Text(label) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MediCorePrimary,
                                        selectedLabelColor = Color.White
                                    ),
                                    modifier = Modifier.testTag("billing_filter_${key.lowercase()}")
                                )
                            }
                        }
                    }

                    // Sort chips
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(sortOptions) { (key, label) ->
                                FilterChip(
                                    selected = uiState.sortBy == key,
                                    onClick = { viewModel.updateSort(key) },
                                    label = { Text("Sort: $label", fontSize = 12.sp) }
                                )
                            }
                        }
                    }

                    // Invoices list
                    if (uiState.invoices.isEmpty()) {
                        item {
                            MediCoreEmptyState(
                                title = "No invoices match this filter",
                                description = "Hospital bills issued to your patient account appear here once finalized.",
                                icon = Icons.AutoMirrored.Filled.ReceiptLong
                            )
                        }
                    } else {
                        item {
                            Text(
                                text = "Invoices (${uiState.invoices.size})",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = MediCoreTextDark
                            )
                        }
                        items(uiState.invoices, key = { it.id }) { invoice ->
                            PatientInvoiceCard(
                                invoice = invoice,
                                onOpenDetail = { onOpenInvoiceDetail(invoice.id) },
                                onPayNow = { onPayInvoice(invoice.id) }
                            )
                        }
                    }

                    // Recent Transactions preview
                    if (uiState.recentTransactions.isNotEmpty()) {
                        item {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "Recent Transactions",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MediCoreTextDark
                                )
                                TextButton(
                                    onClick = onOpenPaymentHistory,
                                    modifier = Modifier.testTag("billing_view_all_transactions")
                                ) {
                                    Text("View All")
                                }
                            }
                        }
                        items(uiState.recentTransactions.take(4), key = { it.id }) { tx ->
                            RecentTransactionRowCard(
                                payment = tx,
                                onOpenReceipt = {
                                    if (tx.receiptAvailable) onOpenReceipt(tx.id)
                                }
                            )
                        }
                    }

                    item { Spacer(modifier = Modifier.height(16.dp)) }
                }
            }
        }
    }
}

@Composable
private fun PatientInvoiceCard(
    invoice: PatientInvoiceSummaryDto,
    onOpenDetail: () -> Unit,
    onPayNow: () -> Unit
) {
    MediCoreCard(
        onClick = onOpenDetail,
        modifier = Modifier.testTag("invoice_card_${invoice.invoiceNumber}")
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = invoice.hospitalName.ifBlank { "Hospital Invoice" },
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = MediCoreTextDark,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "${invoice.invoiceNumber} • Issued ${invoice.invoiceDate}",
                        fontSize = 12.sp,
                        color = MediCoreTextMuted
                    )
                }
                MediCoreStatusBadge(
                    label = invoice.displayStatus.replace('_', ' '),
                    statusType = invoice.displayStatus
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column {
                    Text("Total Billed", fontSize = 11.sp, color = MediCoreTextMuted)
                    Text(
                        text = PatientBillingRepository.formatInrFromPaise(invoice.totalPaise),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MediCoreTextDark
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Balance Due", fontSize = 11.sp, color = MediCoreTextMuted)
                    Text(
                        text = PatientBillingRepository.formatInrFromPaise(invoice.balanceDuePaise),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (invoice.balanceDuePaise > 0) MediCoreError else MediCoreSuccess
                    )
                }
            }

            if (invoice.dueDate != null && invoice.balanceDuePaise > 0) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = if (invoice.isOverdue) "Overdue since ${invoice.dueDate}" else "Due by ${invoice.dueDate}",
                    fontSize = 12.sp,
                    color = if (invoice.isOverdue) MediCoreError else MediCoreWarning,
                    fontWeight = FontWeight.Medium
                )
            }

            if (invoice.balanceDuePaise > 0 && invoice.status != "VOID") {
                Spacer(modifier = Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    MediCoreButton(
                        text = "View Details",
                        isOutline = true,
                        onClick = onOpenDetail,
                        modifier = Modifier.weight(1f)
                    )
                    MediCoreButton(
                        text = "Pay Now",
                        leadingIcon = Icons.Default.Payments,
                        onClick = onPayNow,
                        modifier = Modifier
                            .weight(1f)
                            .testTag("pay_invoice_button_${invoice.id}")
                    )
                }
            }
        }
    }
}

@Composable
private fun RecentTransactionRowCard(
    payment: PatientPaymentDto,
    onOpenReceipt: () -> Unit
) {
    Surface(
        color = MediCoreSurface,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, MediCoreBorder),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = payment.receiptAvailable, onClick = onOpenReceipt)
            .testTag("recent_tx_card_${payment.id}")
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.padding(14.dp)
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = payment.hospitalName ?: payment.invoiceNumber ?: "Payment",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MediCoreTextDark,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "${payment.method} • ${payment.receiptNumber ?: payment.status}",
                    fontSize = 12.sp,
                    color = MediCoreTextMuted
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = PatientBillingRepository.formatInrFromPaise(payment.amountPaise),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCorePrimaryDark
                )
                MediCoreStatusBadge(label = payment.status, statusType = payment.status)
            }
        }
    }
}
