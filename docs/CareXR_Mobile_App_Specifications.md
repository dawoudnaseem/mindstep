# CareXR Mobile Application Specifications

Version: MVP v1.0  
Platform: React Native with Expo  
Backend: Firebase Authentication + Cloud Firestore  
AR Hardware Integration: Snap Spectacles Lens experience (separate AR module)  
Primary Demo Audience: McGillXR CareXR Hackathon judges, Snap Spectacles sponsor, Centre for Digital Brain Therapies sponsor

## 1. Product Overview

CareXR is a therapist-guided mobile application paired with AR glasses to support patients with executive dysfunction. The app allows occupational therapists (ergotherapists) to assign structured daily AR exercises to patients, monitor adherence and progress, and review basic patient-specific task history. On the patient side, the app provides a guided, reassuring experience that delivers therapist-assigned tasks and connects those tasks to an immersive Spectacles AR workflow.

The MVP focuses on a narrow, clear use case for demonstration:
- therapist assigns tomato-related executive-function tasks,
- patient receives and launches assigned tasks,
- patient completes the AR activity on Spectacles,
- completion/progress is written back to Firestore,
- therapist sees progress and simple stats.

The app is not the AR experience itself. It is the orchestration layer between therapist, patient, and database. For the demo, the glasses effectively act as an assistive extension of the occupational therapist.

## 2. Problem Being Solved

The app targets patients who struggle with executive dysfunction, especially around:
- sequencing tasks,
- initiating tasks,
- planning a multi-step activity,
- maintaining attention and working memory while doing a task.

The product reframes an occupational therapy exercise as a concrete, guided, repeatable interaction. Instead of asking a patient to independently plan a task from scratch, the therapist sends a structured exercise. The mobile app delivers it, and the AR layer guides the patient through it in a more intuitive, immediate way.

## 3. MVP Goal

Build a polished hackathon MVP that proves all of the following:
1. a therapist can log in and manage patients,
2. a therapist can assign specific AR exercises to a patient,
3. the assignment is stored in Firebase,
4. a patient can log in and view assigned exercises,
5. the patient can launch the AR task flow from the app,
6. exercise completion/progress can be saved back to Firebase,
7. the therapist can view basic progress and session history.

## 4. Users and Roles

### 4.1 Occupational Therapist / Ergotherapist
Primary clinical operator.

Main responsibilities in the app:
- log in securely,
- browse patient roster,
- open an individual patient profile,
- review basic patient information and exercise history,
- assign exercises,
- set frequency/target repetitions,
- monitor completion and adherence.

### 4.2 Patient
Receives therapist-assigned exercises and launches AR task sessions.

Main responsibilities in the app:
- log in securely,
- view assigned tasks,
- read simple instructions,
- launch the Spectacles-linked AR exercise,
- complete task sessions,
- view simple progress history and encouragement.

### 4.3 Admin (Optional, not required for MVP UI)
Can exist in the database/rules layer for seeding content and internal control. Not necessary as a visible app role during demo.

## 5. Scope for MVP

### In Scope
- mobile onboarding,
- authentication,
- role-based routing,
- therapist dashboard,
- patient dashboard,
- patient list for therapist,
- patient detail screen,
- exercise assignment flow,
- Firestore sync for assignments,
- patient exercise list,
- task launch handoff to AR flow,
- progress logging from completed attempts,
- simple therapist-side stats,
- simple patient-side completion history,
- professional UI.

### Out of Scope
- full EMR-grade medical record system,
- advanced insurance/legal billing workflows,
- real hospital integration,
- chat or video calling,
- many exercise categories,
- offline-first sync conflict handling,
- tablet/desktop optimized layouts,
- full clinical note writing,
- production-grade analytics,
- push notifications,
- multilingual support,
- advanced accessibility customization beyond core best practices,
- web application.

## 6. Exact MVP Exercise Content

The MVP exercise library must only include tomato-related tasks.

Approved MVP tasks:
- wash tomato,
- cut tomato.

No other exercise themes should be implemented in the MVP.
Future exercises can be referenced in copy as “coming in future versions.”

## 7. Functional Requirements

## 7.1 Authentication and Session Management

The app must support:
- email/password login using Firebase Authentication,
- role-based user records in Firestore,
- persistent login state,
- logout,
- first-launch onboarding shown only once,
- post-login routing based on user role.

Role values:
- `therapist`
- `patient`
- `admin` (optional internal)

Each authenticated user must also have a Firestore `users` document. The setup guide already recommends Firebase Auth plus Firestore and a role-driven model, which fits this product well. fileciteturn2file0

## 7.2 Onboarding

Onboarding is required and must appear only on first install/open.

Purpose of onboarding:
- explain what CareXR is,
- explain how therapist-guided AR helps people with executive dysfunction,
- reassure patients and therapists that the app supports structure, repetition, and progress,
- clearly introduce the relationship between mobile app and AR glasses.

Recommended onboarding flow:
1. Welcome to CareXR
2. Why executive dysfunction makes daily tasks hard
3. How guided AR exercises can support task initiation and sequencing
4. How therapists assign tasks and track progress
5. Start / Log in

Technical requirement:
- onboarding completion flag stored locally on device using AsyncStorage or equivalent.

## 7.3 Therapist Experience

### Therapist Home Dashboard
Must show:
- greeting and therapist name,
- condensed summary cards,
- patient roster entry point,
- pending assignments or recently active patients,
- simple visual overview of adherence.

### Therapist Patient List
Must show:
- searchable list of patients,
- patient name,
- quick status indicator,
- upcoming or overdue assignment summary.

### Therapist Patient Detail Screen
Must show:
- patient identity info,
- brief profile / notes area,
- assigned exercises list,
- exercise history,
- completion status,
- latest attempt data,
- button to assign a new exercise.

### Therapist Assignment Creation Flow
Must allow therapist to:
- choose exercise template,
- choose patient,
- set frequency or target repetitions,
- optionally set due date,
- optionally set notes or instructions,
- save assignment to Firestore.

For MVP, exercise template choices are limited to:
- Wash Tomato
- Cut Tomato

Suggested assignment fields:
- exercise type,
- target repetitions per day,
- number of days,
- patient instructions,
- status,
- assigned date,
- due date.

## 7.4 Patient Experience

### Patient Home Dashboard
Must show:
- welcoming summary,
- today’s assigned tasks,
- next recommended action,
- simple progress snapshot,
- button to launch AR task.

### Patient Task Detail Screen
Must show:
- exercise name,
- therapist instructions,
- target repetitions,
- due date,
- simple explanation of what will happen in AR,
- launch button.

### Patient Progress Screen
Must show:
- completed sessions,
- streak or completion count if easy to implement,
- simple improvement indicators,
- encouraging supportive copy.

## 7.5 AR Handoff and Result Sync

The mobile app must be able to pass the selected assignment context to the Spectacles/Lens experience. The exact transport mechanism can be simplified for MVP, but the app must conceptually support:
- selected patient assignment ID,
- selected exercise type,
- launch timestamp.

After the AR experience finishes, the result should be written back to Firestore as an exercise attempt.

Minimum fields to write back:
- patient ID,
- assignment ID,
- exercise ID or exercise type,
- startedAt,
- completedAt,
- duration,
- completed boolean,
- successful boolean,
- errorCount,
- simple metrics object,
- createdAt.

This aligns with the setup guide’s attempt logging pattern and stats model. fileciteturn2file1

## 7.6 Stats and Monitoring

### Therapist-side Stats
Should show basic metrics only:
- total attempts,
- completion rate,
- last attempted date,
- average duration,
- latest performance trend if available.

### Patient-side Stats
Should show:
- completed sessions,
- success rate,
- recent activity.

For MVP, charts can be minimal. A clean textual summary plus one simple visual card is enough.

## 8. Recommended Information Architecture

## 8.1 Main Navigation for Therapist
Bottom tabs or condensed nav:
- Home
- Patients
- Assignments
- Profile

## 8.2 Main Navigation for Patient
Bottom tabs or condensed nav:
- Home
- Tasks
- Progress
- Profile

Keep the interface minimal. Buttons should feel grouped, compact, and intentional rather than spread out.

## 9. Screen Specifications

## 9.1 Shared Screens
1. Splash Screen  
2. Onboarding Carousel  
3. Login Screen  
4. Forgot Password Screen (optional if time allows)  
5. Role-based app entry router  
6. Profile Screen  

## 9.2 Therapist Screens
1. Therapist Dashboard  
2. Patient List  
3. Patient Detail  
4. Assign Exercise Screen / Modal  
5. Assignment Success Confirmation  

## 9.3 Patient Screens
1. Patient Dashboard  
2. Assigned Tasks List  
3. Task Detail  
4. Progress / History  
5. Launch AR Screen  
6. Completion Summary Screen  

## 10. Data Model Specification

The uploaded setup guide uses the following Firestore collections:
- `users`
- `exercises`
- `exercise_steps`
- `patient_assignments`
- `exercise_attempts`
- `error_logs` fileciteturn2file0

That structure is good enough for the MVP, but it should be adapted slightly for role-based therapist/patient workflows.

### 10.1 `users`
Document ID: Firebase Auth UID

Fields:
- `id: string`
- `email: string`
- `fullName: string`
- `role: 'therapist' | 'patient' | 'admin'`
- `therapistId?: string` for patient accounts linked to a therapist
- `createdAt: timestamp`
- `updatedAt: timestamp`
- `onboardingCompleted?: boolean` optional if also mirrored remotely
- `profile?: object`

Recommended `profile` fields for MVP:
- `ageRange?: string`
- `primaryChallenges?: string[]`
- `notes?: string`

### 10.2 `exercises`
Pre-seeded content library.

Fields:
- `id: string`
- `name: string`
- `slug: string`
- `description: string`
- `category: string`
- `difficulty: number`
- `duration: number`
- `isActive: boolean`
- `createdBy: string`
- `createdAt: timestamp`

Required seeded entries for MVP:
- `wash-tomato`
- `cut-tomato`

### 10.3 `exercise_steps`
Stores the structured steps for each exercise.

Fields:
- `id: string`
- `exerciseId: string`
- `stepNumber: number`
- `description: string`
- `action: string`
- `targetObject: string`
- `validation: object`
- `estimatedTime: number`

The setup guide already demonstrates this well for a cutting exercise and should be reused as the technical pattern. fileciteturn2file1

### 10.4 `patient_assignments`
Core therapist-to-patient linkage.

Fields:
- `id: string`
- `therapistId: string`
- `patientId: string`
- `exerciseId: string`
- `exerciseName: string`
- `status: 'assigned' | 'in-progress' | 'completed' | 'missed'`
- `targetRepetitionsPerDay: number`
- `numberOfDays: number`
- `assignedDate: timestamp`
- `dueDate?: timestamp`
- `instructions?: string`
- `attemptCount: number`
- `lastAttemptedAt?: timestamp`
- `createdAt: timestamp`
- `updatedAt: timestamp`

### 10.5 `exercise_attempts`
Stores actual patient session results.

Fields:
- `id: string`
- `patientId: string`
- `therapistId?: string`
- `assignmentId: string`
- `exerciseId: string`
- `startedAt: timestamp`
- `completedAt: timestamp`
- `duration: number`
- `completed: boolean`
- `successful: boolean`
- `errorCount: number`
- `errors?: string[]`
- `metrics?: object`
- `createdAt: timestamp`

Suggested `metrics` subfields for MVP:
- `overallScore?: number`
- `stepCompletionRate?: number`
- `hesitationCount?: number`
- `guidancePromptsUsed?: number`

### 10.6 `error_logs` (Optional)
Useful for debugging only.

## 11. Firestore Security Expectations

The uploaded guide proposes secure, role-aware Firestore rules where users can read/write their own data, therapists can write exercises/assignments, and patients can write their own attempts. That pattern should be kept, but expanded so therapists can also read records for patients linked to them. fileciteturn2file0

MVP rule intent:
- patients may read their own user doc and own assignments/attempts,
- therapists may read their own user doc plus assignments and attempts for their linked patients,
- only therapists/admins may create assignments,
- only admins or seeded scripts may modify exercise templates,
- unauthenticated access is blocked.

## 12. Technical Architecture

## 12.1 Recommended Stack
- React Native
- Expo
- Expo Router or React Navigation
- Firebase Authentication
- Cloud Firestore
- AsyncStorage
- TypeScript preferred
- Nativewind or plain StyleSheet for styling

## 12.2 Why This Stack
The uploaded guide explicitly recommends Firebase as the fastest hackathon option because it avoids full server setup and includes built-in auth and database support. fileciteturn2file0

For this MVP, a custom backend is optional, not mandatory. Since speed matters, the app can likely use:
- Firebase Auth directly from the Expo app,
- Firestore directly from the Expo app,
- optional lightweight cloud functions later if needed.

## 12.3 Production/Development Assumption
The app must work during development in Expo and still write to Firestore, provided Firebase is configured correctly. The setup guide’s auth and Firestore flow supports this. fileciteturn2file0turn2file1

## 13. UI/UX Specification

## 13.1 Visual Direction
The UI should feel:
- clinical but warm,
- modern and minimal,
- calm, trustworthy, and precise,
- not flashy,
- not generic AI-looking.

### Recommended Color Direction
Use a muted healthcare palette with one strong accent.

Suggested palette:
- Primary: Deep slate blue `#2F4F6F`
- Secondary: Soft sage `#A8C3B0`
- Background: Warm off-white `#F7F6F2`
- Surface: Clean white `#FFFFFF`
- Accent: Terracotta clay `#C97A5A`
- Text primary: Charcoal `#1F2933`
- Text secondary: Dusty gray `#667085`
- Success: Muted green `#5E8C61`
- Warning: Warm amber `#C6923D`

Why this works:
- the slate blue gives medical credibility,
- the sage softens the experience and suggests care/regulation,
- the terracotta adds humanity and visual energy without looking childish.

## 13.2 Layout Principles
- use condensed cards,
- keep related actions grouped,
- avoid too many floating buttons,
- prioritize large readable headings and calm spacing,
- show only the most useful metadata,
- make the therapist workflow feel fast and efficient.

## 13.3 Button System
Primary buttons:
- filled slate blue

Secondary buttons:
- outlined slate blue or filled sage

Danger buttons:
- terracotta/red family

Buttons should be rounded but not cartoonish.

## 13.4 Tone of Copy
- clear,
- supportive,
- non-judgmental,
- clinically respectful,
- reassuring for patients,
- efficient for therapists.

Example patient tone:
- “Your therapist has prepared a task for today.”
- “One small step at a time.”
- “You completed today’s session.”

## 14. Demo Design Requirements

Because this is a hackathon demo, the product should be optimized for a compelling live walkthrough.

The demo should show:
1. therapist logs in,
2. therapist opens patient list,
3. therapist selects patient,
4. therapist assigns either Wash Tomato or Cut Tomato,
5. assignment appears in Firestore,
6. patient logs in,
7. patient sees the assigned task in app,
8. patient launches the AR exercise,
9. AR exercise completes,
10. app records attempt and updates progress,
11. therapist refreshes and sees updated progress.

The mobile app must therefore prioritize:
- reliability,
- clean navigation,
- fast assignment creation,
- clear success states.

## 15. MVP Seed Content

### Exercise 1: Wash Tomato
Suggested steps:
1. locate tomato
2. pick up tomato
3. place tomato under water
4. rotate and rinse tomato
5. place tomato back down

### Exercise 2: Cut Tomato
Suggested steps:
1. locate knife
2. grip knife safely
3. place tomato on surface
4. position knife correctly
5. slice tomato
6. place knife down safely

These are the only content templates required for the MVP.

## 16. Non-Functional Requirements

- responsive and smooth on common phones,
- role-based navigation must be reliable,
- database writes must be consistent,
- app should recover gracefully from network hiccups,
- loading and empty states must exist,
- no dead-end screens,
- onboarding should not repeat after first completion,
- the entire core workflow should be demoable within 2 to 3 minutes.

## 17. Edge Cases

The app should handle:
- therapist has no patients yet,
- patient has no assigned tasks yet,
- assignment write fails,
- patient launches task without internet,
- AR result sync fails,
- user logs in with wrong role expectation,
- Firestore document missing or malformed,
- repeated task completion submissions.

## 18. Suggested Folder Structure

```text
app/
  (auth)/
    onboarding.tsx
    login.tsx
  (therapist)/
    index.tsx
    patients.tsx
    patient/[id].tsx
    assign/[patientId].tsx
  (patient)/
    index.tsx
    tasks.tsx
    task/[id].tsx
    progress.tsx
  profile.tsx
src/
  components/
  features/
    auth/
    therapist/
    patient/
    assignments/
    exercises/
  services/
    firebase/
    repositories/
  hooks/
  store/
  theme/
  types/
  utils/
```

## 19. Development Priorities

### Priority 1
- Firebase project setup
- Auth
- Firestore collections
- therapist/patient role model
- onboarding flag

### Priority 2
- therapist dashboard
- patient list
- patient detail
- create assignment flow

### Priority 3
- patient dashboard
- assigned task list
- launch task flow
- attempt logging

### Priority 4
- therapist stats
- polish UI
- empty states
- demo script support

## 20. Acceptance Criteria

The MVP is successful if all of the following work live:
- therapist and patient can each log in,
- onboarding appears only once,
- therapist can view patient list,
- therapist can assign Wash Tomato or Cut Tomato,
- assignment is saved in Firestore,
- patient can see newly assigned task,
- patient can launch AR exercise from app,
- completion data is saved to `exercise_attempts`,
- therapist can see updated progress,
- UI looks polished and coherent.

## 21. Future Version Ideas

Not for MVP, but safe to mention during judging:
- more kitchen and daily living tasks,
- adaptive difficulty,
- richer therapist analytics,
- reminders and notifications,
- caregiver access,
- custom exercise authoring,
- AI-assisted exercise recommendations,
- voice guidance,
- wearable biofeedback.

## 22. Final Recommendation

For the hackathon, the best product split is:
- mobile app = therapist/patient workflow,
- Firestore = shared source of truth,
- Spectacles Lens = immersive execution layer.

This is aligned with the uploaded setup guide’s recommendation to use Firebase for the fastest hackathon-ready implementation with authentication, Firestore, seeded exercises, assignments, and attempt logging. fileciteturn2file0turn2file1
