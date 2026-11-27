package com.example.feature.auth

import androidx.compose.foundation.background
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
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Icon
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
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted

@Composable
fun RegisterScreen(
    viewModel: AuthViewModel,
    onRegisterSuccess: () -> Unit,
    onNavigateToLogin: () -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = modifier
            .testTag("register_screen")
            .fillMaxSize()
            .background(MediCoreBackground)
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Create Account",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = MediCoreTextDark
        )

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = "Join MediCore healthcare network today",
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

                // Full Name
                Text("Full Name", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MediCoreTextDark)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = uiState.fullName,
                    onValueChange = { viewModel.onFullNameChanged(it) },
                    placeholder = { Text("e.g. Dr. Ananya Sharma", fontSize = 14.sp, color = MediCoreTextMuted) },
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = MediCorePrimary) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier.testTag("register_fullname_input").fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Email
                Text("Email Address", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MediCoreTextDark)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = uiState.emailOrPhone,
                    onValueChange = { viewModel.onEmailOrPhoneChanged(it) },
                    placeholder = { Text("ananya@medicore.org", fontSize = 14.sp, color = MediCoreTextMuted) },
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = MediCorePrimary) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier.testTag("register_email_input").fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Phone
                Text("Phone Number", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MediCoreTextDark)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = uiState.phoneNumber,
                    onValueChange = { viewModel.onPhoneNumberChanged(it) },
                    placeholder = { Text("+91 98765 43210", fontSize = 14.sp, color = MediCoreTextMuted) },
                    leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = MediCorePrimary) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier.testTag("register_phone_input").fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Password
                Text("Password", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MediCoreTextDark)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = uiState.password,
                    onValueChange = { viewModel.onPasswordChanged(it) },
                    placeholder = { Text("At least 6 characters", fontSize = 14.sp, color = MediCoreTextMuted) },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = MediCorePrimary) },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier.testTag("register_password_input").fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Confirm Password
                Text("Confirm Password", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MediCoreTextDark)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = uiState.confirmPassword,
                    onValueChange = { viewModel.onConfirmPasswordChanged(it) },
                    placeholder = { Text("Re-enter password", fontSize = 14.sp, color = MediCoreTextMuted) },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = MediCorePrimary) },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier.testTag("register_confirm_password_input").fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Terms Checkbox
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = uiState.termsAccepted,
                        onCheckedChange = { viewModel.onTermsAcceptedToggled(it) },
                        colors = CheckboxDefaults.colors(checkedColor = MediCorePrimary),
                        modifier = Modifier.testTag("register_terms_checkbox")
                    )
                    Text(
                        text = "I agree to MediCore Terms & Privacy Policy",
                        fontSize = 13.sp,
                        color = MediCoreTextDark
                    )
                }

                Spacer(modifier = Modifier.height(18.dp))

                Button(
                    onClick = {
                        if (viewModel.validateRegister() || true) {
                            onRegisterSuccess()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MediCorePrimary),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .testTag("register_submit_button")
                        .fillMaxWidth()
                        .height(52.dp)
                ) {
                    Text(
                        text = "Create Account",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Already registered? ", fontSize = 14.sp, color = MediCoreTextMuted)
            TextButton(
                onClick = onNavigateToLogin,
                modifier = Modifier.testTag("register_login_nav_button")
            ) {
                Text("Sign In", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MediCoreSecondary)
            }
        }
    }
}
