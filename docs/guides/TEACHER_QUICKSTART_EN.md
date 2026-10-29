# BodhAI Teacher Quick-Start Guide (English)

Welcome to **BodhAI**, an adaptive mastery learning platform designed specifically for middle and secondary schools (Classes 6–10) in India. Aligned with the **National Education Policy (NEP 2020)** and **NCERT/CBSE** curriculum standards, BodhAI helps you pinpoint learning gaps, deliver personalized practice, and track competency mastery effortlessly.

---

## 1. 5-Minute Setup & Classroom Creation

### Step 1: Sign In as Teacher

1. Open [https://bodhai.org](https://bodhai.org) (or your local school server address).
2. Select your preferred language (English or हिन्दी) using the language toggle in the header.
3. Sign in using your registered teacher email or username.

### Step 2: Create a Class Section

1. Navigate to **"My Classes"** (`/en/classes`).
2. Click **"+ Create New Class"**.
3. Fill in:
   - **Grade**: Select Class 6, 7, 8, 9, or 10.
   - **Section**: e.g., Section A, B, or C.
   - **Subject**: Mathematics, Science, English, or Social Science.
4. Click **Save**. Your class code and dashboard are immediately generated.

---

## 2. Enrolling Students (DPDP Act Privacy Compliant)

BodhAI strictly complies with the **Digital Personal Data Protection (DPDP) Act 2023**:

- **Zero Student PII**: Never enter student emails, phone numbers, home addresses, or Aadhaar numbers.
- **Roll Number Pseudonyms**: Students are registered simply by Class, Section, and Roll Number (e.g. `Roll No. 14` or `7A-14`).
- **Guardian Consent**: Guardians confirm the privacy policy once via the school consent portal.

---

## 3. Running an Adaptive Diagnostic Assessment

1. In your classroom dashboard, click **"Assign Diagnostic Assessment"**.
2. Choose a curriculum unit (e.g., _Class 7: Integers & Fractions_).
3. Students open BodhAI on school tablets, mobile phones, or computer lab browsers.
4. **How the Adaptive Engine Works**:
   - The engine presents questions starting at baseline difficulty.
   - If a student answers correctly, difficulty increases to test transfer skills.
   - If a student struggles, the engine branches to foundational prerequisite concepts to pinpoint the exact root misconception.

---

## 4. Reading the Classroom Competency Heatmap

Your live teacher dashboard organizes learning progress into intuitive mastery bands:

| Color Code    | Mastery Range     | Recommended Action                                                 |
| :------------ | :---------------- | :----------------------------------------------------------------- |
| 🟢 **Green**  | **$\ge 80\%$**    | Student has mastered the concept. Assign enrichment challenges.    |
| 🟡 **Yellow** | **$50\% - 79\%$** | Developing competency. Student benefits from 1-2 scaffolded hints. |
| 🔴 **Red**    | **$< 50\%$**      | Foundational gap detected. Targeted remediation required.          |

### Error Pattern Analysis

Click on any skill cell to view the **Distractor Breakdown**:

- See which incorrect option was most frequently selected.
- Read BodhAI's automated pedagogical explanation (e.g. _"Student adds denominators directly when adding fractions: $\frac{1}{2} + \frac{1}{3} = \frac{2}{5}$"_).

---

## 5. Offline Mode for Low-Connectivity Schools

Many Indian classrooms have intermittent or zero internet connectivity. BodhAI is built offline-first:

1. **Pre-download**: Open BodhAI on school devices while connected to Wi-Fi once in the morning.
2. **Offline Practice**: Students complete quizzes, diagnostic assessments, and practice exercises without an active internet connection. All answers are saved locally in the browser's encrypted IndexedDB storage.
3. **Automatic Sync**: When the teacher's phone or school device reconnects to a hotspot, the outbox queue automatically synchronizes all attempts to the central school server. No learning progress is ever lost.

---

## 6. The Socratic AI Tutor & Hint Ladders

When students need help, BodhAI provides **Socratic hints** rather than direct answers:

- **Level 1 Hint**: Restates the problem using verified NCERT textbook definitions.
- **Level 2 Hint**: Decomposes the problem into intermediate steps.
- **Level 3 Hint**: Provides a similar worked example to scaffold independent thinking.

---

## 7. Exporting Reports

Click **"Export CSV / PDF Report"** in your classroom view:

- Generate printable progress cards for Parent-Teacher Meetings (PTMs).
- All reports display roll numbers and skill mastery percentages without personal contact details.
