package com.example.core.model

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Biotech
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.Medication
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.SupervisorAccount
import androidx.compose.ui.graphics.vector.ImageVector

enum class UserRole(
    val title: String,
    val subtitle: String,
    val icon: ImageVector,
    val badgeColorHex: Long
) {
    PATIENT(
        title = "Patient",
        subtitle = "Personal Health & Directory",
        icon = Icons.Default.Person,
        badgeColorHex = 0xFF0878D1
    ),
    DOCTOR(
        title = "Doctor",
        subtitle = "Clinical Encounters & EHR",
        icon = Icons.Default.MedicalServices,
        badgeColorHex = 0xFF123B63
    ),
    NURSE(
        title = "Nurse",
        subtitle = "Patient Vitals & IPD Care",
        icon = Icons.Default.LocalHospital,
        badgeColorHex = 0xFF0284C7
    ),
    RECEPTIONIST(
        title = "Receptionist",
        subtitle = "OPD Registration & Queue",
        icon = Icons.Default.Badge,
        badgeColorHex = 0xFF0D9488
    ),
    PHARMACIST(
        title = "Pharmacist",
        subtitle = "Batch Dispensing & Stock",
        icon = Icons.Default.Medication,
        badgeColorHex = 0xFF0369A1
    ),
    LAB_TECHNICIAN(
        title = "Lab Technician",
        subtitle = "Diagnostics & Verification",
        icon = Icons.Default.Biotech,
        badgeColorHex = 0xFF2563EB
    ),
    ACCOUNTANT(
        title = "Accountant",
        subtitle = "Billing, Claims & Ledger",
        icon = Icons.Default.AccountBalance,
        badgeColorHex = 0xFF1D4ED8
    ),
    HOSPITAL_ADMIN(
        title = "Hospital Admin",
        subtitle = "Tenant Operations & SaaS",
        icon = Icons.Default.AdminPanelSettings,
        badgeColorHex = 0xFF1E3A8A
    ),
    SUPER_ADMIN(
        title = "Super Admin",
        subtitle = "Directory & SaaS Governance",
        icon = Icons.Default.SupervisorAccount,
        badgeColorHex = 0xFF0F172A
    )
}
