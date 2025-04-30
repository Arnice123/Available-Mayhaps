import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { groupId } = req.query;
  const client = await clientPromise;
  const db = client.db();

  const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) });
  if (!group) return res.status(404).json({ message: 'Not found' });

  res.status(200).json({ group });
}
