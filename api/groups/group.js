import clientPromise from '../../lib/mongodb.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../../lib/authMiddleware.js';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db();

  if (req.method === 'POST') {
    // Create group
    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { name } = req.body;

    const result = await db.collection('groups').insertOne({
      name,
      organizerEmail: user.email,
      members: [],
      events: []
    });

    return res.status(201).json({ groupId: result.insertedId.toString() });

  } else if (req.method === 'GET') {
    // Get group
    const { groupId } = req.query;

    if (!ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: 'Invalid group ID' });
    }

    const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) });
    if (!group) return res.status(404).json({ message: 'Not found' });

    return res.status(200).json({ group });

  } else if (req.method === 'DELETE') {
    // Delete group
    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { groupId } = req.body;

    if (!ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: 'Invalid group ID' });
    }

    try {
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

  } else {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
}
