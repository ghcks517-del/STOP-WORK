import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

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

    // Initialize Firebase Admin safely inside the handler
    if (getApps().length === 0) {
      let serviceAccount;
      try {
        const keyString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        // Handle potential formatting issues (e.g., escaped newlines from Vercel)
        const cleanKeyString = keyString.replace(/\\n/g, '\n');
        serviceAccount = JSON.parse(cleanKeyString);
      } catch (parseError: any) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseError);
        return res.status(500).json({ error: 'Service account key JSON parse error: ' + parseError.message });
      }

      try {
        initializeApp({
          credential: cert(serviceAccount)
        });
        console.log('Firebase Admin SDK initialized successfully.');
      } catch (initError: any) {
        console.error('Failed to initialize Firebase Admin:', initError);
        return res.status(500).json({ error: 'Firebase init error: ' + initError.message });
      }
    }

    const db = getFirestore();
    
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

      const response = await getMessaging().sendEachForMulticast(message);
      
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

