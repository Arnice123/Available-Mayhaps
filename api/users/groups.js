import clientPromise from '../../lib/mongodb';
import { authenticateToken } from '../../lib/authMiddleware';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const user = authenticateToken(req);
  if (!user) {
    console.log('[groups] No user — unauthorized');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    console.log('[groups] Authenticated user:', user.email);

    const client = await clientPromise;
    const db = client.db();

    const groups = await db.collection('groups').find({
      $or: [
        { organizerEmail: user.email },
        { members: { $elemMatch: { email: user.email } } }
      ]
    }).toArray();

    console.log('[groups] Found groups:', groups.length);

    return res.status(200).json({ groups });
  } catch (err) {
    console.error('[groups] Internal server error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
