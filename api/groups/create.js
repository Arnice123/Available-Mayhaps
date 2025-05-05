import clientPromise from '../../lib/mongodb';
import { authenticateToken } from '../../lib/authMiddleware';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { name } = req.body;
  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection('groups').insertOne({
    name,
    organizerEmail: user.email,
    members: [],
    events: []
  });

  res.status(201).json({ groupId: result.insertedId.toString() });
}
