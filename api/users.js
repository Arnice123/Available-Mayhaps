import clientPromise from '../lib/mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../lib/authMiddleware';

const SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db();

  const method = req.method;
  const action = req.query.action;

  if (method === 'POST' && action === 'signup') {
    // SIGN UP
    const { email, password } = req.body;

    const user = await db.collection('users').findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection('users').insertOne({ email, password: hashedPassword });

    return res.status(201).json({ message: 'User created' });

  } else if (method === 'POST' && action === 'login') {
    // LOGIN
    const { email, password } = req.body;

    const user = await db.collection('users').findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid login' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: 'Invalid login' });

    const token = jwt.sign({ email: user.email }, SECRET, { expiresIn: '7d' });
    return res.status(200).json({ token });

  } else if (method === 'GET') {
    // FETCH USER'S GROUPS
    const user = authenticateToken(req);
    if (!user) {
      console.log('[groups] No user — unauthorized');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      console.log('[groups] Authenticated user:', user.email);

      const groups = await db.collection('groups').find({
        $or: [
          { organizerEmail: user.email },
          { members: { $elemMatch: { email: user.email } } }
        ]
      }).toArray();

      console.log('[groups] Found groups:', groups.length);
      return res.status(200).json({ groups });

    } catch (err) {
      console.error('[groups] Internal server error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

  } else {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
}
