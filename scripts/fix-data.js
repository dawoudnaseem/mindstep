/**
 * CareXR Data Fix Script
 *
 * Looks up the REAL Firebase Auth UIDs for your demo accounts,
 * then patches the Firestore user documents and therapistId links.
 *
 * Run once:
 *   node scripts/fix-data.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const auth = admin.auth();
const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;

const THERAPIST_EMAIL = 'therapist@carexr.demo';
const PATIENT_EMAIL   = 'patient@carexr.demo';

async function getUID(email) {
  try {
    const user = await auth.getUserByEmail(email);
    return user.uid;
  } catch (e) {
    console.error(`❌  Could not find Firebase Auth user for ${email}`);
    console.error('    Make sure the account exists in Firebase Auth console.');
    throw e;
  }
}

async function main() {
  console.log('🔍  Looking up real Firebase Auth UIDs...\n');

  const therapistUID = await getUID(THERAPIST_EMAIL);
  const patientUID   = await getUID(PATIENT_EMAIL);

  console.log(`Therapist UID : ${therapistUID}`);
  console.log(`Patient UID   : ${patientUID}\n`);

  // ── Patch therapist user doc ──────────────────────────────────────────────
  const therapistRef = db.collection('users').doc(therapistUID);
  await therapistRef.set({
    id: therapistUID,
    email: THERAPIST_EMAIL,
    fullName: 'Dr. Sarah Chen',
    role: 'therapist',
    updatedAt: TS(),
    createdAt: TS(),
  }, { merge: true });
  console.log('✅  Therapist user doc patched.');

  // ── Patch patient user doc ────────────────────────────────────────────────
  const patientRef = db.collection('users').doc(patientUID);
  await patientRef.set({
    id: patientUID,
    email: PATIENT_EMAIL,
    fullName: 'Alex Martin',
    role: 'patient',
    therapistId: therapistUID,   // ← links patient to this therapist
    updatedAt: TS(),
    createdAt: TS(),
    profile: {
      ageRange: '30–40',
      primaryChallenges: ['task initiation', 'sequencing'],
      notes: 'Making good progress with structured exercises.',
    },
  }, { merge: true });
  console.log('✅  Patient user doc patched (therapistId linked).');

  // ── If old UID docs existed from seed, migrate any assignments ────────────
  const OLD_THERAPIST_UID = '805mCrhsZSVwChZKvTNRHfUaBd33';
  const OLD_PATIENT_UID   = 'BOQsxDobche3U3ETopussSygoFm2';

  if (therapistUID !== OLD_THERAPIST_UID || patientUID !== OLD_PATIENT_UID) {
    console.log('\n🔄  Migrating any stale assignments to new UIDs...');

    const assignSnap = await db.collection('patient_assignments')
      .where('therapistId', '==', OLD_THERAPIST_UID)
      .get();

    if (!assignSnap.empty) {
      const batch = db.batch();
      assignSnap.docs.forEach((d) => {
        const data = d.data();
        batch.update(d.ref, {
          therapistId: therapistUID,
          patientId: data.patientId === OLD_PATIENT_UID ? patientUID : data.patientId,
        });
      });
      await batch.commit();
      console.log(`   └─ Migrated ${assignSnap.size} assignment(s).`);
    } else {
      console.log('   └─ No stale assignments found.');
    }

    // Clean up old user docs if they exist and are different UIDs
    if (therapistUID !== OLD_THERAPIST_UID) {
      const oldTherapist = await db.collection('users').doc(OLD_THERAPIST_UID).get();
      if (oldTherapist.exists) {
        await db.collection('users').doc(OLD_THERAPIST_UID).delete();
        console.log('   └─ Removed stale therapist doc with old UID.');
      }
    }
    if (patientUID !== OLD_PATIENT_UID) {
      const oldPatient = await db.collection('users').doc(OLD_PATIENT_UID).get();
      if (oldPatient.exists) {
        await db.collection('users').doc(OLD_PATIENT_UID).delete();
        console.log('   └─ Removed stale patient doc with old UID.');
      }
    }
  }

  console.log('\n✅  All done. Reload the app and log in again.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌  Fix script failed:', err.message);
  process.exit(1);
});
