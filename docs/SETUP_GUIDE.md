# Development Setup Guide

## Quick Start (Choose One Path)

### Option A: Firebase (Recommended for Hackathon - Fastest)
Pros: No server setup, built-in auth, real-time database, free tier generous
Cons: Vendor lock-in, less control

### Option B: Node.js + PostgreSQL (More Control)
Pros: Full control, better for production scale
Cons: More setup time, need to manage server

This guide covers **Option A (Firebase)** first, then Option B.

---

## Option A: Firebase Setup (30 minutes)

### 1. Create Firebase Project

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Google account
firebase login

# Initialize project
firebase init
```

During `firebase init`:
- Select "Firestore Database"
- Select "Hosting"
- Create new Firebase project or select existing
- Choose "Yes" for using Firestore in production mode
- Choose "Yes" for security rules

### 2. Configure Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project: `ergotherapy-app`
3. Enable Authentication:
   - Authentication → Sign-in Method
   - Enable "Email/Password"
4. Create Firestore Database:
   - Firestore Database → Create Database
   - Start in "Production Mode" (we'll set rules)
   - Choose region closest to you

### 3. Set Firestore Rules

In Firebase Console, go to **Firestore Database → Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Exercises: public read
    match /exercises/{exerciseId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'therapist' || request.auth.token.role == 'admin';
    }

    // Exercise steps: public read
    match /exercise_steps/{stepId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'admin';
    }

    // Patient assignments: can read own
    match /patient_assignments/{assignmentId} {
      allow read: if request.auth.uid == resource.data.patientId;
      allow write: if request.auth.token.role == 'therapist' || request.auth.token.role == 'admin';
    }

    // Exercise attempts: can read/write own
    match /exercise_attempts/{attemptId} {
      allow read, write: if request.auth.uid == resource.data.patientId;
    }

    // Error logs: can write own
    match /error_logs/{errorId} {
      allow read, write: if request.auth.uid == resource.data.patientId;
    }
  }
}
```

### 4. Initialize Backend (Minimal Node.js)

```bash
# Create backend directory
mkdir backend
cd backend
npm init -y

# Install dependencies
npm install express firebase-admin cors dotenv body-parser

# Create .env file
cat > .env << 'EOF'
FIREBASE_PROJECT_ID=ergotherapy-app
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=...

PORT=3000
NODE_ENV=development
EOF
```

Get credentials from Firebase Console:
- Project Settings → Service Accounts → Generate New Private Key
- Copy the JSON and extract fields into .env

### 5. Create Backend Server (server.js)

```javascript
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

// Initialize Firebase Admin
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
});

const db = admin.firestore();
const auth = admin.auth();

const app = express();
app.use(cors());
app.use(express.json());

// Middleware: Verify Firebase Token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.userId = decodedToken.uid;
    req.userEmail = decodedToken.email;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ========== AUTH ENDPOINTS ==========

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
    });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      email,
      fullName,
      role: 'patient',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create custom token for initial login
    const customToken = await auth.createCustomToken(userRecord.uid);

    res.status(201).json({
      success: true,
      user: {
        id: userRecord.uid,
        email,
        fullName,
        role: 'patient',
      },
      token: customToken,
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: userDoc.data(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/demo
// Create a temporary demo session (no registration needed)
app.post('/api/auth/demo', async (req, res) => {
  try {
    // Create a temporary demo token
    // In production, use proper JWT signing
    const demoToken = Buffer.from(
      JSON.stringify({
        userId: 'demo-' + Date.now(),
        email: 'demo@example.com',
        isDemo: true,
        iat: Date.now(),
        exp: Date.now() + 3600000, // 1 hour
      })
    ).toString('base64');

    res.status(200).json({
      success: true,
      user: {
        id: 'demo-' + Date.now(),
        email: 'demo@example.com',
        fullName: 'Demo User',
        role: 'patient',
        isDemo: true,
      },
      token: demoToken,
      message: 'Demo session created. Attempts will be saved locally only.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== EXERCISE ENDPOINTS ==========

// GET /api/exercises
app.get('/api/exercises', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get assignments for current patient
    const assignments = await db
      .collection('patient_assignments')
      .where('patientId', '==', userId)
      .get();

    const exercises = [];
    for (const assignmentDoc of assignments.docs) {
      const assignment = assignmentDoc.data();
      const exerciseDoc = await db
        .collection('exercises')
        .doc(assignment.exerciseId)
        .get();

      if (exerciseDoc.exists) {
        exercises.push({
          ...exerciseDoc.data(),
          assignmentId: assignmentDoc.id,
          assignedDate: assignment.assignedDate,
          dueDate: assignment.dueDate,
          status: assignment.status,
          attemptCount: assignment.attemptCount,
        });
      }
    }

    res.json({
      success: true,
      exercises,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/exercises/:exerciseId
app.get('/api/exercises/:exerciseId', verifyToken, async (req, res) => {
  try {
    const { exerciseId } = req.params;

    // Get exercise
    const exerciseDoc = await db
      .collection('exercises')
      .doc(exerciseId)
      .get();

    if (!exerciseDoc.exists) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    // Get steps
    const stepsSnapshot = await db
      .collection('exercise_steps')
      .where('exerciseId', '==', exerciseId)
      .orderBy('stepNumber')
      .get();

    const steps = stepsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      exercise: {
        id: exerciseDoc.id,
        ...exerciseDoc.data(),
        steps,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ATTEMPT ENDPOINTS ==========

// POST /api/exercises/:exerciseId/attempts
app.post('/api/exercises/:exerciseId/attempts', verifyToken, async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const attemptData = req.body;

    const attemptRef = await db.collection('exercise_attempts').add({
      patientId: req.userId,
      exerciseId,
      startedAt: new Date(attemptData.startedAt),
      completedAt: new Date(attemptData.completedAt),
      duration: attemptData.duration,
      tasksCompleted: attemptData.tasksCompleted,
      errors: attemptData.errors,
      errorCount: attemptData.errorCount,
      metrics: attemptData.metrics,
      completed: attemptData.completed,
      successful: attemptData.successful,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update patient assignment
    if (attemptData.assignmentId) {
      await db.collection('patient_assignments').doc(attemptData.assignmentId).update({
        status: 'in-progress',
        lastAttemptedAt: admin.firestore.FieldValue.serverTimestamp(),
        attemptCount: admin.firestore.FieldValue.increment(1),
      });
    }

    res.status(201).json({
      success: true,
      attempt: {
        id: attemptRef.id,
        ...attemptData,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/stats/exercises/:exerciseId
app.get('/api/stats/exercises/:exerciseId', verifyToken, async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const userId = req.userId;

    // Get all attempts for this user's exercise
    const attemptsSnapshot = await db
      .collection('exercise_attempts')
      .where('patientId', '==', userId)
      .where('exerciseId', '==', exerciseId)
      .orderBy('completedAt', 'desc')
      .limit(20)
      .get();

    const attempts = attemptsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate stats
    const completedAttempts = attempts.filter((a) => a.successful);
    const avgTime =
      attempts.reduce((sum, a) => sum + (a.duration || 0), 0) / attempts.length || 0;
    const avgScore =
      attempts.reduce((sum, a) => sum + (a.metrics?.overallScore || 0), 0) /
        attempts.length || 0;

    // Simple improvement detection
    const firstScore = attempts[attempts.length - 1]?.metrics?.overallScore || 0;
    const lastScore = attempts[0]?.metrics?.overallScore || 0;
    const improvement = lastScore - firstScore;

    res.json({
      success: true,
      exercise: {
        id: exerciseId,
      },
      stats: {
        totalAttempts: attempts.length,
        completedAttempts: completedAttempts.length,
        successRate: Math.round((completedAttempts.length / attempts.length) * 100),
        averageTime: Math.round(avgTime),
        averageScore: Math.round(avgScore),
        improvement: Math.round(improvement),
      },
      attempts: attempts.map((a) => ({
        id: a.id,
        completedAt: a.completedAt,
        duration: a.duration,
        score: a.metrics?.overallScore,
        errorCount: a.errorCount,
        successful: a.successful,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 6. Seed Initial Data

Create `seed-db.js`:

```javascript
const admin = require('firebase-admin');
require('dotenv').config();

admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
});

const db = admin.firestore();

async function seedDatabase() {
  try {
    // Create exercise: Cutting Tomato
    const exerciseRef = await db.collection('exercises').add({
      name: 'Cutting Tomato',
      description: 'Practice fine motor control and sequencing by cutting a tomato',
      category: 'fine-motor',
      difficulty: 2,
      duration: 120,
      createdBy: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
    });

    const exerciseId = exerciseRef.id;

    // Create steps
    const steps = [
      {
        exerciseId,
        stepNumber: 1,
        description: 'Grab the knife',
        action: 'grab',
        targetObject: 'knife',
        validation: {
          requiredGesture: 'pinch',
          targetContact: null,
        },
        estimatedTime: 5,
      },
      {
        exerciseId,
        stepNumber: 2,
        description: 'Place knife on tomato',
        action: 'place',
        targetObject: 'tomato',
        validation: {
          requiredGesture: 'grab',
          targetContact: 'tomato',
          minDuration: 2000,
        },
        estimatedTime: 3,
      },
      {
        exerciseId,
        stepNumber: 3,
        description: 'Cut the tomato',
        action: 'cut',
        targetObject: 'tomato',
        validation: {
          requiredGesture: 'motion',
          targetContact: 'tomato',
          minDuration: 1000,
        },
        estimatedTime: 110,
      },
      {
        exerciseId,
        stepNumber: 4,
        description: 'Release the knife',
        action: 'release',
        targetObject: 'knife',
        validation: {
          requiredGesture: 'open',
        },
        estimatedTime: 2,
      },
    ];

    for (const step of steps) {
      await db.collection('exercise_steps').add(step);
    }

    console.log('✅ Database seeded successfully!');
    console.log(`Exercise ID: ${exerciseId}`);
    console.log('Created 4 exercise steps');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
```

Run:
```bash
node seed-db.js
```

### 7. Test Backend

```bash
# Start server
node server.js

# In another terminal, test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "fullName": "Test User"
  }'
```

---

## Option B: Node.js + PostgreSQL (Full Setup)

Skip this if using Firebase. If you prefer PostgreSQL:

### 1. Install PostgreSQL

```bash
# macOS
brew install postgresql

# Ubuntu
sudo apt-get install postgresql postgresql-contrib

# Windows
# Download from https://www.postgresql.org/download/windows/
```

### 2. Create Database

```bash
# Create database
createdb ergotherapy_app

# Connect to database
psql ergotherapy_app

# Create tables (use script from DATABASE.md)
```

### 3. Initialize Node.js Backend

```bash
mkdir backend
cd backend
npm init -y
npm install express pg bcrypt jsonwebtoken cors dotenv
```

Create `server.js` with authentication and routes (similar to Firebase version but using `pg` library).

---

## Frontend Setup (React/Vue)

### 1. Create Project

```bash
# Using Vite (faster)
npm create vite@latest web-app -- --template react
cd web-app
npm install

# Or using Create React App
npx create-react-app web-app
cd web-app
```

### 2. Install Dependencies

```bash
npm install axios react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3. Structure

```
web-app/
├── src/
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── ExerciseListPage.jsx
│   │   ├── ExerciseDetailPage.jsx
│   │   └── StatsPage.jsx
│   ├── components/
│   │   ├── ExerciseCard.jsx
│   │   ├── StatsSummary.jsx
│   │   └── Navigation.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── services/
│   │   └── api.js
│   ├── App.jsx
│   └── index.css
└── public/
```

### 4. Sample AuthContext.jsx

```jsx
import React, { createContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  const register = async (email, password, fullName) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken();
      setUser(result.user);
      setToken(idToken);
      return result.user;
    } catch (error) {
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken();
      setUser(result.user);
      setToken(idToken);
      return result.user;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    await auth.signOut();
    setUser(null);
    setToken(null);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const idToken = await user.getIdToken();
        setUser(user);
        setToken(idToken);
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, token, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
```

---

## Environment Variables

Create `.env` files:

**Backend (.env)**:
```
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
PORT=3000
NODE_ENV=development
```

**Frontend (.env.local)**:
```
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
REACT_APP_API_URL=http://localhost:3000/api
```

Get values from Firebase Console → Project Settings.

---

## Verification Checklist

- [ ] Backend runs on port 3000
- [ ] Firebase Firestore database created
- [ ] Authentication rules configured
- [ ] Sample data seeded (exercise + steps)
- [ ] Registration endpoint works
- [ ] Login endpoint works
- [ ] Can fetch exercises
- [ ] Can submit attempt data
- [ ] Frontend connects to backend
- [ ] Environment variables configured
- [ ] CORS enabled on backend

---

## Troubleshooting

### Firebase Auth Errors
- Ensure email/password authentication is enabled in Console
- Check Firestore security rules
- Verify service account credentials in .env

### CORS Issues
```javascript
// Add to Express
const cors = require('cors');
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://yourdomain.com'
    : 'http://localhost:3000',
  credentials: true
}));
```

### Database Seeding Failed
- Check Firebase credentials
- Ensure Firestore database exists
- Verify database is in production mode (not test mode)
- Check for duplicate exercise names

### Token Verification Issues
- Ensure token is sent in `Authorization: Bearer <token>` header
- Check token expiration (refresh if expired)
- Verify Firebase secret in .env
