import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

// Initialize Firebase Admin once
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not set.');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { project, location, workerName, reason } = req.body;

    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      return res.status(200).json({ 
        success: true, 
        message: 'Mock push: Service account key is missing. Add FIREBASE_SERVICE_ACCOUNT_KEY to Vercel env vars.' 
      });
    }

    const db = admin.firestore();
    
    // Fetch active admins who have push enabled
    const adminsSnapshot = await db.collection('adminDevices')
      .where('active', '==', true)
      .where('pushEnabled', '==', true)
      .get();

    const tokens = adminsSnapshot.docs
      .map(doc => doc.data().pushRegistrationId)
      .filter(token => !!token);

    if (tokens.length > 0) {
      const shortReason = reason.length > 20 ? reason.substring(0, 20) + '...' : reason;
      
      const message = {
        notification: {
          title: '[작업중지권] 긴급 발생!',
          body: `${project} / ${location}\n${workerName} - ${shortReason}`,
        },
        tokens: tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
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

    return res.status(200).json({ success: true, pushCount: tokens.length });
  } catch (error: any) {
    console.error('Error processing push request:', error);
    return res.status(500).json({ error: error.message });
  }
}
