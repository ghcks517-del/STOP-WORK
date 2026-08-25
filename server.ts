import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin
let firebaseAdminApp: App | null = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const keyString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const cleanKeyString = keyString.replace(/\\n/g, '\n');
    const serviceAccount = JSON.parse(cleanKeyString);
    if (getApps().length === 0) {
      firebaseAdminApp = initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized securely.');
    }
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Push notifications will be mocked.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to submit Stop Work Authority request
  app.post('/api/requests', async (req, res) => {
    try {
      const { project, location, workerName, reason } = req.body;
      
      if (!project || !location || !workerName || !reason) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // If Firebase Admin is not initialized, we will just return success for the demo
      // In a real scenario, we'd save to Firestore using admin SDK.
      // But we can let the client-side Firebase SDK save it to Firestore directly,
      // and this endpoint is JUST for triggering the push notification if needed.
      // Actually, it's safer if the client saves directly to Firestore, and we use a 
      // Firestore trigger. However, since we don't have Cloud Functions, the client can 
      // call this API to send the push AFTER saving to Firestore.
      
      if (!getApps().length) {
        console.log('[Mock Push] Would send push for:', req.body);
        return res.json({ success: true, mocked: true });
      }

      const db = getFirestore();
      
      // 1. Fetch active admins who have push enabled
      const adminsSnapshot = await db.collection('adminDevices')
        .where('active', '==', true)
        .where('pushEnabled', '==', true)
        .where('pwaInstalled', '==', true)
        .where('mobileDevice', '==', true)
        .where('standaloneVerified', '==', true)
        .where('notificationPermission', '==', 'granted')
        .get();

      const tokens = adminsSnapshot.docs
        .map(doc => doc.data().pushRegistrationId)
        .filter(token => !!token);

      if (tokens.length > 0) {
        const shortReason = reason.length > 20 ? reason.substring(0, 20) + '...' : reason;
        
        const message = {
          notification: {
            title: '[작업중지권] 신규 접수',
            body: `${project} / ${location}\n${workerName} - ${shortReason}`,
          },
          tokens: tokens,
        };

        const response = await getMessaging().sendEachForMulticast(message);
        console.log('Push notifications sent:', response.successCount, 'success,', response.failureCount, 'failures');
        
        // Clean up invalid tokens
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && (
              resp.error?.code === 'messaging/invalid-registration-token' ||
              resp.error?.code === 'messaging/registration-token-not-registered'
          )) {
            failedTokens.push(tokens[idx]);
          }
        });

        if (failedTokens.length > 0) {
          // Disable push for these invalid devices
          const batch = db.batch();
          for (const doc of adminsSnapshot.docs) {
            const data = doc.data();
            if (failedTokens.includes(data.pushRegistrationId)) {
              batch.update(doc.ref, { pushEnabled: false, active: false });
            }
          }
          await batch.commit();
        }
      }

      res.json({ success: true, pushCount: tokens.length });
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
