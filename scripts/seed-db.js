/**
 * CareXR Database Seed Script
 *
 * Seeds Firestore with:
 *   - Exercise: wash-tomato (5 steps)
 *   - Exercise: cut-tomato  (6 steps)
 *   - Demo therapist user document
 *   - Demo patient user document
 *
 * BEFORE RUNNING:
 * 1. Install firebase-admin:
 *      npm install --save-dev firebase-admin
 * 2. Download your Firebase service account key:
 *      Firebase Console → Project Settings → Service Accounts → Generate New Private Key
 *      Save as scripts/serviceAccountKey.json
 * 3. Run:
 *      node scripts/seed-db.js
 *
 * The script is idempotent: it checks for existing slugs before inserting.
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;

// ─── Exercise definitions ─────────────────────────────────────────────────────

const exercises = [
  {
    slug: 'wash-tomato',
    name: 'Wash Tomato',
    description:
      'Practice task initiation, sequencing, and fine motor control by washing a tomato.',
    category: 'fine-motor',
    difficulty: 1,
    duration: 60,
    isActive: true,
    createdBy: 'admin',
    steps: [
      {
        stepNumber: 1,
        description: 'Locate the tomato on the surface',
        action: 'locate',
        targetObject: 'tomato',
        validation: { requiredGesture: 'look' },
        estimatedTime: 5,
      },
      {
        stepNumber: 2,
        description: 'Pick up the tomato',
        action: 'grab',
        targetObject: 'tomato',
        validation: { requiredGesture: 'grab', minDuration: 1000 },
        estimatedTime: 5,
      },
      {
        stepNumber: 3,
        description: 'Place tomato under the water stream',
        action: 'place',
        targetObject: 'sink',
        validation: { requiredGesture: 'grab', targetContact: 'water', minDuration: 2000 },
        estimatedTime: 10,
      },
      {
        stepNumber: 4,
        description: 'Rotate and rinse the tomato',
        action: 'rotate',
        targetObject: 'tomato',
        validation: { requiredGesture: 'motion', minDuration: 5000 },
        estimatedTime: 30,
      },
      {
        stepNumber: 5,
        description: 'Place the tomato back on the surface',
        action: 'release',
        targetObject: 'surface',
        validation: { requiredGesture: 'open' },
        estimatedTime: 5,
      },
    ],
  },
  {
    slug: 'cut-tomato',
    name: 'Cut Tomato',
    description:
      'Practice safe tool use, sequencing, and fine motor control by cutting a tomato.',
    category: 'fine-motor',
    difficulty: 2,
    duration: 120,
    isActive: true,
    createdBy: 'admin',
    steps: [
      {
        stepNumber: 1,
        description: 'Locate the knife on the surface',
        action: 'locate',
        targetObject: 'knife',
        validation: { requiredGesture: 'look' },
        estimatedTime: 5,
      },
      {
        stepNumber: 2,
        description: 'Grip the knife safely',
        action: 'grab',
        targetObject: 'knife',
        validation: { requiredGesture: 'pinch', minDuration: 1000 },
        estimatedTime: 5,
      },
      {
        stepNumber: 3,
        description: 'Place the tomato on the cutting surface',
        action: 'place',
        targetObject: 'tomato',
        validation: { requiredGesture: 'grab', targetContact: 'board' },
        estimatedTime: 5,
      },
      {
        stepNumber: 4,
        description: 'Position the knife correctly on the tomato',
        action: 'position',
        targetObject: 'knife',
        validation: { requiredGesture: 'grab', targetContact: 'tomato', minDuration: 2000 },
        estimatedTime: 5,
      },
      {
        stepNumber: 5,
        description: 'Slice the tomato',
        action: 'cut',
        targetObject: 'tomato',
        validation: { requiredGesture: 'motion', targetContact: 'tomato', minDuration: 3000 },
        estimatedTime: 90,
      },
      {
        stepNumber: 6,
        description: 'Place the knife back down safely',
        action: 'release',
        targetObject: 'knife',
        validation: { requiredGesture: 'open' },
        estimatedTime: 5,
      },
    ],
  },
];

// ─── Demo users ───────────────────────────────────────────────────────────────
//
// Replace THERAPIST_UID and PATIENT_UID with the actual Firebase Auth UIDs
// after you create the accounts in Firebase Console → Authentication.
//
// Steps:
// 1. In Firebase Console → Authentication → Add user
//    therapist@carexr.demo  /  Demo1234!
//    patient@carexr.demo    /  Demo1234!
// 2. Copy the UID shown and paste below.

const THERAPIST_UID = 'REPLACE_WITH_THERAPIST_UID';
const PATIENT_UID = 'REPLACE_WITH_PATIENT_UID';

const demoUsers = [
  {
    uid: THERAPIST_UID,
    data: {
      id: THERAPIST_UID,
      email: 'therapist@carexr.demo',
      fullName: 'Dr. Sarah Chen',
      role: 'therapist',
      createdAt: TS(),
      updatedAt: TS(),
    },
  },
  {
    uid: PATIENT_UID,
    data: {
      id: PATIENT_UID,
      email: 'patient@carexr.demo',
      fullName: 'Alex Martin',
      role: 'patient',
      therapistId: THERAPIST_UID,
      createdAt: TS(),
      updatedAt: TS(),
      profile: {
        ageRange: '30–40',
        primaryChallenges: ['task initiation', 'sequencing'],
        notes: 'Making good progress with structured exercises.',
      },
    },
  },
];

// ─── Seed logic ───────────────────────────────────────────────────────────────

async function seedExercises() {
  for (const exercise of exercises) {
    const { steps, ...exerciseData } = exercise;

    // Check if already exists
    const existing = await db
      .collection('exercises')
      .where('slug', '==', exercise.slug)
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log(`⏭  Exercise "${exercise.name}" already exists, skipping.`);
      continue;
    }

    const exerciseRef = await db.collection('exercises').add({
      ...exerciseData,
      createdAt: TS(),
    });

    console.log(`✅ Created exercise: ${exercise.name} (${exerciseRef.id})`);

    for (const step of steps) {
      await db.collection('exercise_steps').add({
        exerciseId: exerciseRef.id,
        ...step,
      });
    }

    console.log(`   └─ Added ${steps.length} steps`);
  }
}

async function seedUsers() {
  for (const { uid, data } of demoUsers) {
    if (uid.startsWith('REPLACE_WITH')) {
      console.log(`⚠️  Skipping user "${data.email}" — UID not set. See instructions above.`);
      continue;
    }

    const userRef = db.collection('users').doc(uid);
    const existing = await userRef.get();

    if (existing.exists) {
      console.log(`⏭  User "${data.email}" already exists, skipping.`);
      continue;
    }

    await userRef.set(data);
    console.log(`✅ Created user: ${data.fullName} (${data.role})`);
  }
}

async function main() {
  console.log('🌱 Seeding CareXR database...\n');

  await seedExercises();
  console.log('');
  await seedUsers();

  console.log('\n✅ Seeding complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
