import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../../../lib/authMiddleware';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { groupId, memberEmail } = req.body;
  const client = await clientPromise;
  const db = client.db();

  await db.collection('groups').updateOne(
    { _id: new ObjectId(groupId), organizerEmail: user.email },
    { $addToSet: { members: { email: memberEmail } } }
  );

  res.status(200).json({ message: 'Member added' });
}
