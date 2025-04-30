import clientPromise from '../../lib/mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body;
  const client = await clientPromise;
  const db = client.db();

  const user = await db.collection('users').findOne({ email });
  if (!user) return res.status(400).json({ message: 'Invalid login' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ message: 'Invalid login' });

  const token = jwt.sign({ email: user.email }, SECRET, { expiresIn: '7d' });
  res.status(200).json({ token });
}
