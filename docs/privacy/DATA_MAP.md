# BodhAI Personal Data Inventory & Data Map

**Statutory Framework:** Digital Personal Data Protection (DPDP) Act, 2023 (Act No. 22 of 2023)  
**Jurisdiction:** Republic of India  
**Target User Cohort:** Students in Classes 6–10 (Minors under 18), Parents/Guardians, School Educators, Administrators  
**Date of Current Map:** October 2026  
**Status:** ACTIVE / ALIGNED TO PLATFORM BEHAVIOR

---

## 1. Overview & Data Fiduciary Details

BodhAI acts as the **Data Fiduciary** under Section 2(i) of the DPDP Act 2023 for data collected and processed directly through the platform. For institutional school adoptions, BodhAI operates in partnership with the respective educational institution, processing data solely for educational diagnostics and mastery learning.

| Attribute                           | Statutory Detail                                              |
| :---------------------------------- | :------------------------------------------------------------ |
| **Data Fiduciary Name**             | BodhAI Educational Technologies                               |
| **Primary Domain**                  | Adaptive Diagnostics & Pedagogical Remediation (Classes 6–10) |
| **Grievance Officer (DPDP Sec 12)** | Data Protection & Grievance Redressal Officer                 |
| **Contact Email**                   | `grievance@bodhai.edu.in`                                     |
| **Postal Address**                  | BodhAI Grievance Desk, New Delhi, India                       |
| **Data Storage Location**           | Republic of India (Strict domestic residency compliance)      |

---

## 2. Data Principal Categories

1. **Student Principals (Minors under Section 9)**: Students enrolled in middle/secondary grades (Classes 6 through 10) who interact with adaptive assessments, hints, and practice items.
2. **Parents / Legal Guardians**: Adults responsible for granting verifiable consent under Section 9(1) of the DPDP Act for minor accounts.
3. **Teachers / Educators**: Instructors who create classroom cohorts, assign diagnostic problem sets, and review class-level prerequisite heatmaps.
4. **School Administrators**: Institutional leaders who review aggregate school-wide proficiency benchmarks and compliance audit logs.

---

## 3. Data Inventory & Classification

| Data Category                   | Specific Elements                                                                                                                                                        | Data Principal             | Purpose of Processing                                                       | Lawful Basis (DPDP Act)                               | Storage & Encryption                                               | Retention Period                                                                                    |
| :------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------- | :-------------------------------------------------------------------------- | :---------------------------------------------------- | :----------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| **Account Identifiers**         | Full Name, Username, Email (optional for students), Phone (optional for students), Role (`student`, `teacher`, `admin`), Preferred Language                              | Students, Teachers, Admins | Account provisioning, role-based access control, session authentication     | Consent (Sec 6) / Verifiable Parental Consent (Sec 9) | Postgres `users` table; Encrypted at rest (AES-256)                | Retained during active enrollment; Anonymized within 30 days of deletion request.                   |
| **Authentication Credentials**  | Hashed Password, Hashed PIN (for student fast-login), Active Session Token Hash (`token_hash`)                                                                           | All Users                  | Authenticating identity, preventing unauthorized access                     | Security & System Integrity (Sec 4)                   | Passwords hashed with Argon2id; Session tokens hashed with SHA-256 | Expired sessions automatically purged weekly; Tokens revoked on logout.                             |
| **Guardian Verifiable Consent** | Guardian Full Name, Mobile Phone Number, Relationship Type (Mother, Father, Legal Guardian), Consented Scopes (`diagnostic`, `learning`, `offline_sync`), Policy Version | Parents / Guardians        | Complying with Section 9 mandatory verifiable parental consent for children | Legal Obligation (Sec 9) & Explicit Consent (Sec 6)   | Postgres `guardians` & `consents` tables                           | Retained for the statutory duration of the child's enrollment + 1 year for compliance auditability. |
| **Learning Telemetry**          | Question ID, Selected Answer, Correctness (`is_correct`), Time Spent (`time_spent_ms`), Hint Ladder Step                                                                 | Student (Minor)            | Bayesian Knowledge Tracing (BKT) mastery calibration, difficulty adjustment | Explicit Consent (Sec 6) / Parental Consent (Sec 9)   | Postgres `attempts` table & IndexedDB on device                    | Retained for current academic year + 1 historical baseline year; Anonymized upon account deletion.  |
| **Skill Mastery State**         | Skill ID, Probability of Mastery ($P(L)$), Confidence Score, Number of Practice Observations, Mastery Tier                                                               | Student (Minor)            | Recommending adaptive questions, generating teacher prerequisite heatmaps   | Explicit Consent (Sec 6) / Educational Assessment     | Postgres `mastery` table                                           | Retained during active enrollment; Anonymized upon account deletion.                                |
| **AI Tutor Interaction**        | Redacted student inquiry, RAG context chunk IDs, Pedagogical response, Safety moderation flag, Token count                                                               | Student (Minor)            | Providing Socratic conceptual hints on NCERT topics; Ensuring child safety  | Explicit Consent (Sec 6) & Child Safety Protection    | Postgres `tutor_logs` table (PII pre-redacted)                     | Hard pruned after 90 days (`tutor_log_retention_days`).                                             |
| **Offline Sync Cache**          | Client Event ID (UUIDv4), Sync Payload, Client Monotonic Timestamp, Sync Status                                                                                          | Student (Minor)            | Offline-first learning continuity in intermittent connectivity environments | Legitimate Educational Purpose                        | Local browser IndexedDB & Postgres `sync_events`                   | Client cache cleared on logout; Server sync event logs pruned after 30 days.                        |
| **Security Audit Logs**         | User ID (nullable), Action (`login`, `consent_granted`, `data_erasure`), Resource Type & ID, Diff, Client IP, Timestamp                                                  | All Users                  | Information security monitoring, DPDP compliance verification               | Legal Obligation (Sec 8) & Security (Sec 4)           | Postgres `audit_logs` table (Immutable write-only)                 | Retained for 1 year for statutory review; Admin access restricted.                                  |

---

## 4. Prohibited Data Categories (Explicitly Never Collected)

Under BodhAI's architectural data minimization guardrails, the system **never** requests or stores:

- Aadhaar Numbers or Official Identity Card numbers
- Biometric Data (Fingerprint, Facial scan, Voice print)
- Financial or Banking Data (Credit/Debit cards, UPI handles, Net banking credentials)
- Precise GPS Geolocation coordinates (Permissions-Policy header explicitly blocks geolocation)
- Behavioral advertising profiles or commercial tracking cookies

---

## 5. Third-Party Data Processors

BodhAI strictly prohibits targeted advertising to children under Section 9(3) of the DPDP Act. Third-party processors are limited to essential operational infrastructure:

| Processor                            | Role                                                    | Data Shared                                                  | Transfer Mechanism                 | Security Safeguards                                                |
| :----------------------------------- | :------------------------------------------------------ | :----------------------------------------------------------- | :--------------------------------- | :----------------------------------------------------------------- |
| **Domestic Cloud Hosting (India)**   | Ingress & Compute (Next.js, FastAPI, PostgreSQL, Redis) | All encrypted application data                               | Domestic (Mumbai/Hyderabad Region) | SOC 2 Type II, ISO 27001, AES-256 encryption at rest, TLS 1.3      |
| **External LLM Provider (Optional)** | AI Tutor text completion                                | Scrubbed educational questions with all student PII redacted | HTTPS API                          | Zero-data retention agreement; Inputs excluded from model training |

---

## 6. Data Principal Rights (DPDP Act Chapter III)

| Right                                  | Statutory Reference | Platform Implementation                                               | Endpoint / UI Surface                                |
| :------------------------------------- | :------------------ | :-------------------------------------------------------------------- | :--------------------------------------------------- |
| **Right to Access Information**        | DPDP Act Sec 11     | Complete data portability export in structured JSON format            | `GET /v1/data-rights/export/{student_id}`            |
| **Right to Correction & Updating**     | DPDP Act Sec 12     | Profile update endpoints for name, language, and preferences          | `PATCH /v1/users/me`                                 |
| **Right to Erasure / To Be Forgotten** | DPDP Act Sec 12     | Immediate PII anonymization and soft-deletion with consent revocation | `POST /v1/data-rights/delete/{student_id}`           |
| **Right to Grievance Redressal**       | DPDP Act Sec 13     | Dedicated contact form and direct Grievance Officer ticketing         | `apps/web/src/app/[locale]/contact` & Privacy Policy |
| **Right to Nominate**                  | DPDP Act Sec 14     | Guardian relationship assignment for minors                           | `apps/web/src/app/[locale]/consent`                  |

---

## 7. Automated Retention & Deletion Schedule

| Job Name                    | Frequency | Target Entities                                              | Action Taken                                                 |
| :-------------------------- | :-------- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| **Session Cleanup**         | Daily     | `sessions` where `expires_at < now()` or `is_revoked = true` | Permanent record deletion                                    |
| **Tutor Log Pruning**       | Daily     | `tutor_logs` older than 90 days                              | Hard deletion of query/response logs                         |
| **Sync Queue Pruning**      | Weekly    | `sync_events` older than 30 days with status `processed`     | Permanent record deletion                                    |
| **Soft-Deleted User Purge** | Weekly    | `users` soft-deleted > 30 days prior                         | Complete permanent anonymization and orphaned record cleanup |
