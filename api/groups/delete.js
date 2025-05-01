import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../../lib/authMiddleware';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();

  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { groupId } = req.body;

  if (!ObjectId.isValid(groupId)) {
    return res.status(400).json({ message: 'Invalid group ID' });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection('groups').deleteOne({
      _id: new ObjectId(groupId),
      organizerEmail: user.email
    });

    if (result.deletedCount === 0) {
      return res.status(403).json({ message: 'You are not allowed to delete this group or it does not exist' });
    }

    return res.status(200).json({ message: 'Group deleted' });
  } catch (err) {
    console.error('[delete group] error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
