import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../../lib/authMiddleware';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { groupId, eventId, emailToExclude } = req.body;

  const client = await clientPromise;
  const db = client.db();

  const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) });
  if (!group || group.organizerEmail !== user.email) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const updateResult = await db.collection('groups').updateOne(
    { _id: new ObjectId(groupId), "events._id": new ObjectId(eventId) },
    { $addToSet: { "events.$.excludedEmails": emailToExclude } }
  );

  return res.status(200).json({ message: 'Email permanently excluded' });
}
