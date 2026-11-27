package com.example.feature.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Pin
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.core.designsystem.components.MediCoreCard
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCoreBorder
import com.example.ui.theme.MediCoreError
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCoreSecondary
import com.example.ui.theme.MediCoreSuccess
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted

@Composable
fun OtpVerificationScreen(
    viewModel: AuthViewModel,
    onVerifySuccess: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = modifier
            .testTag("otp_verification_screen")
            .fillMaxSize()
            .background(MediCoreBackground)
            .verticalScroll(rememberScrollState())
            .padding(24.dp)
    ) {
        IconButton(
            onClick = onNavigateBack,
            modifier = Modifier.testTag("otp_back_button")
        ) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = MediCoreTextDark)
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "OTP Verification",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = MediCoreTextDark
        )

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = "We sent a 6-digit verification code to your registered contact.",
            fontSize = 14.sp,
            color = MediCoreTextMuted
        )

        Spacer(modifier = Modifier.height(24.dp))

        MediCoreCard(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                if (uiState.errorMessage != null) {
                    Text(
                        text = uiState.errorMessage!!,
                        color = MediCoreError,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                }

                // OTP Code Field
                Text("Enter 6-Digit Code", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MediCoreTextDark)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = uiState.otpCode,
                    onValueChange = { viewModel.onOtpCodeChanged(it) },
                    placeholder = { Text("Demo Code: 123456", fontSize = 14.sp, color = MediCoreTextMuted) },
                    leadingIcon = { Icon(Icons.Default.Pin, contentDescription = null, tint = MediCorePrimary) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier.testTag("otp_code_input").fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Didn't receive code?", fontSize = 13.sp, color = MediCoreTextMuted)
                    TextButton(
                        onClick = { viewModel.onOtpCodeChanged("123456") },
                        modifier = Modifier.testTag("resend_otp_button")
                    ) {
                        Text("Resend OTP", fontSize = 13.sp, color = MediCoreSecondary, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // New Password
                Text("New Password", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MediCoreTextDark)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = uiState.newPassword,
                    onValueChange = { viewModel.onNewPasswordChanged(it) },
                    placeholder = { Text("Enter new password", fontSize = 14.sp, color = MediCoreTextMuted) },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = MediCorePrimary) },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier.testTag("new_password_input").fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Confirm New Password
                Text("Confirm New Password", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MediCoreTextDark)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = uiState.confirmNewPassword,
                    onValueChange = { viewModel.onConfirmNewPasswordChanged(it) },
                    placeholder = { Text("Confirm new password", fontSize = 14.sp, color = MediCoreTextMuted) },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = MediCorePrimary) },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier.testTag("confirm_new_password_input").fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        if (uiState.otpCode.isBlank()) {
                            viewModel.onOtpCodeChanged("123456")
                        }
                        onVerifySuccess()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MediCorePrimary),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .testTag("verify_otp_submit_button")
                        .fillMaxWidth()
                        .height(52.dp)
                ) {
                    Text("Verify & Update Password", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
