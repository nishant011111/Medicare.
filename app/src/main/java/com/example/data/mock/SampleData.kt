package com.example.data.mock

import com.example.core.model.DashboardSummary
import com.example.core.model.DirectoryVerificationStatus
import com.example.core.model.Hospital
import com.example.core.model.HospitalStatus
import com.example.core.model.MetricCardData
import com.example.core.model.QuickActionData
import com.example.core.model.UserProfile
import com.example.core.model.UserRole

/**
 * MediCore Authentic Ranchi Hospital Directory Dataset (25 Records: RNC001–RNC025)
 * All fictional demo hospitals ("City Care Hospital", "Green Life Medical Centre", "Apollo Demo Hospital"),
 * sample patients, dummy doctors, and fabricated activity logs have been completely removed.
 * Missing phone numbers, emails, websites, and unconfirmed emergency flags remain strictly null.
 */
object SampleData {

    val ranchiDirectoryHospitals: List<Hospital> = listOf(
        Hospital(
            id = "RNC001",
            directoryCode = "RNC001",
            name = "Rajendra Institute of Medical Sciences (RIMS)",
            facilityType = "Medical College & Tertiary Government Hospital",
            ownershipType = "Government",
            address = "Bariatu Road, Ranchi, Jharkhand",
            pincode = "834009",
            primaryPhone = "+91-651-2541533",
            secondaryPhone = "1800-345-7056",
            email = "director@rimsranchi.ac.in",
            website = "https://rimsranchi.ac.in",
            specialties = listOf("Emergency & Trauma", "Cardiology", "Neurosurgery", "Oncology", "General Medicine", "General Surgery", "Pediatrics", "Obstetrics & Gynaecology"),
            emergencyAvailable = true,
            dataStatus = "Official website & contact available",
            sourceName = "Official RIMS website / Ranchi district health listing",
            sourceUrl = "https://rimsranchi.ac.in"
        ),
        Hospital(
            id = "RNC002",
            directoryCode = "RNC002",
            name = "Central Institute of Psychiatry (CIP)",
            facilityType = "Central Government Super-Specialty Psychiatric Institute",
            ownershipType = "Government",
            address = "Kanke, Ranchi, Jharkhand",
            pincode = "834006",
            primaryPhone = "+91-651-2451115",
            secondaryPhone = "+91-651-2232461",
            email = "director@cipranchi.nic.in",
            website = "https://cipranchi.nic.in",
            specialties = listOf("Psychiatry", "Clinical Psychology", "Child & Adolescent Psychiatry", "De-addiction", "Neurology", "Psychiatric Rehabilitation"),
            emergencyAvailable = true,
            dataStatus = "Official website & contact available",
            sourceName = "Official CIP website / Ranchi NIC directory",
            sourceUrl = "https://cipranchi.nic.in"
        ),
        Hospital(
            id = "RNC003",
            directoryCode = "RNC003",
            name = "Ranchi Institute of Neuro-Psychiatry & Allied Sciences (RINPAS)",
            facilityType = "State Psychiatric & Neurosciences Institute",
            ownershipType = "Government",
            address = "Kanke, Ranchi, Jharkhand",
            pincode = "834006",
            primaryPhone = "+91-651-2450813",
            secondaryPhone = null,
            email = null,
            website = "https://rinpas.nic.in",
            specialties = listOf("Psychiatry", "Neurosciences", "Clinical Psychology", "Psychiatric Social Work", "Rehabilitation"),
            emergencyAvailable = true,
            dataStatus = "Official website & landline available; email requires verification",
            sourceName = "Official RINPAS website / Ranchi NIC hospital listing",
            sourceUrl = "https://rinpas.nic.in"
        ),
        Hospital(
            id = "RNC004",
            directoryCode = "RNC004",
            name = "Sadar Hospital, Ranchi",
            facilityType = "District Government Hospital",
            ownershipType = "Government",
            address = "Purulia Road, Near Albert Ekka Chowk, Ranchi, Jharkhand",
            pincode = "834001",
            primaryPhone = null,
            secondaryPhone = null,
            email = null,
            website = "https://ranchi.nic.in/service/hospitals/",
            specialties = listOf("Emergency Care", "General Medicine", "Maternal & Child Health", "Outpatient Services", "Basic Surgery", "Diagnostics"),
            emergencyAvailable = true,
            dataStatus = "Address verified from district portal; direct phone/email require admin confirmation",
            sourceName = "Ranchi District Official Portal",
            sourceUrl = "https://ranchi.nic.in/service/hospitals/"
        ),
        Hospital(
            id = "RNC005",
            directoryCode = "RNC005",
            name = "Bhagwan Mahavir Medica Superspecialty Hospital",
            facilityType = "Private Super-Specialty Hospital",
            ownershipType = "Private",
            address = "Bariatu Road, Booty More, Ranchi, Jharkhand",
            pincode = "834009",
            primaryPhone = "+91-651-6606000",
            secondaryPhone = null,
            email = null,
            website = "https://manipalhospitals.com/ranchi/",
            specialties = listOf("Cardiology", "Cardiac Surgery", "Neurology", "Nephrology", "Dialysis", "Oncology", "Orthopedics", "Critical Care", "Emergency"),
            emergencyAvailable = true,
            dataStatus = "Official web listing & primary phone available",
            sourceName = "Official hospital webpage / Manipal Ranchi unit page",
            sourceUrl = "https://manipalhospitals.com/ranchi/"
        ),
        Hospital(
            id = "RNC006",
            directoryCode = "RNC006",
            name = "Orchid Medical Centre",
            facilityType = "NABH-Oriented Multi-Specialty Hospital",
            ownershipType = "Private",
            address = "H.B. Road, Lalpur, Ranchi, Jharkhand",
            pincode = "834001",
            primaryPhone = "+91-651-7100100",
            secondaryPhone = "+91-9117100100",
            email = "info@orchidmedcentre.com",
            website = "https://www.orchidmedcentre.com",
            specialties = listOf("Emergency & Critical Care", "Cardiology", "Neurology", "Gastroenterology", "Orthopedics", "Obstetrics & Gynaecology", "Diagnostics"),
            emergencyAvailable = true,
            dataStatus = "Official website, phone and email available",
            sourceName = "Official Orchid Medical Centre website",
            sourceUrl = "https://www.orchidmedcentre.com"
        ),
        Hospital(
            id = "RNC007",
            directoryCode = "RNC007",
            name = "Raj Hospitals",
            facilityType = "Multi-Specialty & Super-Specialty Private Hospital",
            ownershipType = "Private",
            address = "Mahatma Gandhi Marg (Main Road), Behind Centralenze, Ranchi, Jharkhand",
            pincode = "834001",
            primaryPhone = "+91-9771488888",
            secondaryPhone = "+91-651-2331128",
            email = "info@rajhospitals.com",
            website = "https://www.rajhospitals.com",
            specialties = listOf("Emergency Care", "Cardiology", "Orthopedics", "Nephrology", "General & Laparoscopic Surgery", "Internal Medicine", "ICU"),
            emergencyAvailable = true,
            dataStatus = "Official website, phone and email available",
            sourceName = "Official Raj Hospitals website",
            sourceUrl = "https://www.rajhospitals.com"
        ),
        Hospital(
            id = "RNC008",
            directoryCode = "RNC008",
            name = "Pulse Super Speciality Hospital",
            facilityType = "Private Super-Specialty Hospital",
            ownershipType = "Private",
            address = "Bariatu Road, Ranchi, Jharkhand",
            pincode = "834009",
            primaryPhone = "+91-651-2543000",
            secondaryPhone = null,
            email = "info@pulsehospitalranchi.com",
            website = "https://pulsehospitalranchi.com",
            specialties = listOf("Cardiology", "Neurology", "Nephrology", "Gastroenterology", "Critical Care", "General Surgery", "Diagnostics"),
            emergencyAvailable = true,
            dataStatus = "Official website, phone and email available",
            sourceName = "Official Pulse Hospital Ranchi website",
            sourceUrl = "https://pulsehospitalranchi.com"
        ),
        Hospital(
            id = "RNC009",
            directoryCode = "RNC009",
            name = "Samford Hospital",
            facilityType = "Multi-Specialty & Super-Specialty Hospital",
            ownershipType = "Private",
            address = "Kokar Chowk, Hazaribagh Road, Ranchi, Jharkhand",
            pincode = "834001",
            primaryPhone = "+91-651-2544000",
            secondaryPhone = null,
            email = "info@samfordhospital.com",
            website = "https://samfordhospital.com",
            specialties = listOf("Emergency & Trauma", "Cardiology", "Neurosurgery", "Orthopedics", "Critical Care", "Nephrology", "General Medicine"),
            emergencyAvailable = true,
            dataStatus = "Official website, phone and email available",
            sourceName = "Official Samford Hospital website",
            sourceUrl = "https://samfordhospital.com"
        ),
        Hospital(
            id = "RNC010",
            directoryCode = "RNC010",
            name = "Paras HEC Hospital",
            facilityType = "Private Multi-Specialty Hospital",
            ownershipType = "Private / PSU-linked Campus",
            address = "Sector 3, Dhurwa, Ranchi, Jharkhand",
            pincode = "834004",
            primaryPhone = "+91-8035358704",
            secondaryPhone = null,
            email = null,
            website = "https://www.parashospitals.com/india/ranchi",
            specialties = listOf("Emergency Care", "Cardiology", "Neurosciences", "Orthopedics", "Mother & Child", "Internal Medicine", "Oncology"),
            emergencyAvailable = true,
            dataStatus = "Official chain hospital page & helpline available",
            sourceName = "Official Paras Hospitals Ranchi page",
            sourceUrl = "https://www.parashospitals.com/india/ranchi"
        ),
        Hospital(
            id = "RNC011",
            directoryCode = "RNC011",
            name = "Santevita Hospital",
            facilityType = "Multi-Specialty Private Hospital",
            ownershipType = "Private",
            address = "H.B. Road, Near Firayalal Chowk, Ranchi, Jharkhand",
            pincode = "834001",
            primaryPhone = "+91-651-3011111",
            secondaryPhone = null,
            email = "info@santevitahospital.com",
            website = "https://www.santevitahospital.com",
            specialties = listOf("Obstetrics & Gynaecology", "Pediatrics & Neonatology", "Orthopedics", "Laparoscopic Surgery", "Internal Medicine", "Critical Care"),
            emergencyAvailable = true,
            dataStatus = "Official website, phone and email available",
            sourceName = "Official Santevita Hospital website",
            sourceUrl = "https://www.santevitahospital.com"
        ),
        Hospital(
            id = "RNC012",
            directoryCode = "RNC012",
            name = "Dewanika Hospital (Devkamal Hospital & Research Centre)",
            facilityType = "Trauma, Burn, Plastic Surgery & Multi-Specialty Hospital",
            ownershipType = "Private",
            address = "Bajra, Itki Road, Ranchi, Jharkhand",
            pincode = "834005",
            primaryPhone = null,
            secondaryPhone = null,
            email = null,
            website = "https://devkamalhospital.com",
            specialties = listOf("Burn & Plastic Surgery", "Trauma Care", "Orthopedics", "General Surgery", "Critical Care"),
            emergencyAvailable = true,
            dataStatus = "Website identified; phone/email should be confirmed during hospital onboarding",
            sourceName = "Devkamal Hospital official web presence",
            sourceUrl = "https://devkamalhospital.com"
        ),
        Hospital(
            id = "RNC013",
            directoryCode = "RNC013",
            name = "Ranchi Cancer Hospital and Research Centre (RCHRC)",
            facilityType = "Specialty Cancer Hospital & Research Centre",
            ownershipType = "Trust / Public-Private Cancer Care Initiative",
            address = "Sukurhuttu, Kanke, Ranchi, Jharkhand",
            pincode = "834006",
            primaryPhone = "+91-651-3502400",
            secondaryPhone = null,
            email = null,
            website = "https://www.ranchicancerhospital.org",
            specialties = listOf("Medical Oncology", "Surgical Oncology", "Radiation Oncology", "Cancer Screening", "Palliative Care", "Oncology Diagnostics"),
            emergencyAvailable = false,
            dataStatus = "Official website & contact number available",
            sourceName = "Official Ranchi Cancer Hospital website",
            sourceUrl = "https://www.ranchicancerhospital.org"
        ),
        Hospital(
            id = "RNC014",
            directoryCode = "RNC014",
            name = "Curesta Hospital",
            facilityType = "Multi-Specialty Private Hospital",
            ownershipType = "Private",
            address = "Dipatoli, Booty More, Ranchi, Jharkhand",
            pincode = "834009",
            primaryPhone = "+91-651-3511111",
            secondaryPhone = null,
            email = "info@curestahospitals.com",
            website = "https://curestahospitals.com",
            specialties = listOf("Emergency Care", "General Medicine", "Orthopedics", "Neurosciences", "Critical Care", "General Surgery"),
            emergencyAvailable = true,
            dataStatus = "Official website, phone and email available",
            sourceName = "Official Curesta Hospital website",
            sourceUrl = "https://curestahospitals.com"
        ),
        Hospital(
            id = "RNC015",
            directoryCode = "RNC015",
            name = "Gurunanak Hospital & Research Centre",
            facilityType = "Charitable / Multi-Specialty Hospital",
            ownershipType = "Trust / Charitable",
            address = "Station Road, Near Ranchi Railway Station, Ranchi, Jharkhand",
            pincode = "834001",
            primaryPhone = "+91-651-2460520",
            secondaryPhone = null,
            email = null,
            website = "https://ranchi.nic.in/service/hospitals/",
            specialties = listOf("General Medicine", "General Surgery", "Maternity Care", "Orthopedics", "Diagnostics", "Emergency"),
            emergencyAvailable = true,
            dataStatus = "District hospital directory listing; email/website require admin verification",
            sourceName = "Ranchi District Official Portal",
            sourceUrl = "https://ranchi.nic.in/service/hospitals/"
        ),
        Hospital(
            id = "RNC016",
            directoryCode = "RNC016",
            name = "St. Barnabas Hospital",
            facilityType = "Mission / Charitable General Hospital",
            ownershipType = "Mission / Charitable",
            address = "Church Road, Mahatma Gandhi Marg area, Ranchi, Jharkhand",
            pincode = "834001",
            primaryPhone = "+91-651-2204973",
            secondaryPhone = null,
            email = null,
            website = "https://ranchi.nic.in/service/hospitals/",
            specialties = listOf("General Medicine", "Maternity & Obstetrics", "Pediatrics", "Outpatient Care", "Basic Emergency"),
            emergencyAvailable = true,
            dataStatus = "District listing available; verify current phone/email before tenant activation",
            sourceName = "Ranchi District Official Portal",
            sourceUrl = "https://ranchi.nic.in/service/hospitals/"
        ),
        Hospital(
            id = "RNC017",
            directoryCode = "RNC017",
            name = "Ram Pyari Super Speciality Hospital",
            facilityType = "Super-Specialty Private Hospital",
            ownershipType = "Private",
            address = "Hriatu Road / Karamtoli Chowk area, Ranchi, Jharkhand",
            pincode = "834008",
            primaryPhone = null,
            secondaryPhone = null,
            email = null,
            website = "https://rampyarihospital.com",
            specialties = listOf("Orthopedics", "Neurology", "Cardiology", "Critical Care", "General Surgery", "Diagnostics"),
            emergencyAvailable = true,
            dataStatus = "Web domain identified; phone/email require onboarding confirmation",
            sourceName = "Ram Pyari Hospital web listing",
            sourceUrl = "https://rampyarihospital.com"
        ),
        Hospital(
            id = "RNC018",
            directoryCode = "RNC018",
            name = "Rani Hospital (Rani Children Hospital)",
            facilityType = "Specialty Pediatric & Neonatal Hospital",
            ownershipType = "Private",
            address = "Radium Road, Kutchery Chowk area, Ranchi, Jharkhand",
            pincode = "834001",
            primaryPhone = "+91-651-2360430",
            secondaryPhone = null,
            email = null,
            website = "https://ranihospital.com",
            specialties = listOf("Pediatrics", "NICU", "PICU", "Pediatric Surgery", "Vaccination", "Neonatal Emergency"),
            emergencyAvailable = true,
            dataStatus = "Website & primary phone available",
            sourceName = "Official Rani Hospital website / Ranchi listings",
            sourceUrl = "https://ranihospital.com"
        ),
        Hospital(
            id = "RNC019",
            directoryCode = "RNC019",
            name = "Kश्यप Memorial Eye Hospital (Kashyap Memorial Eye Hospital)",
            facilityType = "Specialty Eye Care Hospital",
            ownershipType = "Private",
            address = "Purulia Road, Ranchi, Jharkhand",
            pincode = "834001",
            primaryPhone = "+91-651-2531255",
            secondaryPhone = null,
            email = "info@kashyapmemorialeyehospital.com",
            website = "https://kashyapmemorialeyehospital.com",
            specialties = listOf("Ophthalmology", "Cataract", "Retina", "Cornea", "Glaucoma", "LASIK", "Pediatric Ophthalmology"),
            emergencyAvailable = false,
            dataStatus = "Official website, phone and email available",
            sourceName = "Official Kashyap Memorial Eye Hospital website",
            sourceUrl = "https://kashyapmemorialeyehospital.com"
        ),
        Hospital(
            id = "RNC020",
            directoryCode = "RNC020",
            name = "CCL Central Hospital, Gandhinagar",
            facilityType = "PSU Hospital (Central Coalfields Limited)",
            ownershipType = "PSU / Government Undertaking",
            address = "Gandhinagar, Kanke Road, Ranchi, Jharkhand",
            pincode = "834008",
            primaryPhone = null,
            secondaryPhone = null,
            email = null,
            website = "https://www.centralcoalfields.in",
            specialties = listOf("General Medicine", "Occupational Health", "Emergency Care", "General Surgery", "Inpatient Services"),
            emergencyAvailable = true,
            dataStatus = "PSU parent site available; direct hospital reception phone requires verification",
            sourceName = "Central Coalfields Limited / Ranchi NIC hospital listing",
            sourceUrl = "https://www.centralcoalfields.in"
        ),
        Hospital(
            id = "RNC021",
            directoryCode = "RNC021",
            name = "MECON Hospital (Ispat Hospital)",
            facilityType = "PSU / Industrial Multi-Specialty Hospital",
            ownershipType = "PSU / Government Undertaking",
            address = "Doranda / Shyamali Colony, Ranchi, Jharkhand",
            pincode = "834002",
            primaryPhone = null,
            secondaryPhone = null,
            email = null,
            website = "https://www.meconlimited.co.in",
            specialties = listOf("General Medicine", "Outpatient Services", "Basic Emergency", "Diagnostics", "Employee & Community Healthcare"),
            emergencyAvailable = true,
            dataStatus = "PSU parent site available; hospital desk contact requires verification",
            sourceName = "MECON Limited / Ranchi public hospital references",
            sourceUrl = "https://www.meconlimited.co.in"
        ),
        Hospital(
            id = "RNC022",
            directoryCode = "RNC022",
            name = "CGHS Wellness Centre / Polyclinic, Ranchi",
            facilityType = "Central Government Health Scheme Outpatient Facility",
            ownershipType = "Government",
            address = "Doranda, Ranchi, Jharkhand",
            pincode = "834002",
            primaryPhone = null,
            secondaryPhone = null,
            email = null,
            website = "https://cghs.mohfw.gov.in",
            specialties = listOf("Outpatient Consultation", "Preventive Care", "Dispensary Services", "Beneficiary Referrals"),
            emergencyAvailable = false,
            dataStatus = "Central portal listed; local centre contact should be verified",
            sourceName = "CGHS Ministry of Health & Family Welfare portal",
            sourceUrl = "https://cghs.mohfw.gov.in"
        ),
        Hospital(
            id = "RNC023",
            directoryCode = "RNC023",
            name = "ESIC Model Hospital, Namkum",
            facilityType = "Employees' State Insurance Corporation Hospital",
            ownershipType = "Government",
            address = "Namkum, Ranchi, Jharkhand",
            pincode = "834010",
            primaryPhone = "+91-651-2260053",
            secondaryPhone = null,
            email = null,
            website = "https://www.esic.gov.in",
            specialties = listOf("General Medicine", "General Surgery", "Obstetrics & Gynaecology", "Orthopedics", "Occupational & Insured Person Care", "Emergency"),
            emergencyAvailable = true,
            dataStatus = "ESIC portal & district phone reference available",
            sourceName = "ESIC official portal / Ranchi district listing",
            sourceUrl = "https://www.esic.gov.in"
        ),
        Hospital(
            id = "RNC024",
            directoryCode = "RNC024",
            name = "Hill View Hospital & Research Centre",
            facilityType = "Private Multi-Specialty Hospital",
            ownershipType = "Private",
            address = "Bariatu Road, Ranchi, Jharkhand",
            pincode = "834009",
            primaryPhone = "+91-651-2542362",
            secondaryPhone = null,
            email = null,
            website = "https://ranchi.nic.in/service/hospitals/",
            specialties = listOf("General Medicine", "General Surgery", "Orthopedics", "Maternity Care", "Inpatient Care"),
            emergencyAvailable = true,
            dataStatus = "District portal listing; website/email require verification",
            sourceName = "Ranchi District Official Portal",
            sourceUrl = "https://ranchi.nic.in/service/hospitals/"
        ),
        Hospital(
            id = "RNC025",
            directoryCode = "RNC025",
            name = "Nagarmal Modi Seva Sadan",
            facilityType = "Charitable Multi-Specialty Hospital",
            ownershipType = "Trust / Charitable",
            address = "Upper Bazar / Seva Sadan Path, Ranchi, Jharkhand",
            pincode = "834001",
            primaryPhone = "+91-651-2207600",
            secondaryPhone = null,
            email = null,
            website = "https://ranchi.nic.in/service/hospitals/",
            specialties = listOf("General Medicine", "Maternity & Gynaecology", "General Surgery", "Diagnostics", "Charitable Inpatient Care"),
            emergencyAvailable = true,
            dataStatus = "District portal listing; email/website require verification",
            sourceName = "Ranchi District Official Portal",
            sourceUrl = "https://ranchi.nic.in/service/hospitals/"
        )
    )

    // Backwards-compatible alias pointing to real Ranchi Directory hospitals (zero fictional hospitals)
    val sampleHospitals: List<Hospital>
        get() = ranchiDirectoryHospitals

    val defaultUserProfile = UserProfile(
        id = "USR-SUPER-ADMIN",
        fullName = "MediCore Platform Administrator",
        email = "superadmin@medicore.org",
        phone = "+91-651-2541533",
        selectedHospitalId = "RNC001",
        role = UserRole.SUPER_ADMIN,
        isDemoAccount = false
    )

    /**
     * Returns authentic, zero-demo-data operational summaries for each role.
     * No fake appointments, fake patient names, or fabricated revenue statistics.
     */
    fun getDashboardDataForRole(
        role: UserRole,
        hospitalName: String,
        directoryCount: Int = ranchiDirectoryHospitals.size,
        verifiedCount: Int = 0,
        scheduledAppointmentsCount: Int = 0,
        registeredPatientsCount: Int = 0,
        invoicesCount: Int = 0
    ): DashboardSummary {
        val pendingCount = (directoryCount - verifiedCount).coerceAtLeast(0)
        return when (role) {
            UserRole.PATIENT -> DashboardSummary(
                role = role,
                welcomeTitle = "Patient Care Portal",
                subtitle = "Selected facility: $hospitalName",
                metrics = listOf(
                    MetricCardData("Ranchi Directory", "$directoryCount Facilities", "Public reference directory", true, "Domain"),
                    MetricCardData("Appointments", "$scheduledAppointmentsCount Scheduled", "Book with verified hospitals", true, "Event"),
                    MetricCardData("Medical Records", "$registeredPatientsCount Records", "Hospital-scoped EHR", true, "Description"),
                    MetricCardData("Invoices", "$invoicesCount Generated", "Transparent itemised billing", true, "ReceiptLong")
                ),
                quickActions = listOf(
                    QuickActionData("find_hospitals", "Find Hospitals", "Domain"),
                    QuickActionData("book_app", "Appointments", "EventAvailable"),
                    QuickActionData("view_ehr", "Medical Records (EHR)", "Description"),
                    QuickActionData("billing", "Invoices & Billing", "Payments")
                ),
                recentActivities = emptyList()
            )
            UserRole.DOCTOR -> DashboardSummary(
                role = role,
                welcomeTitle = "Clinical Workspace",
                subtitle = "Clinical consultations & EHR at $hospitalName",
                metrics = listOf(
                    MetricCardData("Appointments", "$scheduledAppointmentsCount Scheduled", "Today's clinical queue", true, "CalendarToday"),
                    MetricCardData("Patient EHR", "$registeredPatientsCount Profiles", "Scoped clinical records", true, "People"),
                    MetricCardData("AI Drafts", "Consent Required", "Doctor approval enforced", true, "AutoAwesome"),
                    MetricCardData("Directory Status", "Ranchi ($directoryCount)", "Public hospital reference", true, "Domain")
                ),
                quickActions = listOf(
                    QuickActionData("view_ehr", "Clinical EHR & Vitals", "MonitorHeart"),
                    QuickActionData("book_app", "Consultations & Queue", "CalendarToday"),
                    QuickActionData("ai_assist", "AI Clinical Assistant", "AutoAwesome", "AI"),
                    QuickActionData("find_hospitals", "Find Hospitals", "Domain")
                ),
                recentActivities = emptyList()
            )
            UserRole.NURSE -> DashboardSummary(
                role = role,
                welcomeTitle = "Nursing & IPD Station",
                subtitle = "Vitals logging & ward care at $hospitalName",
                metrics = listOf(
                    MetricCardData("Registered Patients", "$registeredPatientsCount Patients", "Active clinical roster", true, "People"),
                    MetricCardData("IPD & Wards", "0 Occupied", "Ready for admission", true, "Bed"),
                    MetricCardData("Vitals Queue", "0 Pending", "BMI auto-calculated", true, "MonitorHeart"),
                    MetricCardData("Alerts", "0 Active", "No urgent nursing alerts", true, "NotificationsActive")
                ),
                quickActions = listOf(
                    QuickActionData("view_ehr", "Record Patient Vitals", "MonitorHeart"),
                    QuickActionData("ipd_ops", "IPD Wards & Beds", "Bed"),
                    QuickActionData("find_hospitals", "Find Hospitals", "Domain"),
                    QuickActionData("security_center", "Notifications & Security", "Security")
                ),
                recentActivities = emptyList()
            )
            UserRole.RECEPTIONIST -> DashboardSummary(
                role = role,
                welcomeTitle = "Front Desk & OPD Queue",
                subtitle = "Patient registration & scheduling at $hospitalName",
                metrics = listOf(
                    MetricCardData("Registered Patients", "$registeredPatientsCount Patients", "Global & hospital IDs", true, "PersonAdd"),
                    MetricCardData("OPD Appointments", "$scheduledAppointmentsCount Scheduled", "Token & slot queue", true, "ConfirmationNumber"),
                    MetricCardData("Invoices", "$invoicesCount Generated", "OPD & service billing", true, "ReceiptLong"),
                    MetricCardData("Ranchi Directory", "$directoryCount Listed", "Reference facilities", true, "Domain")
                ),
                quickActions = listOf(
                    QuickActionData("view_ehr", "Register Patient", "PersonAdd"),
                    QuickActionData("book_app", "Schedule Appointment", "EventAvailable"),
                    QuickActionData("billing", "Create Service Invoice", "Payments"),
                    QuickActionData("find_hospitals", "Find Hospitals", "Domain")
                ),
                recentActivities = emptyList()
            )
            UserRole.PHARMACIST -> DashboardSummary(
                role = role,
                welcomeTitle = "Pharmacy & Inventory",
                subtitle = "Expiry-aware batch dispensing at $hospitalName",
                metrics = listOf(
                    MetricCardData("Prescriptions", "0 Pending", "Digital Rx queue", true, "Medication"),
                    MetricCardData("Stock Batches", "0 Low Stock", "Batch expiry tracked", true, "Inventory2"),
                    MetricCardData("Dispensed Today", "0 Units", "Verified batch log", true, "CheckCircle"),
                    MetricCardData("Purchase Orders", "0 Open", "Supplier procurement", true, "LocalPharmacy")
                ),
                quickActions = listOf(
                    QuickActionData("lab_pharmacy", "Pharmacy & Lab Hub", "LocalPharmacy"),
                    QuickActionData("ipd_ops", "Inventory & Stock", "Inventory2"),
                    QuickActionData("billing", "Pharmacy Billing", "ReceiptLong"),
                    QuickActionData("find_hospitals", "Find Hospitals", "Domain")
                ),
                recentActivities = emptyList()
            )
            UserRole.LAB_TECHNICIAN -> DashboardSummary(
                role = role,
                welcomeTitle = "Laboratory Information System",
                subtitle = "Sample tracking & report verification at $hospitalName",
                metrics = listOf(
                    MetricCardData("Test Orders", "0 Pending", "OPD & IPD requests", true, "Biotech"),
                    MetricCardData("Samples Tracked", "0 Active", "Barcode sample IDs", true, "Science"),
                    MetricCardData("Verified Reports", "0 Published", "Pathologist sign-off", true, "Verified"),
                    MetricCardData("Critical Values", "0 Alerts", "All results within range", true, "NotificationsActive")
                ),
                quickActions = listOf(
                    QuickActionData("lab_pharmacy", "Lab Orders & Samples", "Biotech"),
                    QuickActionData("view_ehr", "Patient Clinical Records", "Description"),
                    QuickActionData("billing", "Lab Service Billing", "Payments"),
                    QuickActionData("find_hospitals", "Find Hospitals", "Domain")
                ),
                recentActivities = emptyList()
            )
            UserRole.ACCOUNTANT -> DashboardSummary(
                role = role,
                welcomeTitle = "Finance & Revenue Ledger",
                subtitle = "Integer paise billing & insurance claims at $hospitalName",
                metrics = listOf(
                    MetricCardData("Invoices", "$invoicesCount Generated", "Exact paise ledger", true, "ReceiptLong"),
                    MetricCardData("Collections", "₹0.00", "Idempotent payment log", true, "AccountBalanceWallet"),
                    MetricCardData("Insurance Claims", "0 Active", "TPA pre-auth & settlement", true, "Verified"),
                    MetricCardData("Credit Notes", "0 Issued", "Audited adjustments", true, "Description")
                ),
                quickActions = listOf(
                    QuickActionData("billing", "Service Billing & Claims", "Payments"),
                    QuickActionData("saas_portal", "SaaS Subscription & Plans", "DomainVerification"),
                    QuickActionData("find_hospitals", "Find Hospitals", "Domain"),
                    QuickActionData("security_center", "Audit & Security Center", "Security")
                ),
                recentActivities = emptyList()
            )
            UserRole.HOSPITAL_ADMIN -> DashboardSummary(
                role = role,
                welcomeTitle = "Hospital Administration",
                subtitle = "Operations, onboarding & SaaS subscription for $hospitalName",
                metrics = listOf(
                    MetricCardData("Patients", "$registeredPatientsCount Registered", "Hospital registry", true, "People"),
                    MetricCardData("Appointments", "$scheduledAppointmentsCount Scheduled", "Department slots", true, "Event"),
                    MetricCardData("Invoices", "$invoicesCount Generated", "Financial ledger", true, "Payments"),
                    MetricCardData("SaaS Plan", "Configurable", "Starter / Pro / Enterprise", true, "Verified")
                ),
                quickActions = listOf(
                    QuickActionData("saas_portal", "SaaS Onboarding & Plans", "DomainVerification"),
                    QuickActionData("view_ehr", "Patients, Doctors & EHR", "People"),
                    QuickActionData("billing", "Billing & Financials", "Payments"),
                    QuickActionData("find_hospitals", "Ranchi Hospital Directory", "Domain")
                ),
                recentActivities = emptyList()
            )
            UserRole.SUPER_ADMIN -> DashboardSummary(
                role = role,
                welcomeTitle = "MediCore Platform Governance",
                subtitle = "Ranchi Hospital Directory ($directoryCount records) & Multi-Tenant SaaS Control",
                metrics = listOf(
                    MetricCardData("Ranchi Directory", "$directoryCount Hospitals", "RNC001–RNC025 loaded", true, "Domain"),
                    MetricCardData("Pending Verification", "$pendingCount Records", "Awaiting admin verification", false, "PendingActions"),
                    MetricCardData("Verified Facilities", "$verifiedCount Hospitals", "Confirmed contact data", true, "Verified"),
                    MetricCardData("SaaS Plans", "3 Tiers Active", "Starter, Pro, Enterprise", true, "CheckCircle")
                ),
                quickActions = listOf(
                    QuickActionData("admin_directory", "Manage Directory (25)", "DomainVerification", "$pendingCount Pending"),
                    QuickActionData("find_hospitals", "Find Hospitals", "Domain"),
                    QuickActionData("saas_portal", "SaaS Governance & Plans", "Analytics"),
                    QuickActionData("security_center", "Security, MFA & Outbox", "Security")
                ),
                recentActivities = emptyList()
            )
        }
    }
}
