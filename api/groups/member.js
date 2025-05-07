import clientPromise from '../../lib/mongodb.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../../lib/authMiddleware.js';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db();

  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  if (req.method === 'POST') {
    const { groupId, memberEmail } = req.body;

    try {
      // Find user to get their username
      const userToAdd = await db.collection('users').findOne({ email: memberEmail });
      if (!userToAdd) {
        return res.status(404).json({ message: 'User not found' });
      }

      await db.collection('groups').updateOne(
        { _id: new ObjectId(groupId), organizerEmail: user.email },
        {
          $addToSet: {
            members: { email: memberEmail, username: userToAdd.username }
          }
        }
      );

      return res.status(200).json({ message: 'Member added' });
    } catch (err) {
      console.error('Error adding member:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

  } else if (req.method === 'DELETE') {
    const { groupId, emailToDelete } = req.body;

    try {
      const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) });
      if (!group || group.organizerEmail !== user.email) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      await db.collection('groups').updateOne(
        { _id: new ObjectId(groupId) },
        { $pull: { members: { email: emailToDelete } } }
      );

      return res.status(200).json({ message: 'User removed' });
    } catch (err) {
      console.error('Deletion error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

  } else {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
}
