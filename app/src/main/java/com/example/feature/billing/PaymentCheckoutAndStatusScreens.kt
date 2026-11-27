package com.example.feature.billing

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
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
import com.example.ui.theme.MediCoreError
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCoreSuccess
import com.example.ui.theme.MediCoreSurfaceVariant
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted
import com.example.ui.theme.MediCoreWarning

@Composable
fun PaymentCheckoutScreen(
    invoiceId: String,
    onNavigateBack: () -> Unit,
    onOrderVerifiedOrUpdated: (String) -> Unit,
    viewModel: BillingViewModel = viewModel()
) {
    BackHandler { onNavigateBack() }
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(invoiceId) {
        viewModel.loadInvoiceDetail(invoiceId)
    }

    val invoice = uiState.selectedInvoice
    var isPartialMode by remember { mutableStateOf(false) }
    var partialAmountRupees by remember { mutableStateOf("") }
    var selectedMethod by remember { mutableStateOf("UPI") }
    var methodDetail by remember { mutableStateOf("") }
    var gatewayPaymentIdInput by remember { mutableStateOf("") }
    var gatewaySignatureInput by remember { mutableStateOf("") }
    var validationError by remember { mutableStateOf<String?>(null) }

    val methods = listOf(
        "UPI" to Icons.Default.QrCode2,
        "CARD" to Icons.Default.CreditCard,
        "NET_BANKING" to Icons.Default.AccountBalance
    )

    Scaffold(
        containerColor = MediCoreBackground,
        topBar = {
            MediCoreTopBar(
                title = stringResource(R.string.payment_checkout_title),
                subtitle = invoice?.invoiceNumber ?: "Prepare Payment",
                onNavigateBack = onNavigateBack
            )
        },
        modifier = Modifier.testTag("payment_checkout_screen")
    ) { innerPadding ->
        when {
            uiState.isLoading && invoice == null -> {
                MediCoreLoadingState(message = "Loading checkout details...", modifier = Modifier.padding(innerPadding))
            }
            invoice == null -> {
                MediCoreErrorState(
                    message = uiState.errorMessage ?: "Invoice not found.",
                    onRetry = { viewModel.loadInvoiceDetail(invoiceId) },
                    modifier = Modifier.padding(innerPadding)
                )
            }
            else -> {
                val activeOrder = uiState.activeOrder?.takeIf { it.payment.invoiceId == invoice.id }
                Column(
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp)
                ) {
                    MediCoreCard {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(invoice.hospitalName, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = MediCoreTextDark)
                            Text("Invoice: ${invoice.invoiceNumber}", fontSize = 12.sp, color = MediCoreTextMuted)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Balance Due: ${PatientBillingRepository.formatInrFromPaise(invoice.balanceDuePaise)}",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = MediCorePrimary
                            )
                        }
                    }

                    if (activeOrder == null) {
                        // Step 1: Configure Amount + Method and Create Server Gateway Order
                        MediCoreCard {
                            Column(
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Text("Payment Amount", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MediCoreTextDark)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    FilterChip(
                                        selected = !isPartialMode,
                                        onClick = { isPartialMode = false },
                                        label = { Text("Full Balance") }
                                    )
                                    FilterChip(
                                        selected = isPartialMode,
                                        onClick = { isPartialMode = true },
                                        label = { Text("Partial Amount") }
                                    )
                                }
                                if (isPartialMode) {
                                    OutlinedTextField(
                                        value = partialAmountRupees,
                                        onValueChange = { partialAmountRupees = it },
                                        label = { Text("Amount in INR (e.g. 500.00)") },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                        singleLine = true,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .testTag("partial_amount_input")
                                    )
                                }

                                Text("Payment Method", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MediCoreTextDark)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    methods.forEach { (code, icon) ->
                                        FilterChip(
                                            selected = selectedMethod == code,
                                            onClick = { selectedMethod = code },
                                            leadingIcon = { Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp)) },
                                            label = { Text(code.replace('_', ' ')) },
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = MediCorePrimary,
                                                selectedLabelColor = Color.White,
                                                selectedLeadingIconColor = Color.White
                                            ),
                                            modifier = Modifier.testTag("payment_method_${code.lowercase()}")
                                        )
                                    }
                                }

                                OutlinedTextField(
                                    value = methodDetail,
                                    onValueChange = { methodDetail = it },
                                    label = { Text("Optional UPI ID / Bank Note") },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth()
                                )

                                (validationError ?: uiState.errorMessage)?.let { err ->
                                    Text(text = err, color = MediCoreError, fontSize = 12.sp)
                                }

                                MediCoreButton(
                                    text = "Create Secure Payment Order",
                                    isLoading = uiState.isMutating,
                                    leadingIcon = Icons.Default.Payments,
                                    onClick = {
                                        val amountPaise: Long? = if (isPartialMode) {
                                            val parsed = PatientBillingRepository.parseRupeesToPaise(partialAmountRupees)
                                            if (parsed == null || parsed > invoice.balanceDuePaise) {
                                                validationError = "Enter an amount between ₹0.01 and ${PatientBillingRepository.formatInrFromPaise(invoice.balanceDuePaise)}."
                                                return@MediCoreButton
                                            }
                                            parsed
                                        } else null
                                        validationError = null
                                        viewModel.initiatePaymentOrder(
                                            invoiceId = invoice.id,
                                            amountPaise = amountPaise,
                                            method = selectedMethod,
                                            methodDetail = methodDetail
                                        ) { _ -> }
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .testTag("create_payment_order_button")
                                )
                            }
                        }
                    } else {
                        // Step 2: Active Gateway Order Created — Verify Gateway Callback or Cancel
                        MediCoreCard {
                            Column(
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = "Gateway Order Ready (${activeOrder.gatewayOrder.mode.uppercase()})",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MediCoreTextDark
                                    )
                                    MediCoreStatusBadge(label = activeOrder.payment.status, statusType = activeOrder.payment.status)
                                }
                                Text(
                                    text = "Order ID: ${activeOrder.gatewayOrder.gatewayOrderId}",
                                    fontSize = 12.sp,
                                    color = MediCoreTextMuted
                                )
                                Text(
                                    text = "Payable: ${PatientBillingRepository.formatInrFromPaise(activeOrder.payment.amountPaise)}",
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MediCorePrimary
                                )

                                Surface(
                                    color = MediCoreSurfaceVariant,
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(12.dp)
                                    ) {
                                        Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = MediCorePrimary)
                                        Text(
                                            text = "Receipts are generated strictly after server-side cryptographic signature verification.",
                                            fontSize = 12.sp,
                                            color = MediCoreTextDark,
                                            modifier = Modifier.padding(start = 10.dp)
                                        )
                                    }
                                }

                                OutlinedTextField(
                                    value = gatewayPaymentIdInput,
                                    onValueChange = { gatewayPaymentIdInput = it },
                                    label = { Text("Gateway Payment ID (from Razorpay callback)") },
                                    singleLine = true,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .testTag("gateway_payment_id_input")
                                )
                                OutlinedTextField(
                                    value = gatewaySignatureInput,
                                    onValueChange = { gatewaySignatureInput = it },
                                    label = { Text("Gateway HMAC Signature") },
                                    singleLine = true,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .testTag("gateway_signature_input")
                                )

                                uiState.errorMessage?.let { err ->
                                    Text(text = err, color = MediCoreError, fontSize = 12.sp)
                                }

                                MediCoreButton(
                                    text = "Verify Payment with Server",
                                    isLoading = uiState.isMutating,
                                    leadingIcon = Icons.Default.CheckCircle,
                                    onClick = {
                                        viewModel.verifyPaymentWithGateway(
                                            paymentId = activeOrder.payment.id,
                                            gatewayOrderId = activeOrder.gatewayOrder.gatewayOrderId,
                                            gatewayPaymentId = gatewayPaymentIdInput.trim(),
                                            gatewaySignature = gatewaySignatureInput.trim(),
                                            onCompleted = { onOrderVerifiedOrUpdated(activeOrder.payment.id) }
                                        )
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .testTag("verify_payment_button")
                                )

                                MediCoreButton(
                                    text = "Cancel Order",
                                    isOutline = true,
                                    isLoading = uiState.isMutating,
                                    containerColor = MediCoreError,
                                    onClick = {
                                        viewModel.cancelActivePayment(
                                            paymentId = activeOrder.payment.id,
                                            outcome = "CANCELLED",
                                            reason = "Cancelled by patient before gateway confirmation",
                                            onDone = { onOrderVerifiedOrUpdated(activeOrder.payment.id) }
                                        )
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .testTag("cancel_payment_order_button")
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PaymentStatusScreen(
    paymentId: String,
    onNavigateBack: () -> Unit,
    onOpenReceipt: (String) -> Unit,
    onRetryInvoicePayment: (String) -> Unit,
    viewModel: BillingViewModel = viewModel()
) {
    BackHandler { onNavigateBack() }
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(paymentId) {
        viewModel.loadPaymentStatus(paymentId)
    }

    Scaffold(
        containerColor = MediCoreBackground,
        topBar = {
            MediCoreTopBar(
                title = stringResource(R.string.payment_status_title),
                subtitle = "Server verification outcome",
                onNavigateBack = onNavigateBack
            )
        },
        modifier = Modifier.testTag("payment_status_screen")
    ) { innerPadding ->
        val status = uiState.paymentStatus
        when {
            uiState.isLoading && status == null -> {
                MediCoreLoadingState(message = "Checking payment status...", modifier = Modifier.padding(innerPadding))
            }
            uiState.errorMessage != null && status == null -> {
                MediCoreErrorState(
                    message = uiState.errorMessage ?: "Unable to verify payment state.",
                    onRetry = { viewModel.loadPaymentStatus(paymentId) },
                    modifier = Modifier.padding(innerPadding)
                )
            }
            status != null -> {
                val (icon, tint, heading) = when (status.status) {
                    "SUCCESS", "CAPTURED" -> Triple(Icons.Default.CheckCircle, MediCoreSuccess, "Payment Verified & Confirmed")
                    "FAILED" -> Triple(Icons.Default.ErrorOutline, MediCoreError, "Payment Failed")
                    "CANCELLED" -> Triple(Icons.Default.Cancel, MediCoreWarning, "Payment Cancelled")
                    else -> Triple(Icons.Default.HourglassTop, MediCoreWarning, "Awaiting Gateway Confirmation")
                }

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .padding(20.dp)
                ) {
                    Icon(icon, contentDescription = heading, tint = tint, modifier = Modifier.size(64.dp))
                    Text(heading, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = MediCoreTextDark)
                    Text(
                        text = PatientBillingRepository.formatInrFromPaise(status.amountPaise),
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = tint
                    )

                    MediCoreCard {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(16.dp)) {
                            Text("Hospital: ${status.hospitalName ?: "MediCore Partner"}", fontSize = 13.sp, color = MediCoreTextDark)
                            Text("Invoice: ${status.invoiceNumber ?: status.invoiceId}", fontSize = 13.sp, color = MediCoreTextMuted)
                            Text("Method: ${status.method}", fontSize = 13.sp, color = MediCoreTextMuted)
                            status.receiptNumber?.let { rcp ->
                                Text("Receipt #: $rcp", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MediCoreSuccess)
                            }
                            status.failureReason?.let { reason ->
                                Text("Details: $reason", fontSize = 12.sp, color = MediCoreError)
                            }
                        }
                    }

                    if (status.receiptAvailable) {
                        MediCoreButton(
                            text = "View Verified Receipt",
                            leadingIcon = Icons.Default.Receipt,
                            onClick = { onOpenReceipt(status.id) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("status_view_receipt_button")
                        )
                    } else if (status.status == "FAILED" || status.status == "CANCELLED") {
                        MediCoreButton(
                            text = "Retry Payment",
                            leadingIcon = Icons.Default.Payments,
                            onClick = { onRetryInvoicePayment(status.invoiceId) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("status_retry_payment_button")
                        )
                    } else {
                        MediCoreButton(
                            text = "Refresh Status",
                            isOutline = true,
                            onClick = { viewModel.loadPaymentStatus(paymentId) },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}
