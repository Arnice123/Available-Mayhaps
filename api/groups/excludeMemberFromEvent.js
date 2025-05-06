import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../../lib/authMiddleware';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();

  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { groupId, eventId, emailToDelete } = req.body;

  const client = await clientPromise;
  const db = client.db();

  const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) });
  if (!group || group.organizerEmail !== user.email) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  const result = await db.collection('groups').updateOne(
    { _id: new ObjectId(groupId), 'events._id': new ObjectId(eventId) },
    {
      $pull: {
        'events.$.responses': { email: emailToDelete }
      }
    }
  );

  if (result.modifiedCount === 0) {
    return res.status(404).json({ message: 'No matching response found to delete' });
  }  

  return res.status(200).json({ message: 'Response deleted' });
}
