package com.example.core.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Domain
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.MediCoreBorder
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCoreSurfaceVariant

@Composable
fun HospitalBadge(
    hospitalName: String,
    cityName: String,
    onClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val clickModifier = if (onClick != null) {
        Modifier
            .testTag("hospital_badge_click")
            .clickable { onClick() }
    } else Modifier

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(MediCoreSurfaceVariant)
            .border(1.dp, MediCoreBorder, RoundedCornerShape(10.dp))
            .then(clickModifier)
            .padding(horizontal = 10.dp, vertical = 5.dp)
    ) {
        Icon(
            imageVector = Icons.Default.Domain,
            contentDescription = "Hospital",
            tint = MediCorePrimary,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = "$hospitalName ($cityName)",
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = MediCorePrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}
