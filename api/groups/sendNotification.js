import clientPromise from '../../lib/mongodb.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../../lib/authMiddleware.js';
import nodemailer from 'nodemailer';

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

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      auth: {
        user: process.env.EMAIL_USERNAME, // Brevo login email
        pass: process.env.EMAIL_PASSWORD  // Brevo SMTP key
      }
    });
    

    await transporter.sendMail({
      from: `"${group.name}" <${process.env.EMAIL_USERNAME}>`,
      replyTo: process.env.EMAIL_USERNAME,
      bcc: emails,
      subject: `Message from ${group.name}`,
      text: message,
    });
    

    res.status(200).json({ message: 'Emails sent' });
  } catch (err) {
    console.error('[nodemailer] error:', err);
    res.status(500).json({ message: 'Failed to send email' });
  }
}