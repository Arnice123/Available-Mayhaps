import { Resend } from 'resend';
import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../../lib/authMiddleware';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { groupId, message } = req.body;
  const client = await clientPromise;
  const db = client.db();

  const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) });

  if (!group || group.organizerEmail !== user.email)
    return res.status(403).json({ message: 'Forbidden' });

  const emails = group.members.map(m => m.email);
  if (emails.length === 0) return res.status(400).json({ message: 'No members' });

  await resend.emails.send({
    from: process.env.RESEND_VERIFIED_EMAIL,
    to: emails,
    subject: `Message from ${group.name}`,
    text: message,
  });

  res.status(200).json({ message: 'Emails sent' });
}
