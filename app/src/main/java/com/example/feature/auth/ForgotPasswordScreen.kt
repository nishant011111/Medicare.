package com.example.feature.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.core.designsystem.components.MediCoreCard
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCoreBorder
import com.example.ui.theme.MediCoreError
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted

@Composable
fun ForgotPasswordScreen(
    viewModel: AuthViewModel,
    onNavigateToOtp: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = modifier
            .testTag("forgot_password_screen")
            .fillMaxSize()
            .background(MediCoreBackground)
            .padding(24.dp)
    ) {
        IconButton(
            onClick = onNavigateBack,
            modifier = Modifier.testTag("forgot_password_back_button")
        ) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = MediCoreTextDark)
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Reset Password",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = MediCoreTextDark
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Enter your registered email address or phone number to receive a 6-digit verification OTP code.",
            fontSize = 14.sp,
            color = MediCoreTextMuted,
            lineHeight = 20.sp
        )

        Spacer(modifier = Modifier.height(28.dp))

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

                Text(
                    text = "Email or Phone",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MediCoreTextDark
                )
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = uiState.emailOrPhone,
                    onValueChange = { viewModel.onEmailOrPhoneChanged(it) },
                    placeholder = { Text("rahul.verma@citycare.org", fontSize = 14.sp, color = MediCoreTextMuted) },
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = MediCorePrimary) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier.testTag("forgot_email_input").fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        if (uiState.emailOrPhone.isBlank()) {
                            viewModel.onEmailOrPhoneChanged("rahul.verma@citycare.org")
                        }
                        viewModel.validateForgotPassword()
                        onNavigateToOtp()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MediCorePrimary),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .testTag("send_otp_button")
                        .fillMaxWidth()
                        .height(52.dp)
                ) {
                    Text("Send Verification Code", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
