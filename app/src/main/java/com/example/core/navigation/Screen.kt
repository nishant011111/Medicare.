package com.example.core.navigation

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Onboarding : Screen("onboarding")
    object Login : Screen("login")
    object Register : Screen("register")
    object ForgotPassword : Screen("forgot_password")
    object OtpVerification : Screen("otp_verification")
    object HospitalSelection : Screen("hospital_selection")
    object Dashboard : Screen("dashboard")
    object Profile : Screen("profile")
    object Settings : Screen("settings")

    // Ranchi Hospital Directory Screens
    object HospitalDirectory : Screen("hospital_directory")
    object HospitalDirectoryDetail : Screen("hospital_directory_detail/{hospitalId}") {
        fun createRoute(hospitalId: String): String = "hospital_directory_detail/$hospitalId"
    }
    object AdminHospitalDirectory : Screen("admin_hospital_directory")

    // Phase 3–9 Operational & SaaS Hub Screens
    object ClinicalEhrHub : Screen("clinical_ehr_hub")
    object AppointmentsHub : Screen("appointments_hub")
    object LabPharmacyHub : Screen("lab_pharmacy_hub")
    object BillingFinanceHub : Screen("billing_finance_hub")
    object AiAssistantHub : Screen("ai_assistant_hub")
    object SecurityOutboxHub : Screen("security_outbox_hub")
    object SaasPortalHub : Screen("saas_portal_hub")
}
