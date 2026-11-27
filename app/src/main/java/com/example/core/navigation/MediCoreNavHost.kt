package com.example.core.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.google.firebase.Firebase
import com.google.firebase.auth.auth
import com.example.core.network.LogoutRequestDto
import com.example.core.network.NetworkClientProvider
import com.example.core.security.SecureTokenStorage
import com.example.data.repository.MediCoreEnterpriseRepository
import kotlinx.coroutines.launch
import com.example.feature.auth.AuthViewModel
import com.example.feature.auth.ForgotPasswordScreen
import com.example.feature.auth.LoginScreen
import com.example.feature.auth.OtpVerificationScreen
import com.example.feature.auth.RegisterScreen
import com.example.feature.dashboard.DashboardScreen
import com.example.feature.dashboard.DashboardViewModel
import com.example.feature.directory.AdminHospitalDirectoryScreen
import com.example.feature.directory.HospitalDirectoryDetailScreen
import com.example.feature.directory.HospitalDirectoryScreen
import com.example.feature.hospital.HospitalSelectionScreen
import com.example.feature.hospital.HospitalViewModel
import com.example.feature.modules.AiAssistantHubScreen
import com.example.feature.modules.AppointmentsHubScreen
import com.example.feature.modules.BillingFinanceHubScreen
import com.example.feature.modules.ClinicalEhrHubScreen
import com.example.feature.modules.LabPharmacyHubScreen
import com.example.feature.modules.SaasPortalHubScreen
import com.example.feature.modules.SecurityOutboxHubScreen
import com.example.feature.onboarding.OnboardingScreen
import com.example.feature.profile.ProfileScreen
import com.example.feature.settings.SettingsScreen
import com.example.feature.splash.SplashScreen

@Composable
fun MediCoreNavHost(
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController(),
    startDestination: String = Screen.Splash.route,
    authViewModel: AuthViewModel = viewModel(),
    hospitalViewModel: HospitalViewModel = viewModel(),
    dashboardViewModel: DashboardViewModel = viewModel()
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    val performSecureLogout: () -> Unit = {
        coroutineScope.launch {
            try {
                // 1. Revoke session on backend via REST API
                val tokenStorage = SecureTokenStorage.getInstance(context)
                val currentTokens = tokenStorage.getCurrentTokensSync()
                val apiService = NetworkClientProvider.getApiService(context)
                apiService.logout(LogoutRequestDto(refreshToken = currentTokens.refreshToken))
            } catch (_: Exception) {
                // Network failure or offline should not prevent local session termination
            }

            try {
                // 2. Revoke Firebase Auth session
                Firebase.auth.signOut()
            } catch (_: Exception) {}

            try {
                // 3. Purge Android Keystore-backed AES-256 session tokens and DataStore
                val tokenStorage = SecureTokenStorage.getInstance(context)
                tokenStorage.clearTokens()
            } catch (_: Exception) {}

            // 4. Clear memory state and sensitive credentials in ViewModels
            dashboardViewModel.resetSession()
            authViewModel.clearCredentials()

            // 5. Navigate user securely back to Login screen, clearing all backstack entries
            navController.navigate(Screen.Login.route) {
                popUpTo(0) { inclusive = true }
                launchSingleTop = true
            }
        }
    }

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier
    ) {
        composable(Screen.Splash.route) {
            SplashScreen(
                onNavigateToOnboarding = {
                    navController.navigate(Screen.Onboarding.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Onboarding.route) {
            OnboardingScreen(
                onFinishOnboarding = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Onboarding.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Login.route) {
            LoginScreen(
                viewModel = authViewModel,
                onLoginSuccess = {
                    navController.navigate(Screen.HospitalSelection.route)
                },
                onNavigateToRegister = {
                    navController.navigate(Screen.Register.route)
                },
                onNavigateToForgotPassword = {
                    navController.navigate(Screen.ForgotPassword.route)
                }
            )
        }

        composable(Screen.Register.route) {
            RegisterScreen(
                viewModel = authViewModel,
                onRegisterSuccess = {
                    navController.navigate(Screen.HospitalSelection.route)
                },
                onNavigateToLogin = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Register.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.ForgotPassword.route) {
            ForgotPasswordScreen(
                viewModel = authViewModel,
                onNavigateToOtp = {
                    navController.navigate(Screen.OtpVerification.route)
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(Screen.OtpVerification.route) {
            OtpVerificationScreen(
                viewModel = authViewModel,
                onVerifySuccess = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.ForgotPassword.route) { inclusive = true }
                    }
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(Screen.HospitalSelection.route) {
            HospitalSelectionScreen(
                viewModel = hospitalViewModel,
                onHospitalSelected = { hospitalId ->
                    dashboardViewModel.setHospital(hospitalId)
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.HospitalSelection.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Dashboard.route) {
            val dashState by dashboardViewModel.uiState.collectAsState()
            DashboardScreen(
                viewModel = dashboardViewModel,
                onNavigateToHospitalSelection = {
                    navController.navigate(Screen.HospitalSelection.route)
                },
                onNavigateToProfile = {
                    navController.navigate(Screen.Profile.route)
                },
                onNavigateToSettings = {
                    navController.navigate(Screen.Settings.route)
                },
                onNavigateToDirectory = {
                    navController.navigate(Screen.HospitalDirectory.route)
                },
                onNavigateToAdminDirectory = {
                    navController.navigate(Screen.AdminHospitalDirectory.route)
                },
                onNavigateToClinicalEhr = {
                    navController.navigate(Screen.ClinicalEhrHub.route)
                },
                onNavigateToAppointments = {
                    navController.navigate(Screen.AppointmentsHub.route)
                },
                onNavigateToLabPharmacy = {
                    navController.navigate(Screen.LabPharmacyHub.route)
                },
                onNavigateToBilling = {
                    navController.navigate(Screen.BillingFinanceHub.route)
                },
                onNavigateToAiAssistant = {
                    navController.navigate(Screen.AiAssistantHub.route)
                },
                onNavigateToSecurity = {
                    navController.navigate(Screen.SecurityOutboxHub.route)
                },
                onNavigateToSaas = {
                    navController.navigate(Screen.SaasPortalHub.route)
                },
                onLogout = performSecureLogout
            )
        }

        // Ranchi Hospital Directory Navigation
        composable(Screen.HospitalDirectory.route) {
            HospitalDirectoryScreen(
                onNavigateBack = { navController.popBackStack() },
                onSelectHospitalDetail = { hospitalId ->
                    navController.navigate(Screen.HospitalDirectoryDetail.createRoute(hospitalId))
                },
                onClaimHospitalOnboarding = { hospital ->
                    MediCoreEnterpriseRepository.claimHospitalForOnboarding(
                        directoryCode = hospital.directoryCode,
                        hospitalName = hospital.name,
                        city = hospital.city,
                        adminEmail = hospital.email ?: "admin@${hospital.directoryCode.lowercase()}.org",
                        registrationLicenseNumber = "LIC-2026-${hospital.directoryCode}",
                        gstNumber = "20AAACM0000A1Z5"
                    )
                    navController.navigate(Screen.SaasPortalHub.route)
                }
            )
        }

        composable(
            route = Screen.HospitalDirectoryDetail.route,
            arguments = listOf(navArgument("hospitalId") { type = NavType.StringType })
        ) { backStackEntry ->
            val hospitalId = backStackEntry.arguments?.getString("hospitalId") ?: "RNC001"
            HospitalDirectoryDetailScreen(
                hospitalId = hospitalId,
                onNavigateBack = { navController.popBackStack() },
                onRegisterHospitalClaim = { hospital ->
                    MediCoreEnterpriseRepository.claimHospitalForOnboarding(
                        directoryCode = hospital.directoryCode,
                        hospitalName = hospital.name,
                        city = hospital.city,
                        adminEmail = hospital.email ?: "admin@${hospital.directoryCode.lowercase()}.org",
                        registrationLicenseNumber = "LIC-2026-${hospital.directoryCode}",
                        gstNumber = "20AAACM0000A1Z5"
                    )
                    navController.navigate(Screen.SaasPortalHub.route)
                }
            )
        }

        composable(Screen.AdminHospitalDirectory.route) {
            AdminHospitalDirectoryScreen(
                onNavigateBack = { navController.popBackStack() },
                onSelectHospitalDetail = { hospitalId ->
                    navController.navigate(Screen.HospitalDirectoryDetail.createRoute(hospitalId))
                }
            )
        }

        // Phase 3–9 Operational & SaaS Hub Routes
        composable(Screen.ClinicalEhrHub.route) {
            val dashState by dashboardViewModel.uiState.collectAsState()
            ClinicalEhrHubScreen(
                onNavigateBack = { navController.popBackStack() },
                selectedHospitalId = dashState.selectedHospital.id
            )
        }

        composable(Screen.AppointmentsHub.route) {
            val dashState by dashboardViewModel.uiState.collectAsState()
            AppointmentsHubScreen(
                onNavigateBack = { navController.popBackStack() },
                selectedHospitalId = dashState.selectedHospital.id
            )
        }

        composable(Screen.LabPharmacyHub.route) {
            LabPharmacyHubScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.BillingFinanceHub.route) {
            val dashState by dashboardViewModel.uiState.collectAsState()
            BillingFinanceHubScreen(
                onNavigateBack = { navController.popBackStack() },
                selectedHospitalId = dashState.selectedHospital.id
            )
        }

        composable(Screen.AiAssistantHub.route) {
            AiAssistantHubScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.SecurityOutboxHub.route) {
            SecurityOutboxHubScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.SaasPortalHub.route) {
            SaasPortalHubScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Profile.route) {
            val dashState by dashboardViewModel.uiState.collectAsState()
            ProfileScreen(
                userProfile = dashState.userProfile,
                selectedHospital = dashState.selectedHospital,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToHospitalSelection = {
                    navController.navigate(Screen.HospitalSelection.route)
                },
                onLogout = performSecureLogout
            )
        }

        composable(Screen.Settings.route) {
            SettingsScreen(
                onNavigateBack = { navController.popBackStack() },
                onLogout = performSecureLogout
            )
        }
    }
}
