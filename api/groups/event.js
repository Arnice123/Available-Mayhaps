import clientPromise from '../../lib/mongodb.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../../lib/authMiddleware.js';

export default async function handler(req, res) {
    const client = await clientPromise;
    const db = client.db();

    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    if (req.method === 'POST') {      
        const { groupId, title, description, availability, startDate, endDate, startTime, endTime, } = req.body;
      
        if (!groupId || !title || !availability || !startDate || !endDate || !startTime || !endTime) {
          return res.status(400).json({ message: 'Missing required fields' });
        }
      
        try {
      
          const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) });
          if (!group) {
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
    } else if (req.method === 'DELETE') {
        const { groupId, eventId } = req.body;
      
        if (!groupId || !eventId) {
          return res.status(400).json({ message: 'Missing groupId or eventId' });
        }  
      
        const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) });
        if (!group || group.organizerEmail !== user.email) {
          return res.status(403).json({ message: 'Forbidden' });
        }
        
        await db.collection('groups').updateOne(
          { _id: new ObjectId(groupId) },
          { $pull: { events: { _id: new ObjectId(eventId) } } }
        );
      
        return res.status(200).json({ message: 'Event deleted' });
    } else if (req.method === 'PATCH') {
        const { groupId, eventId, emailToDelete } = req.body;

        if (!groupId || !eventId || !emailToDelete || 
            !ObjectId.isValid(groupId) || !ObjectId.isValid(eventId)) {
          return res.status(400).json({ message: 'Invalid input' });
        }
      
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
          return res.status(404).json({ message: 'No matching response found to remove' });
        }
      
        return res.status(200).json({ message: 'Response removed' });
    }else {
    return res.status(405).json({ message: 'Method Not Allowed' });
    }
}
