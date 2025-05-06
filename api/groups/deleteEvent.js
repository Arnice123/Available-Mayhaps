import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../../lib/authMiddleware';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();

  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { groupId, eventId } = req.body;

  if (!groupId || !eventId) {
    return res.status(400).json({ message: 'Missing groupId or eventId' });
  }  

  const client = await clientPromise;
  const db = client.db();

  const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) });
  if (!group || group.organizerEmail !== user.email) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  await db.collection('groups').updateOne(
    { _id: new ObjectId(groupId) },
    { $pull: { events: { _id: new ObjectId(eventId) } } }
  );

  return res.status(200).json({ message: 'Event deleted' });
}
