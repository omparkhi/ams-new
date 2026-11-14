# User Flow & Operational Journey Documentation
**Product:** Attendify AMS (Modern Cloud Biometric Attendance & Payroll Platform)  
**Version:** 3.0.0 (Production Release)  
**Target Audience:** Product Teams, HR Administrators, Reception Supervisors, Engineering  

---

## 1. System Personas & Permission Levels

```mermaid
graph LR
    SuperAdmin["1. Company Admin / HR Manager"] ---|Full Access| AdminPortal["Unified Admin Portal (/app)"]
    Receptionist["2. Front-Desk / Tablet Operator"] ---|PIN Gate| KioskPortal["Dedicated Kiosk Portal (/kiosk/:orgSlug)"]
    Employee["3. Student / Intern / Staff"] ---|Face Biometrics| CameraInput["Webcam Biometric Feed"]

    AdminPortal --> Settings["Shift & Kiosk Settings"]
    AdminPortal --> LiveRoster["Live Attendance Roster & Snapshots"]
    AdminPortal --> PayrollSec["Confidential Payroll & Payslips"]
    
    KioskPortal --> PunchAction["Biometric Punch In / Punch Out"]
    KioskPortal --> SelfEnroll["Self-Registration (20-Frame Burst)"]
```

| Persona | Primary Interface | Authentication Required | Accessible Features | Security Boundaries |
| :--- | :--- | :--- | :--- | :--- |
| **Company Admin / HR** | `/app` (Admin Portal) | Username + Password (JWT) | Dashboard analytics, Shift setup, Live roster, Manual overrides, Excel exports, Payroll processing, Payslips | Partitioned by `Company ID`; strictly cannot view other tenants |
| **Front-Desk Kiosk** | `/kiosk/:orgSlug` | 6-Digit Kiosk Access PIN | Touchscreen face scan, Check-in / Check-out, Student self-enrollment, 12-hr IST clock | **Zero access** to payroll, employee salary figures, or global settings (`403 Forbidden`) |
| **Student / Intern** | Camera Viewfinder | Face Biometrics (128-d) | Face scan, instant visual verification tick modal, personal expected checkout notification | Cannot tamper with logs or access administrative endpoints |

---

## 2. End-to-End User Journeys

### Journey 1: Tenant Onboarding & Organization Setup

```mermaid
flowchart TD
    Start([User visits /signup]) --> FormInput["Fills Company Name, Work Email, Username, Password, Shift Times"]
    FormInput --> SubmitRegister["Click 'Create Company Account'"]
    SubmitRegister --> BackendProvision["Backend generates Company ID, Unique Slug, Random 6-Digit Kiosk PIN"]
    BackendProvision --> AutoLogin["Issues JWT Token & stores in localStorage"]
    AutoLogin --> AdminDashboard["Redirects to Unified Admin Dashboard (/app)"]
    AdminDashboard --> ReviewKiosk["Admin views Kiosk Share Card with Link & PIN"]
```

1. **Sign-Up Entry (`/signup`):**
   - The organization administrator navigates to `/signup`.
   - Admin provides:
     - Company Name (e.g. `Acme Corp`)
     - Work Email (e.g. `hr@acme.com`)
     - Admin Username & Password
     - Daily Shift Timings (Shift Start, Shift End, Required Daily Hours, e.g. `09:00 AM - 06:00 PM`)
2. **Automated Tenant Initialization:**
   - The backend provisions a unique `Company ID` (`Acme_Corp_01`).
   - Generates a custom web-friendly URL slug (`/kiosk/acme-corp`).
   - Issues a cryptographically random 6-digit Kiosk PIN (e.g. `749213`).
   - Creates the dedicated multi-tenant tables in PostgreSQL.
3. **Landing on Dashboard:**
   - The admin is immediately redirected to the **Unified Admin Panel** (`/app`).
   - The top banner on the Overview tab showcases the shareable Kiosk link and PIN.

---

### Journey 2: Student / Intern Biometric Self-Enrollment

This workflow can occur directly on the **Front-Desk Kiosk (`/kiosk/:orgSlug`)** or from the **Admin Panel (`Enroll Student` modal)**:

```mermaid
stateDiagram-v2
    [*] --> NameEntry : Enter Student Full Name
    NameEntry --> CameraStream : Access Front-Facing Camera
    CameraStream --> BurstCapture : Click "Start Biometric Capture"
    
    state BurstCapture {
        [*] --> Frame1 : Capture Frame 1 (0%)
        Frame1 --> Frame10 : Capture Frame 10 (50%)
        Frame10 --> Frame20 : Capture Frame 20 (100%)
    }

    BurstCapture --> BiometricValidation : Send 20 Frames to Backend
    
    state BiometricValidation {
        QualityCheck : Extract 128-d Embeddings (min 5 vectors)
        DuplicateCheck : Cross-Check Against All Company Enrolled Faces
    }

    BiometricValidation --> Rejected : Match found with existing student (D < 0.35)
    BiometricValidation --> Approved : Face is unique

    Rejected --> NameEntry : Show Red Alert: "Face already enrolled under [Name]"
    Approved --> Stored : Save Vectors in PostgreSQL & Save Profile Photo
    Stored --> [*] : Show Green Tick & Auto-switch to Scan Tab
```

1. **Student Approaches Terminal:**
   - Selects the **New Intern / Student Enrollment** tab.
   - Enters their full name (e.g., `Om Parkhi`).
2. **Camera Alignment & Burst Capture:**
   - Camera preview activates.
   - User clicks **Start Biometric Capture**.
   - Over 6 seconds, 20 consecutive frames are captured at 300ms intervals, providing a smooth animated progress bar (0% $\to$ 100%).
3. **Biometric Validation & Duplicate Check:**
   - The backend validates lighting and extracts 128-dimensional feature vectors.
   - **Anti-Duplication Guard:** The candidate vectors are cross-checked against all existing enrolled employees.
   - If the face matches an already registered user, enrollment is stopped with an alert:  
     `"Biometric validation failed: This face is already enrolled under [Existing Name]. A student cannot be registered multiple times under different names."`
4. **Completion:**
   - If unique, the vectors are saved into `FaceEmbeddings`, and frame 0 is stored as their permanent profile photo.
   - A green confirmation message appears, and the kiosk switches to the Scan tab.

---

### Journey 3: Daily Front-Desk Kiosk Attendance Punch (Check-In & Check-Out)

```mermaid
flowchart TD
    Arrive([Employee arrives at Kiosk /kiosk/:orgSlug]) --> FaceCamera["Aligns face in camera viewfinder"]
    FaceCamera --> ClickScan["Clicks 'Verify & Mark Attendance'"]
    ClickScan --> ProcessFace["Backend matches face against 128-d vectors (D < 0.45)"]
    
    ProcessFace --> CheckStatus{"Evaluate Today's Record for User"}
    
    CheckStatus -->|First scan today| CheckInAction["Action: Check-In"]
    CheckInAction --> SaveCheckInPhoto["Save check-in snapshot proof to disk"]
    SaveCheckInPhoto --> ShowTickCheckIn["Show Green Tick Modal:\n'Checked In at 09:15:30 AM IST'\nExpected Out: 05:15:30 PM IST"]
    
    CheckStatus -->|Scanned < 3s after check-in| BlockAction["Cooldown Blocked:\n'Check-in just recorded. Please wait.'"]
    
    CheckStatus -->|Checked in earlier, no checkout| CheckOutAction["Action: Check-Out"]
    CheckOutAction --> CalcHours["Compute Worked Duration & Day Status (Full / Half Day)"]
    CalcHours --> PreserveSnapshot["Preserve check-in photo (NEVER delete)"]
    PreserveSnapshot --> ShowTickCheckOut["Show Green Tick Modal:\n'Checked Out at 05:20:10 PM IST'\nTotal: 8.1 hrs (Full Day)"]
    
    CheckStatus -->|Already checked out today| CompletedAction["Notice:\n'Attendance already completed for today'"]
```

1. **Punch In (Morning):**
   - Employee walks up to the reception tablet and clicks **Verify & Mark Attendance**.
   - Biometric engine matches face in $< 500\text{ ms}$.
   - Check-in timestamp is recorded in Indian Standard Time (12-hour AM/PM format, e.g., `09:14:22 AM IST`).
   - Expected check-out time is calculated based on company policy (`05:14:22 PM IST`).
   - Check-in snapshot proof is captured and permanently stored for admin review.
   - Animated green right-tick modal pops up and automatically dismisses after 3.8 seconds.
2. **Accidental Rescan Guard:**
   - If the student taps the button again within 3 seconds, a friendly cooldown notice prevents duplicate check-in.
3. **Punch Out (Evening):**
   - Employee returns at the end of the shift and taps the scan button.
   - The system recognizes prior check-in, calculates exact elapsed hours, categorizes day status (`Full Day` if $\ge \text{required hours}$, else `Half Day`).
   - The morning check-in snapshot proof is **safely retained** for supervisory compliance.

---

### Journey 4: Admin Live Monitoring & Snapshot Review

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Company Admin
    participant Dashboard as Unified Admin Panel (/app)
    participant API as /api/attendance/today
    participant ImageAPI as /api/attendance/snapshot/<filename>

    Admin->>Dashboard: Open "Live Attendance Roster" Tab
    Dashboard->>API: GET /attendance/today
    API-->>Dashboard: Return JSON roster with status & snapshot_url
    Dashboard->>Dashboard: Render member cards with live IST times
    Dashboard->>ImageAPI: Fetch avatar thumbnails
    Admin->>Dashboard: Click "View Photo" on an employee row
    Dashboard->>Dashboard: Open "Check-In Snapshot Proof" Modal
    Dashboard-->>Admin: Display high-res timestamped webcam snapshot
```

1. **Dashboard Overview:**
   - Real-time statistics: Total Enrolled, Present Today, Absent Today, Completed Today.
   - Work hours area chart and presence donut gauge update dynamically.
2. **Live Roster Inspection:**
   - Tab displays every enrolled student with status chips (`Present`, `Absent`), punch-in time, punch-out time, hours logged, and day status.
3. **Biometric Snapshot Proof:**
   - Every checked-in employee row displays a **"View Photo"** button and avatar thumbnail.
   - Clicking opens the high-resolution modal preview of the exact photo taken at the front-desk camera during punch-in.
4. **Administrative Overrides:**
   - If an employee forgot to scan out, the supervisor can click **Force Checkout**.
   - If a camera was down, the supervisor can execute **Manual Check-In**.

---

### Journey 5: End-of-Month Automated Biometric Payroll

```mermaid
flowchart TD
    AdminNav([Admin opens 'Payroll & Compensation' Tab]) --> SelectPeriod["Select Month, Year, and Total Working Days (e.g. 26)"]
    SelectPeriod --> AutoCalc["Click 'Calculate Monthly Payroll'"]
    
    AutoCalc --> EngineProcess["Payroll Engine aggregates all AttendanceRecords:\n- Sums Full Days & Half Days\n- Calculates LOP (Loss of Pay) deductions\n- Computes Gross & Net Pay"]
    
    EngineProcess --> DisplayMatrix["Displays Compensation Table with itemized breakdown per employee"]
    DisplayMatrix --> ReviewRun{"Supervisor Reviews Payroll Numbers"}
    
    ReviewRun -->|Adjustments Needed| EditSalary["Update Employee Base Salary / Stipend"]
    EditSalary --> AutoCalc
    
    ReviewRun -->|Numbers Approved| FinalizeRun["Click 'Finalize & Approve Payroll Run'"]
    FinalizeRun --> LockRun["Locks Monthly Batch in PostgreSQL & Generates Payslips"]
    LockRun --> ViewPayslip["Click 'View Payslip' on any employee"]
    ViewPayslip --> PrintModal["Opens Attendify Printable Payslip Modal with 1-click Print/PDF"]
```

1. **Automated Computation:**
   - Admin opens the Payroll tab and selects the pay period (e.g., November 2026, 26 working days).
   - Biometric attendance data directly informs compensation:
     $$\text{Present Days} = \text{Full Days} + (0.5 \times \text{Half Days})$$
     $$\text{Absent Days} = \text{Working Days} - \text{Present Days} - \text{Approved Leaves}$$
     $$\text{Daily Rate} = \frac{\text{Base Salary}}{\text{Working Days}}, \quad \text{LOP Deduction} = \text{Absent Days} \times \text{Daily Rate}$$
     $$\text{Net Pay} = \text{Gross Salary} - \text{LOP} - \text{PF} - \text{Taxes}$$
2. **Finalization & Audit Lock:**
   - Clicking **Finalize Payroll** writes the record to `PayrollRuns` and freezes the figures against retroactive edits.
3. **Printable Branded Payslips:**
   - Supervisors can generate itemized payslips formatted with the company name, working days, gross earnings, itemized deductions, and net pay in Indian Rupees (`₹`).

---

### Journey 6: Administrative Kiosk Terminal Sharing & PIN Rotation

1. **Kiosk Share Banner:**
   - Displayed directly on the Overview tab of the Admin Panel.
   - Shows the active organization URL slug (`/kiosk/acme`).
   - **Copy Link Button:** 1-click copies the full HTTPS link to clipboard.
2. **PIN Security Controls:**
   - Toggle eye button reveals or hides the 6-digit PIN (`••••••` $\leftrightarrow$ `183678`).
   - **Regen Button:** Dynamically generates a new random PIN in PostgreSQL; immediately revokes old terminal sessions for complete security rotation.
   - **Launch Button:** Opens the terminal in a clean browser tab for front-desk mounting.

