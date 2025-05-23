import clientPromise from '../../lib/mongodb.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../../lib/authMiddleware.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { groupId, eventId, availability, note } = req.body;
  if (!groupId || !eventId || !availability) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    await db.collection('groups').updateOne(
      { _id: new ObjectId(groupId), "events._id": new ObjectId(eventId) },
      {
        $pull: { "events.$.responses": { email: user.email } }
      }
    );
    
    await db.collection('groups').updateOne(
      { _id: new ObjectId(groupId), "events._id": new ObjectId(eventId) },
      {
        $push: {
          "events.$.responses": {
            email: user.email,
            username: user.username,
            availability,
            note,
            submittedAt: new Date()
          }
        }
      }
    );
    

    return res.status(200).json({ message: 'Availability submitted' });
  } catch (err) {
    console.error('[submitAvailability]', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
