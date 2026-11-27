package com.example.feature.directory

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddBusiness
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.Domain
import androidx.compose.material.icons.filled.DomainVerification
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SortByAlpha
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.core.designsystem.components.MediCoreButton
import com.example.core.designsystem.components.MediCoreCard
import com.example.core.designsystem.components.MediCoreEmptyState
import com.example.core.designsystem.components.MediCoreStatusBadge
import com.example.core.designsystem.components.MediCoreTextField
import com.example.core.designsystem.components.MediCoreTopBar
import com.example.core.model.DirectoryVerificationStatus
import com.example.core.model.Hospital
import com.example.data.repository.DirectoryImportSummary
import com.example.data.repository.MediCoreEnterpriseRepository
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

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun HospitalDirectoryScreen(
    onNavigateBack: () -> Unit,
    onSelectHospitalDetail: (String) -> Unit,
    onClaimHospitalOnboarding: (Hospital) -> Unit
) {
    BackHandler { onNavigateBack() }
    val allHospitals by MediCoreEnterpriseRepository.directoryHospitals.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var ownershipFilter by remember { mutableStateOf("All") }
    var specialtyFilter by remember { mutableStateOf("All") }
    var verificationFilter by remember { mutableStateOf("All") }
    var sortAsc by remember { mutableStateOf(true) }

    val filteredHospitals = remember(
        allHospitals,
        searchQuery,
        ownershipFilter,
        specialtyFilter,
        verificationFilter,
        sortAsc
    ) {
        MediCoreEnterpriseRepository.searchDirectoryHospitals(
            query = searchQuery,
            ownershipFilter = ownershipFilter,
            specialtyFilter = specialtyFilter,
            verificationFilter = verificationFilter,
            sortAscending = sortAsc
        )
    }

    val ownershipOptions = listOf("All", "Government", "Private", "PSU", "Charitable")
    val specialtyOptions = listOf("All", "Cardiology", "Emergency", "Psychiatry", "Oncology", "Pediatrics", "Ophthalmology", "Orthopedics")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .testTag("hospital_directory_screen")
    ) {
        MediCoreTopBar(
            title = "Find Hospitals",
            subtitle = "Ranchi Healthcare Directory (${filteredHospitals.size} of ${allHospitals.size} facilities)",
            onNavigateBack = onNavigateBack,
            actions = {
                IconButton(
                    onClick = { sortAsc = !sortAsc },
                    modifier = Modifier.testTag("directory_sort_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.SortByAlpha,
                        contentDescription = "Sort A to Z",
                        tint = MediCorePrimary
                    )
                }
            }
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                MediCoreCard {
                    Column(modifier = Modifier.padding(14.dp)) {
                        MediCoreTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            label = "Search Hospitals",
                            placeholder = "Search by name, Bariatu, Kanke, PIN 834001 / 834009, or specialty...",
                            leadingIcon = Icons.Default.Search,
                            modifier = Modifier.testTag("directory_search_input")
                        )

                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "Ownership Category",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MediCoreTextDark
                        )
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState())
                                .padding(top = 4.dp)
                        ) {
                            ownershipOptions.forEach { option ->
                                val selected = ownershipFilter == option
                                FilterChip(
                                    selected = selected,
                                    onClick = { ownershipFilter = option },
                                    label = { Text(option, fontSize = 12.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MediCorePrimary,
                                        selectedLabelColor = MediCoreSurface,
                                        containerColor = MediCoreSurfaceVariant,
                                        labelColor = MediCoreTextDark
                                    )
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Clinical Specialty",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MediCoreTextDark
                        )
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState())
                                .padding(top = 4.dp)
                        ) {
                            specialtyOptions.forEach { spec ->
                                val selected = specialtyFilter == spec
                                FilterChip(
                                    selected = selected,
                                    onClick = { specialtyFilter = spec },
                                    label = { Text(spec, fontSize = 12.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MediCorePrimary,
                                        selectedLabelColor = MediCoreSurface,
                                        containerColor = MediCoreSurfaceVariant,
                                        labelColor = MediCoreTextDark
                                    )
                                )
                            }
                        }
                    }
                }
            }

            if (filteredHospitals.isEmpty()) {
                item {
                    MediCoreEmptyState(
                        title = "No hospitals found.",
                        description = "No Ranchi directory records match your current search or filter criteria.",
                        icon = Icons.Default.Domain,
                        actionLabel = "Reset Filters",
                        onActionClick = {
                            searchQuery = ""
                            ownershipFilter = "All"
                            specialtyFilter = "All"
                            verificationFilter = "All"
                        }
                    )
                }
            } else {
                items(filteredHospitals, key = { it.id }) { hospital ->
                    MediCoreCard(
                        onClick = { onSelectHospitalDetail(hospital.id) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("directory_hospital_card_${hospital.directoryCode}")
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                verticalAlignment = Alignment.Top,
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "${hospital.directoryCode} • ${hospital.ownershipType}",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MediCorePrimary
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = hospital.name,
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MediCoreTextDark
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = hospital.facilityType,
                                        fontSize = 12.sp,
                                        color = MediCoreTextMuted
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                MediCoreStatusBadge(
                                    label = hospital.verificationStatus.label,
                                    statusType = hospital.verificationStatus.name
                                )
                            }

                            Spacer(modifier = Modifier.height(10.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.LocationOn,
                                    contentDescription = "Address",
                                    tint = MediCorePrimary,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = buildString {
                                        append(hospital.address)
                                        if (!hospital.pincode.isNullOrBlank()) {
                                            append(" (PIN: ${hospital.pincode})")
                                        }
                                    },
                                    fontSize = 13.sp,
                                    color = MediCoreTextDark
                                )
                            }

                            Spacer(modifier = Modifier.height(6.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Call,
                                    contentDescription = "Phone",
                                    tint = if (hospital.primaryPhone != null) MediCorePrimary else MediCoreTextMuted,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = hospital.primaryPhone ?: "Phone not listed in public record",
                                    fontSize = 13.sp,
                                    fontWeight = if (hospital.primaryPhone != null) FontWeight.SemiBold else FontWeight.Normal,
                                    color = if (hospital.primaryPhone != null) MediCoreTextDark else MediCoreTextMuted
                                )
                            }

                            if (hospital.specialties.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(10.dp))
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    hospital.specialties.take(4).forEach { spec ->
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(MediCoreSurfaceVariant)
                                                .border(1.dp, MediCoreBorder, RoundedCornerShape(6.dp))
                                                .padding(horizontal = 8.dp, vertical = 3.dp)
                                        ) {
                                            Text(
                                                text = spec,
                                                fontSize = 11.sp,
                                                color = MediCorePrimaryDark,
                                                fontWeight = FontWeight.Medium
                                            )
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                MediCoreButton(
                                    text = "View Details",
                                    onClick = { onSelectHospitalDetail(hospital.id) },
                                    isOutline = true,
                                    modifier = Modifier.weight(1f)
                                )
                                MediCoreButton(
                                    text = "Register Hospital",
                                    onClick = { onClaimHospitalOnboarding(hospital) },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun HospitalDirectoryDetailScreen(
    hospitalId: String,
    onNavigateBack: () -> Unit,
    onRegisterHospitalClaim: (Hospital) -> Unit
) {
    BackHandler { onNavigateBack() }
    val context = LocalContext.current
    val allHospitals by MediCoreEnterpriseRepository.directoryHospitals.collectAsState()
    val hospital = remember(allHospitals, hospitalId) {
        MediCoreEnterpriseRepository.getHospitalByIdOrCode(hospitalId) ?: allHospitals.first()
    }

    var showReportDialog by remember { mutableStateOf(false) }
    var reporterEmail by remember { mutableStateOf("") }
    var issueDesc by remember { mutableStateOf("") }
    var suggestedFix by remember { mutableStateOf("") }
    var reportSubmittedBanner by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .testTag("hospital_directory_detail_screen")
    ) {
        MediCoreTopBar(
            title = hospital.name,
            subtitle = "${hospital.directoryCode} • ${hospital.city}, ${hospital.state}",
            onNavigateBack = onNavigateBack
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            if (hospital.verificationStatus != DirectoryVerificationStatus.VERIFIED) {
                item {
                    MediCoreCard(
                        containerColor = Color(0xFFFFFBEB),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFDE68A))
                    ) {
                        Row(
                            verticalAlignment = Alignment.Top,
                            modifier = Modifier.padding(14.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.WarningAmber,
                                contentDescription = "Unverified directory notice",
                                tint = MediCoreWarning,
                                modifier = Modifier.size(22.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "Public Directory Listing Notice",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MediCoreTextDark
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "This hospital listing comes from public directory records and has not yet been verified by MediCore or claimed by the hospital.",
                                    fontSize = 12.sp,
                                    color = MediCoreTextDark
                                )
                            }
                        }
                    }
                }
            }

            if (reportSubmittedBanner != null) {
                item {
                    MediCoreCard(containerColor = Color(0xFFECFDF5)) {
                        Text(
                            text = reportSubmittedBanner!!,
                            color = MediCoreSuccess,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }
            }

            item {
                MediCoreCard {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "Facility Identity & Location",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = MediCorePrimary
                            )
                            MediCoreStatusBadge(
                                label = hospital.verificationStatus.label,
                                statusType = hospital.verificationStatus.name
                            )
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        DetailFieldRow("Directory Code", hospital.directoryCode)
                        DetailFieldRow("Legal Name", hospital.legalName)
                        DetailFieldRow("Facility Type", hospital.facilityType)
                        DetailFieldRow("Ownership Type", hospital.ownershipType)
                        DetailFieldRow("Address", hospital.address)
                        DetailFieldRow("City / District / State", "${hospital.city}, ${hospital.district}, ${hospital.state}")
                        DetailFieldRow("PIN Code", hospital.pincode ?: "Not listed in public record")
                        DetailFieldRow(
                            "Emergency Services",
                            when (hospital.emergencyAvailable) {
                                true -> "Available (24x7 Emergency / Trauma)"
                                false -> "Outpatient / Scheduled Specialty Facility (No 24x7 ER confirmed)"
                                null -> "Not confirmed in cited public source"
                            }
                        )
                    }
                }
            }

            item {
                MediCoreCard {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Contact & Source Attribution",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = MediCorePrimary
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        DetailFieldRow("Primary Phone", hospital.primaryPhone ?: "null (Requires verification)")
                        DetailFieldRow("Secondary Phone", hospital.secondaryPhone ?: "null")
                        DetailFieldRow("Official Email", hospital.email ?: "null (Requires verification)")
                        DetailFieldRow("Website", hospital.website ?: "null")
                        DetailFieldRow("Data Status Note", hospital.dataStatus)
                        DetailFieldRow("Source Name", hospital.sourceName)
                        DetailFieldRow("Source URL", hospital.sourceUrl)
                        DetailFieldRow("Last Verified Date", hospital.lastVerifiedAt ?: "Pending Super Admin Verification")
                    }
                }
            }

            item {
                MediCoreCard {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Specialties & Clinical Departments",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = MediCorePrimary
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            hospital.specialties.forEach { spec ->
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(MediCoreSurfaceVariant)
                                        .border(1.dp, MediCoreBorder, RoundedCornerShape(8.dp))
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = spec,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MediCorePrimaryDark
                                    )
                                }
                            }
                        }
                    }
                }
            }

            item {
                MediCoreCard {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = "Available Actions",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = MediCorePrimary
                        )

                        // Conditional Call Button: ONLY shown when phone exists
                        if (!hospital.primaryPhone.isNullOrBlank()) {
                            MediCoreButton(
                                text = "Call Hospital (${hospital.primaryPhone})",
                                leadingIcon = Icons.Default.Call,
                                onClick = {
                                    runCatching {
                                        val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${hospital.primaryPhone}"))
                                        context.startActivity(intent)
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("action_call_hospital")
                            )
                        }

                        // Conditional Website Button: ONLY shown when website exists
                        if (!hospital.website.isNullOrBlank()) {
                            MediCoreButton(
                                text = "Open Official Website",
                                leadingIcon = Icons.Default.Language,
                                isOutline = true,
                                onClick = {
                                    runCatching {
                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(hospital.website))
                                        context.startActivity(intent)
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("action_open_website")
                            )
                        }

                        MediCoreButton(
                            text = "Open in Google Maps",
                            leadingIcon = Icons.Default.LocationOn,
                            isOutline = true,
                            onClick = {
                                runCatching {
                                    val query = Uri.encode("${hospital.name}, ${hospital.address}")
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=$query"))
                                    context.startActivity(intent)
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("action_open_maps")
                        )

                        MediCoreButton(
                            text = "Register This Hospital (Claim Tenant)",
                            leadingIcon = Icons.Default.DomainVerification,
                            onClick = { onRegisterHospitalClaim(hospital) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("action_register_hospital_claim")
                        )

                        MediCoreButton(
                            text = "Report Incorrect Information",
                            leadingIcon = Icons.Default.Flag,
                            isOutline = true,
                            onClick = { showReportDialog = true },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("action_report_incorrect_info")
                        )
                    }
                }
            }
        }
    }

    if (showReportDialog) {
        AlertDialog(
            onDismissRequest = { showReportDialog = false },
            containerColor = MediCoreSurface,
            title = {
                Text(
                    text = "Report Directory Correction",
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextDark
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    MediCoreTextField(
                        value = reporterEmail,
                        onValueChange = { reporterEmail = it },
                        label = "Your Contact Email",
                        placeholder = "admin@hospital.org"
                    )
                    MediCoreTextField(
                        value = issueDesc,
                        onValueChange = { issueDesc = it },
                        label = "What needs correction?",
                        placeholder = "e.g., Updated reception landline or email"
                    )
                    MediCoreTextField(
                        value = suggestedFix,
                        onValueChange = { suggestedFix = it },
                        label = "Verified Replacement Value",
                        placeholder = "+91-651-XXXXXXX"
                    )
                }
            },
            confirmButton = {
                MediCoreButton(
                    text = "Submit Report",
                    onClick = {
                        if (issueDesc.isNotBlank()) {
                            val rpt = MediCoreEnterpriseRepository.reportDirectoryIssue(
                                hospitalId = hospital.id,
                                reporterEmail = reporterEmail.ifBlank { "visitor@medicore.org" },
                                issueDescription = issueDesc,
                                suggestedCorrection = suggestedFix
                            )
                            reportSubmittedBanner = "Issue report ${rpt.id} logged for Super Admin verification."
                            showReportDialog = false
                            issueDesc = ""
                            suggestedFix = ""
                        }
                    }
                )
            },
            dismissButton = {
                TextButton(onClick = { showReportDialog = false }) {
                    Text("Cancel", color = MediCorePrimary)
                }
            }
        )
    }
}

@Composable
fun AdminHospitalDirectoryScreen(
    onNavigateBack: () -> Unit,
    onSelectHospitalDetail: (String) -> Unit
) {
    BackHandler { onNavigateBack() }
    val allHospitals by MediCoreEnterpriseRepository.directoryHospitals.collectAsState()
    val reportedIssues by MediCoreEnterpriseRepository.directoryIssues.collectAsState()

    var statusFilter by remember { mutableStateOf("All") }
    var searchQuery by remember { mutableStateOf("") }
    var importSummary by remember { mutableStateOf<DirectoryImportSummary?>(null) }
    var pendingConfirmHospital by remember { mutableStateOf<Pair<Hospital, DirectoryVerificationStatus>?>(null) }
    var showAddHospitalDialog by remember { mutableStateOf(false) }

    var newHospName by remember { mutableStateOf("") }
    var newHospAddress by remember { mutableStateOf("") }
    var newHospPin by remember { mutableStateOf("834001") }
    var newHospPhone by remember { mutableStateOf("") }

    val filtered = remember(allHospitals, statusFilter, searchQuery) {
        MediCoreEnterpriseRepository.searchDirectoryHospitals(
            query = searchQuery,
            verificationFilter = statusFilter
        )
    }

    val verifiedCount = allHospitals.count { it.verificationStatus == DirectoryVerificationStatus.VERIFIED }
    val pendingCount = allHospitals.count { it.verificationStatus == DirectoryVerificationStatus.PENDING_VERIFICATION }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .testTag("admin_hospital_directory_screen")
    ) {
        MediCoreTopBar(
            title = "Super Admin Directory Governance",
            subtitle = "${allHospitals.size} Ranchi Records • $verifiedCount Verified • $pendingCount Pending",
            onNavigateBack = onNavigateBack
        )

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                MediCoreCard {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = "Ranchi Hospital Directory Dataset Importer",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = MediCorePrimary
                        )
                        Text(
                            text = "Idempotent JSON/CSV import of RNC001–RNC025. Preserves admin-verified records and never invents missing phone/email values.",
                            fontSize = 12.sp,
                            color = MediCoreTextMuted
                        )
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            MediCoreButton(
                                text = "Sync 25 Ranchi Records",
                                leadingIcon = Icons.Default.CloudDownload,
                                onClick = {
                                    importSummary = MediCoreEnterpriseRepository.importRanchiDirectoryDataset()
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("btn_sync_ranchi_directory")
                            )
                            MediCoreButton(
                                text = "Add Facility",
                                leadingIcon = Icons.Default.AddBusiness,
                                isOutline = true,
                                onClick = { showAddHospitalDialog = true },
                                modifier = Modifier.weight(1f)
                            )
                        }

                        if (importSummary != null) {
                            val s = importSummary!!
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(MediCoreSurfaceVariant)
                                    .border(1.dp, MediCoreBorder, RoundedCornerShape(8.dp))
                                    .padding(10.dp)
                            ) {
                                Text(
                                    text = "Import Complete • Input: ${s.totalInputRecords} | New: ${s.importedCount} | Updated: ${s.updatedCount} | Duplicates Skipped: ${s.skippedDuplicatesCount} | Partial Contact Records: ${s.incompleteRecordsCount}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MediCorePrimaryDark
                                )
                            }
                        }
                    }
                }
            }

            if (reportedIssues.isNotEmpty()) {
                item {
                    MediCoreCard {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "Reported Directory Corrections (${reportedIssues.size})",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = MediCorePrimary
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            reportedIssues.forEach { rpt ->
                                Text(
                                    text = "• ${rpt.hospitalName}: ${rpt.issueDescription} (Suggested: ${rpt.suggestedCorrection})",
                                    fontSize = 12.sp,
                                    color = MediCoreTextDark
                                )
                            }
                        }
                    }
                }
            }

            item {
                MediCoreCard {
                    Column(modifier = Modifier.padding(14.dp)) {
                        MediCoreTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            label = "Filter Directory Records",
                            placeholder = "Search code (RNC001), name, PIN code...",
                            leadingIcon = Icons.Default.Search
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.horizontalScroll(rememberScrollState())
                        ) {
                            listOf("All", "PENDING_VERIFICATION", "UNDER_REVIEW", "VERIFIED", "REJECTED", "SUSPENDED").forEach { st ->
                                FilterChip(
                                    selected = statusFilter == st,
                                    onClick = { statusFilter = st },
                                    label = { Text(st.replace('_', ' '), fontSize = 11.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MediCorePrimary,
                                        selectedLabelColor = MediCoreSurface,
                                        containerColor = MediCoreSurfaceVariant
                                    )
                                )
                            }
                        }
                    }
                }
            }

            items(filtered, key = { it.id }) { hosp ->
                MediCoreCard {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${hosp.directoryCode} • ${hosp.name}",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MediCoreTextDark
                                )
                                Text(
                                    text = "${hosp.facilityType} (${hosp.ownershipType})",
                                    fontSize = 12.sp,
                                    color = MediCoreTextMuted
                                )
                                Text(
                                    text = "Phone: ${hosp.primaryPhone ?: "null"} | Email: ${hosp.email ?: "null"}",
                                    fontSize = 12.sp,
                                    color = MediCoreTextDark
                                )
                            }
                            MediCoreStatusBadge(
                                label = hosp.verificationStatus.label,
                                statusType = hosp.verificationStatus.name
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            MediCoreButton(
                                text = "Verify",
                                leadingIcon = Icons.Default.VerifiedUser,
                                onClick = {
                                    pendingConfirmHospital = hosp to DirectoryVerificationStatus.VERIFIED
                                },
                                modifier = Modifier.weight(1f)
                            )
                            MediCoreButton(
                                text = "Reject",
                                isOutline = true,
                                onClick = {
                                    pendingConfirmHospital = hosp to DirectoryVerificationStatus.REJECTED
                                },
                                modifier = Modifier.weight(1f)
                            )
                            MediCoreButton(
                                text = "Details",
                                isOutline = true,
                                onClick = { onSelectHospitalDetail(hosp.id) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
        }
    }

    if (pendingConfirmHospital != null) {
        val (targetHosp, targetStatus) = pendingConfirmHospital!!
        AlertDialog(
            onDismissRequest = { pendingConfirmHospital = null },
            containerColor = MediCoreSurface,
            title = {
                Text(
                    text = "Confirm Directory Action",
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextDark
                )
            },
            text = {
                Text(
                    text = "Are you sure you want to mark ${targetHosp.name} (${targetHosp.directoryCode}) as ${targetStatus.label}?",
                    color = MediCoreTextDark,
                    fontSize = 14.sp
                )
            },
            confirmButton = {
                MediCoreButton(
                    text = "Confirm",
                    onClick = {
                        if (targetStatus == DirectoryVerificationStatus.VERIFIED) {
                            MediCoreEnterpriseRepository.verifyHospitalDirectoryRecord(targetHosp.id)
                        } else {
                            MediCoreEnterpriseRepository.updateHospitalVerificationStatus(targetHosp.id, targetStatus)
                        }
                        pendingConfirmHospital = null
                    }
                )
            },
            dismissButton = {
                TextButton(onClick = { pendingConfirmHospital = null }) {
                    Text("Cancel", color = MediCorePrimary)
                }
            }
        )
    }

    if (showAddHospitalDialog) {
        AlertDialog(
            onDismissRequest = { showAddHospitalDialog = false },
            containerColor = MediCoreSurface,
            title = {
                Text("Add Ranchi Directory Facility", fontWeight = FontWeight.Bold, color = MediCoreTextDark)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    MediCoreTextField(value = newHospName, onValueChange = { newHospName = it }, label = "Hospital Name")
                    MediCoreTextField(value = newHospAddress, onValueChange = { newHospAddress = it }, label = "Address in Ranchi")
                    MediCoreTextField(value = newHospPin, onValueChange = { newHospPin = it }, label = "PIN Code")
                    MediCoreTextField(value = newHospPhone, onValueChange = { newHospPhone = it }, label = "Primary Phone (Optional)")
                }
            },
            confirmButton = {
                MediCoreButton(
                    text = "Save Record",
                    onClick = {
                        if (newHospName.isNotBlank() && newHospAddress.isNotBlank()) {
                            MediCoreEnterpriseRepository.addHospitalToDirectory(
                                name = newHospName,
                                facilityType = "Multi-Specialty Hospital",
                                ownershipType = "Private",
                                address = newHospAddress,
                                pincode = newHospPin,
                                primaryPhone = newHospPhone.takeIf { it.isNotBlank() },
                                email = null,
                                website = null,
                                specialties = listOf("General Medicine")
                            )
                            newHospName = ""
                            newHospAddress = ""
                            newHospPhone = ""
                            showAddHospitalDialog = false
                        }
                    }
                )
            },
            dismissButton = {
                TextButton(onClick = { showAddHospitalDialog = false }) {
                    Text("Cancel", color = MediCorePrimary)
                }
            }
        )
    }
}

@Composable
private fun DetailFieldRow(label: String, value: String) {
    Row(
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = MediCoreTextMuted,
            modifier = Modifier.width(135.dp)
        )
        Text(
            text = value,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = MediCoreTextDark,
            modifier = Modifier.weight(1f)
        )
    }
}
