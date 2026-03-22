# CareXR Mobile App — Master Implementation Roadmap

> Source of truth: `/docs/CareXR_Mobile_App_Specifications.md` and `/docs/SETUP_GUIDE.md`
> Re-read both before making any meaningful implementation decision.
> Work milestone by milestone. Do not proceed to the next milestone without explicit approval.

---

## Milestone 1: Project Foundation & Firebase Setup

### Goal
Establish the Expo project skeleton, connect it to Firebase, configure Firestore collections and security rules, seed the two MVP exercises, and confirm the dev environment is fully working before any UI is built.

### Prerequisites
- Node.js and npm installed
- Expo CLI installed (`npm install -g expo-cli` or use `npx expo`)
- Firebase account with a project created (`ergotherapy-app` or equivalent)
- Firebase CLI installed (`npm install -g firebase-tools`)

### Deliverables
- [ ] Expo project initialized with TypeScript template
- [ ] Folder structure matching spec section 18 in place
- [ ] Firebase project created and configured
- [ ] `google-services.json` / `GoogleService-Info.plist` added (or env vars via `app.config.ts`)
- [ ] `firebase` and `@react-native-firebase/app` (or Firebase JS SDK v9+) installed
- [ ] Firestore database created in production mode
- [ ] Firestore security rules deployed (role-aware, per spec section 11)
- [ ] `users`, `exercises`, `exercise_steps`, `patient_assignments`, `exercise_attempts` collections confirmed
- [ ] Seed script run: two exercises created (`wash-tomato`, `cut-tomato`) with all steps
- [ ] `.env` / `app.config.ts` environment variables set
- [ ] App boots in Expo Go / development build without errors
- [ ] Demo therapist account + demo patient account manually created in Firebase Auth console (or via seed script)

### Detailed Tasks

#### 1.1 Initialize Expo Project
- Run `npx create-expo-app carexr --template` with TypeScript blank template
- Confirm `app.json` / `app.config.ts` is present
- Set app name, slug, and bundle ID

#### 1.2 Set Up Folder Structure
Create the following directories per spec section 18:
```
app/
  (auth)/
  (therapist)/
  (patient)/
src/
  components/
  features/auth/
  features/therapist/
  features/patient/
  features/assignments/
  features/exercises/
  services/firebase/
  services/repositories/
  hooks/
  store/
  theme/
  types/
  utils/
```

#### 1.3 Install Core Dependencies
```
expo-router (or react-navigation)
firebase (JS SDK v9+)
@react-native-async-storage/async-storage
react-native-safe-area-context
react-native-screens
expo-status-bar
typescript types
```

#### 1.4 Firebase Project Configuration
- Create Firebase project in console
- Enable Email/Password authentication
- Create Firestore database (production mode, nearest region)
- Download config and wire into `app.config.ts` or `src/services/firebase/config.ts`

#### 1.5 Firestore Security Rules
Deploy rules per spec section 11 and setup guide section 3:
- patients read/write own data
- therapists read/write assignments and read linked patient attempts
- only therapists/admins write exercises and assignments
- unauthenticated access blocked

#### 1.6 Seed Database
Create `scripts/seed-db.ts` (or `.js`) that inserts:
- Exercise: `wash-tomato` with 5 steps (locate, pick up, place under water, rinse, put down)
- Exercise: `cut-tomato` with 6 steps (locate knife, grip safely, place tomato, position knife, slice, put knife down)
- Reference: setup guide section 6 for cut-tomato step shape

#### 1.7 Verify Setup
- App runs on device/simulator
- Firebase console shows collections after seed
- Can log in with demo accounts in Firebase Auth console
- Auth listener returns user object

### Done When
- Expo app boots cleanly
- Firestore shows seeded exercises
- Firebase Auth has at least one therapist and one patient demo account
- Security rules are deployed and tested (read blocked without auth)

---

## Milestone 2: Authentication & Onboarding

### Goal
Build the first-launch onboarding carousel, login screen, and role-based routing so the correct experience loads after authentication.

### Prerequisites
- Milestone 1 complete
- Firebase Auth and Firestore working

### Deliverables
- [ ] Splash screen
- [ ] Onboarding carousel (5 slides, shown only once, flag in AsyncStorage)
- [ ] Login screen (email + password, Firebase Auth)
- [ ] Auth context / provider with persistent session
- [ ] Role-based router: `therapist` → therapist tabs, `patient` → patient tabs
- [ ] Logout available from Profile screen stub
- [ ] Loading/error states on login

### Detailed Tasks

#### 2.1 Auth Context (`src/features/auth/AuthContext.tsx`)
- Wrap app with `AuthProvider`
- Subscribe to `onAuthStateChanged`
- On auth, fetch user doc from `users/{uid}` to get role
- Expose: `user`, `role`, `loading`, `login()`, `logout()`
- Persist session automatically via Firebase's built-in persistence

#### 2.2 Onboarding Carousel (`app/(auth)/onboarding.tsx`)
5 slides per spec section 7.2:
1. Welcome to CareXR
2. What is executive dysfunction
3. How guided AR helps task initiation and sequencing
4. How therapists assign and track exercises
5. Get started / Log in CTA

- Use `AsyncStorage` key `onboarding_completed` to gate first-launch
- After completion, write flag and navigate to Login
- Never show again after flag is set

#### 2.3 Login Screen (`app/(auth)/login.tsx`)
- Email and password fields
- "Sign in" button → `signInWithEmailAndPassword`
- Error message for wrong credentials
- Loading state while auth resolves
- No registration screen needed for MVP (accounts created manually/via seed)

#### 2.4 Role-Based Router
- After successful login, read `role` from Firestore user doc
- `therapist` → redirect to `/(therapist)/`
- `patient` → redirect to `/(patient)/`
- If role is missing or unexpected, show error and logout

#### 2.5 Bottom Tab Navigation
Set up two separate tab navigators:
- Therapist tabs: Home, Patients, Assignments, Profile
- Patient tabs: Home, Tasks, Progress, Profile

#### 2.6 Profile Screen Stub
- Show user name and email
- Logout button

### Done When
- First launch shows onboarding
- Second launch skips onboarding and goes to Login
- Therapist login lands on therapist tabs
- Patient login lands on patient tabs
- Logout clears session and returns to Login

---

## Milestone 3: Therapist Experience

### Goal
Build the full therapist workflow: dashboard, searchable patient list, patient detail screen, and assignment creation flow. All writes must land in Firestore.

### Prerequisites
- Milestone 2 complete
- At least one patient user doc in Firestore with `therapistId` set to the demo therapist UID

### Deliverables
- [ ] Therapist dashboard with greeting and summary cards
- [ ] Patient list screen (searchable)
- [ ] Patient detail screen
- [ ] Assign exercise modal/screen (Wash Tomato or Cut Tomato only)
- [ ] Assignment saved to `patient_assignments` in Firestore
- [ ] Assignment success confirmation screen/toast
- [ ] Loading and empty states for all screens

### Detailed Tasks

#### 3.1 Therapist Dashboard (`app/(therapist)/index.tsx`)
- Greeting with therapist name
- Summary cards: total patients, pending assignments, recently active
- Entry point to Patient List
- Simple adherence overview (counts, not charts, for MVP)

#### 3.2 Patient List (`app/(therapist)/patients.tsx`)
- Query `users` where `role == 'patient'` and `therapistId == currentTherapistUid`
- Display: name, quick status, overdue/upcoming assignment indicator
- Search bar filtering by name (client-side)
- Tap row → Patient Detail
- Empty state: "No patients yet"

#### 3.3 Patient Detail (`app/(therapist)/patient/[id].tsx`)
- Fetch patient user doc
- Show: name, profile notes, age range, primary challenges
- List assigned exercises (query `patient_assignments` where `patientId == id`)
- Per assignment: exercise name, status badge, attempt count, last attempted date
- "Assign New Exercise" button at bottom

#### 3.4 Assignment Creation (`app/(therapist)/assign/[patientId].tsx`)
Form fields:
- Exercise template picker: Wash Tomato | Cut Tomato
- Target repetitions per day (number input, default 1)
- Number of days (number input, default 7)
- Due date picker (optional)
- Patient instructions (text area, optional)

On submit:
- Validate fields
- Write to `patient_assignments`:
  ```
  therapistId, patientId, exerciseId, exerciseName,
  status: 'assigned', targetRepetitionsPerDay, numberOfDays,
  assignedDate: now, dueDate, instructions, attemptCount: 0,
  createdAt, updatedAt
  ```
- Show success confirmation
- Navigate back to Patient Detail

#### 3.5 Firestore Repository (`src/services/repositories/assignmentRepository.ts`)
- `createAssignment(data)` → writes to `patient_assignments`
- `getAssignmentsByPatient(patientId)` → queries assignments
- `getPatientsByTherapist(therapistId)` → queries users

### Done When
- Therapist can log in, see their patients
- Therapist can open a patient and see their assignments
- Therapist can assign Wash Tomato or Cut Tomato to a patient
- Assignment document appears in Firestore `patient_assignments`
- Patient detail reflects the new assignment immediately

---

## Milestone 4: Patient Experience

### Goal
Build the full patient workflow: dashboard showing today's tasks, task detail, AR launch handoff, attempt logging, and completion summary.

### Prerequisites
- Milestone 3 complete
- At least one `patient_assignments` document in Firestore for the demo patient

### Deliverables
- [ ] Patient dashboard with today's tasks and launch button
- [ ] Assigned tasks list
- [ ] Task detail screen
- [ ] AR launch handoff (pass assignment context, simulate or real)
- [ ] Attempt logged to `exercise_attempts` on completion
- [ ] `patient_assignments` status updated after attempt
- [ ] Completion summary screen
- [ ] Loading and empty states

### Detailed Tasks

#### 4.1 Patient Dashboard (`app/(patient)/index.tsx`)
- Welcoming greeting with patient name
- Today's assigned tasks (filter by due date or status `assigned`/`in-progress`)
- "Next recommended action" card
- Simple progress snapshot: sessions completed this week
- Launch AR button on the active task card

#### 4.2 Assigned Tasks List (`app/(patient)/tasks.tsx`)
- Query `patient_assignments` where `patientId == currentUser.uid`
- Show: exercise name, therapist instructions snippet, status, due date
- Status badges: Assigned / In Progress / Completed
- Tap → Task Detail
- Empty state: "Your therapist hasn't assigned any tasks yet."

#### 4.3 Task Detail (`app/(patient)/task/[id].tsx`)
Per spec section 7.4:
- Exercise name
- Therapist instructions
- Target repetitions and due date
- Simple explanation of what happens in AR ("You'll be guided step by step through the exercise using your AR glasses.")
- Launch button

#### 4.4 AR Launch Handoff
On launch button tap:
- Prepare context object: `{ assignmentId, exerciseId, exerciseName, patientId, launchTimestamp }`
- For MVP: store context in AsyncStorage or a shared store so the AR module can read it
- Navigate to Launch AR screen (`app/(patient)/launch.tsx`) which displays a "Starting AR session…" loading state
- The AR experience (Snap Spectacles) runs separately; the app waits for result

#### 4.5 Simulate AR Completion (for demo)
Since the Spectacles lens runs independently, the app needs a way to receive the result for demo purposes:
- Add a "Mark as Completed" button on the Launch AR screen (simulates AR result for demo)
- On press: write attempt to `exercise_attempts`, update assignment status

#### 4.6 Attempt Logging (`src/services/repositories/attemptRepository.ts`)
Write to `exercise_attempts`:
```
patientId, assignmentId, exerciseId,
startedAt, completedAt, duration,
completed: true, successful: true,
errorCount: 0, metrics: { overallScore: 100, stepCompletionRate: 1 },
createdAt
```
Also update `patient_assignments` doc:
- `status: 'in-progress'` (or `'completed'` if target met)
- `lastAttemptedAt: now`
- `attemptCount: increment(1)`

#### 4.7 Completion Summary (`app/(patient)/completion.tsx`)
- "Great job!" heading
- Exercise name and duration
- Encouragement copy per spec tone: "You completed today's session."
- Back to Home button

### Done When
- Patient logs in and sees their assigned task
- Patient can tap Launch and simulate completing the AR exercise
- Attempt appears in Firestore `exercise_attempts`
- Assignment `attemptCount` increments
- Completion screen shows with positive feedback

---

## Milestone 5: Progress & Stats

### Goal
Show basic progress data to both the patient and therapist. No complex charts required — clean textual summaries and one simple visual card per role.

### Prerequisites
- Milestone 4 complete
- At least one `exercise_attempts` document in Firestore

### Deliverables
- [ ] Patient Progress screen with sessions, success rate, recent activity
- [ ] Therapist Patient Detail updated with stats card per assignment
- [ ] Simple improvement indicator if multiple attempts exist
- [ ] Empty state when no attempts yet

### Detailed Tasks

#### 5.1 Patient Progress Screen (`app/(patient)/progress.tsx`)
Query `exercise_attempts` where `patientId == currentUser.uid`:
- Total sessions completed
- Success rate (successful / total × 100)
- Current streak or completion count (count days with at least one successful attempt)
- Recent activity list (last 5 attempts with date and score)
- Encouraging copy: "You've completed X sessions this week. Keep going!"

#### 5.2 Therapist Stats Card (update Patient Detail screen)
Per assignment, show a stats summary card:
- Total attempts
- Completion rate
- Last attempted date
- Average duration
- Simple trend: score this week vs last week (if data exists)

#### 5.3 Stats Repository (`src/services/repositories/statsRepository.ts`)
- `getPatientAttempts(patientId, exerciseId?)` → query attempts
- `computeStats(attempts)` → return `{ totalAttempts, completedAttempts, successRate, avgDuration, improvement }`
- Mirrors the stats logic in setup guide section 5 (GET /api/stats/exercises/:exerciseId)

### Done When
- Patient can tap Progress tab and see their sessions
- Therapist can view a patient's stats inline in the Patient Detail screen
- Empty states render cleanly when no attempts exist

---

## Milestone 6: Polish, Edge Cases & Demo Readiness

### Goal
Apply the full UI/UX spec, handle all edge cases, verify the complete demo flow works end-to-end in under 3 minutes, and confirm all acceptance criteria from spec section 20.

### Prerequisites
- Milestones 1–5 complete

### Deliverables
- [ ] Color palette applied app-wide (slate blue, sage, off-white, terracotta accent)
- [ ] Typography hierarchy consistent across all screens
- [ ] Button system applied (filled primary, outlined secondary, danger terracotta)
- [ ] Copy tone matches spec (supportive for patients, efficient for therapists)
- [ ] Loading states on all async operations
- [ ] Error states and retry prompts
- [ ] All edge cases from spec section 17 handled
- [ ] Onboarding does not repeat after first launch
- [ ] Demo flow rehearsed: therapist assigns → patient sees → patient launches → therapist sees updated stats
- [ ] All acceptance criteria from spec section 20 checked off

### Detailed Tasks

#### 6.1 Theme System (`src/theme/`)
- `colors.ts` — export all palette values per spec section 13.1
- `typography.ts` — heading / body / label sizes
- `spacing.ts` — consistent margins and padding
- Apply via StyleSheet or NativeWind across all components

#### 6.2 Shared Component Library (`src/components/`)
- `Card.tsx` — condensed surface container
- `Button.tsx` — primary / secondary / danger variants
- `Badge.tsx` — status indicator (Assigned / In Progress / Completed)
- `EmptyState.tsx` — icon + message + optional CTA
- `LoadingSpinner.tsx`
- `Avatar.tsx` (initials-based)

#### 6.3 Edge Case Handling
Per spec section 17:
- Therapist has no patients → EmptyState on Patient List
- Patient has no tasks → EmptyState on Tasks screen
- Assignment write fails → error toast, form stays populated
- Patient launches without internet → warn and disable launch button
- AR result sync fails → retry option
- Firestore doc missing → graceful fallback, no crash
- Repeated completion submissions → idempotent write (check if attempt already submitted)

#### 6.4 Profile Screen (complete)
- Show name, email, role badge
- Logout button
- App version number

#### 6.5 Demo Walkthrough Checklist
Rehearse the full 11-step demo from spec section 14:
1. Therapist logs in ✓
2. Opens patient list ✓
3. Selects patient ✓
4. Assigns Wash Tomato or Cut Tomato ✓
5. Assignment visible in Firestore console ✓
6. Patient logs in ✓
7. Patient sees assigned task ✓
8. Patient launches AR exercise ✓
9. AR exercise completes (simulated) ✓
10. App records attempt and updates progress ✓
11. Therapist sees updated stats ✓

#### 6.6 Final Acceptance Criteria Check (spec section 20)
- [ ] Therapist and patient can each log in
- [ ] Onboarding appears only once
- [ ] Therapist can view patient list
- [ ] Therapist can assign Wash Tomato or Cut Tomato
- [ ] Assignment saved in Firestore
- [ ] Patient can see newly assigned task
- [ ] Patient can launch AR exercise from app
- [ ] Completion data saved to `exercise_attempts`
- [ ] Therapist can see updated progress
- [ ] UI looks polished and coherent

### Done When
All 10 acceptance criteria are met and the demo flow runs cleanly in under 3 minutes.

---

## Summary Table

| Milestone | Focus | Key Output |
|-----------|-------|------------|
| 1 | Foundation | Expo project, Firebase, seeded data |
| 2 | Auth & Onboarding | Login, role routing, onboarding carousel |
| 3 | Therapist UX | Dashboard, patient list, assignment flow |
| 4 | Patient UX | Task list, AR launch, attempt logging |
| 5 | Stats | Progress screens for both roles |
| 6 | Polish & Demo | Full UI, edge cases, acceptance criteria |

---

> **Workflow rule:** Each milestone must be approved before moving to the next.
> Always re-read `/docs/SETUP_GUIDE.md` and `/docs/CareXR_Mobile_App_Specifications.md` before implementation decisions.
