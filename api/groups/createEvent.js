import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../../lib/authMiddleware';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { groupId, title, description, availability, startDate, endDate, startTime, endTime, } = req.body;

  if (!groupId || !title || !availability || !startDate || !endDate || !startTime || !endTime) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) });
    if (!group || group.organizerEmail !== user.email) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const event = {
      _id: new ObjectId(),
      title,
      description,
      availabilityTemplate: availability,
      responses: [],
      createdAt: new Date(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime,
      endTime,
    };

    await db.collection('groups').updateOne(
      { _id: new ObjectId(groupId) },
      { $push: { events: event } }
    );

    res.status(201).json({ message: 'Event created', eventId: event._id });
  } catch (err) {
    console.error('[createEvent] Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}
