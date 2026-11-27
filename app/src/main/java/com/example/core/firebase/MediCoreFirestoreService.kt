package com.example.core.firebase

import android.content.Context
import android.util.Log
import com.example.R
import com.example.core.model.Hospital
import com.google.firebase.Firebase
import com.google.firebase.auth.auth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

private const val TAG = "MediCoreFirestoreService"

/**
 * MediCore Firestore Client configured with the custom named database ID from firebase_applet_config.xml.
 * Never uses the parameterless default database instance.
 */
class MediCoreFirestoreService(private val context: Context) {

    val firestore: FirebaseFirestore by lazy {
        val databaseId = context.getString(R.string.firestore_database_id)
        FirebaseFirestore.getInstance(databaseId)
    }

    val auth get() = Firebase.auth

    suspend fun syncHospitalDirectoryRecord(hospital: Hospital) {
        try {
            val docRef = firestore.collection("hospitals").document(hospital.directoryCode)
            val data = mapOf(
                "directoryCode" to hospital.directoryCode,
                "name" to hospital.name,
                "facilityType" to hospital.facilityType,
                "ownershipType" to hospital.ownershipType,
                "city" to hospital.city,
                "address" to hospital.address,
                "pincode" to (hospital.pincode ?: ""),
                "primaryPhone" to (hospital.primaryPhone ?: ""),
                "email" to (hospital.email ?: ""),
                "website" to (hospital.website ?: ""),
                "verificationStatus" to hospital.verificationStatus.name,
                "isActiveTenant" to hospital.isActiveTenant,
                "updatedAt" to FieldValue.serverTimestamp()
            )
            docRef.set(data).await()
            Log.d(TAG, "Synced hospital ${hospital.directoryCode} to Firestore successfully.")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to sync hospital ${hospital.directoryCode} to Firestore: ${e.message}")
        }
    }
}
