import express from 'express';
import { parse } from 'url';

import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../../lib/authMiddleware';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const SECRET = process.env.JWT_SECRET;

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});


// ---- Grouped Endpoints ----

app.post('/groups/addMember', async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();

    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { groupId, memberEmail } = req.body;
    const client = await clientPromise;
    const db = client.db();

    await db.collection('groups').updateOne(
    { _id: new ObjectId(groupId), organizerEmail: user.email },
    { $addToSet: { members: { email: memberEmail } } }
    );

    res.status(200).json({ message: 'Member added' });
})

app.post('/groups/create', async (req, res) => {
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
})

app.post('/groups/createEvent', async (req, res) => {
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
})

app.delete('/groups/delete', async (req, res) => {
    if (req.method !== 'DELETE') return res.status(405).end();

    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
  
    const { groupId } = req.body;
  
    if (!ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: 'Invalid group ID' });
    }
  
    try {
      const client = await clientPromise;
      const db = client.db();
  
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
})

app.delete('/groups/deleteEvent', async (req, res) => {
    if (req.method !== 'DELETE') return res.status(405).end();

    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
  
    const { groupId, eventId } = req.body;
  
    if (!groupId || !eventId) {
      return res.status(400).json({ message: 'Missing groupId or eventId' });
    }  
  
    const client = await clientPromise;
    const db = client.db();
  
    const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) });
    if (!group || group.organizerEmail !== user.email) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    await db.collection('groups').updateOne(
      { _id: new ObjectId(groupId) },
      { $pull: { events: { _id: new ObjectId(eventId) } } }
    );
  
    return res.status(200).json({ message: 'Event deleted' });
})

app.delete('/groups/deleteMember', async (req, res) => {
    if (req.method !== 'DELETE') return res.status(405).end();

    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
  
    const { groupId, emailToDelete } = req.body;
  
    try {
      const client = await clientPromise;
      const db = client.db();
  
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
})

app.delete('/groups/excludeMemberFromEvent', async (req, res) => {
    if (req.method !== 'DELETE') return res.status(405).end();

    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
  
    const { groupId, eventId, emailToDelete } = req.body;
  
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
      return res.status(404).json({ message: 'No matching response found to delete' });
    }  
  
    return res.status(200).json({ message: 'Response deleted' });
})

app.get('/groups/get', async (req, res) => {
    if (req.method !== 'GET') return res.status(405).end();

    const { groupId } = req.query;
    const client = await clientPromise;
    const db = client.db();
  
    const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) });
    if (!group) return res.status(404).json({ message: 'Not found' });
  
    res.status(200).json({ group });
})

app.post('/groups/sendNotification', async (req, res) => {
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
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD        // app password (not your Gmail login password)
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
})

app.post('/groups/submitAvailability', async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();

    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
  
    const { groupId, eventId, availability } = req.body;
    if (!groupId || !eventId || !availability) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
  
    try {
      const client = await clientPromise;
      const db = client.db();
  
      await db.collection('groups').updateOne(
        { _id: new ObjectId(groupId), "events._id": new ObjectId(eventId) },
        {
          $pull: { "events.$.responses": { email: user.email } }
        }
      );
      
      await db.collection('groups').updateOne(
        { _id: new ObjectId(groupId), "events._id": new ObjectId(eventId) },
        {
          $push: {
            "events.$.responses": {
              email: user.email,
              availability,
              submittedAt: new Date()
            }
          }
        }
      );
      
  
      return res.status(200).json({ message: 'Availability submitted' });
    } catch (err) {
      console.error('[submitAvailability]', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
})

app.get('/users/groups', async (req, res) => {
    if (req.method !== 'GET') return res.status(405).end();

    const user = authenticateToken(req);
    if (!user) {
      console.log('[groups] No user — unauthorized');
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    try {
      console.log('[groups] Authenticated user:', user.email);
  
      const client = await clientPromise;
      const db = client.db();
  
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
})


app.post('/users/login', async (req, res) => {
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
})

app.post('/users/signup', async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();

    const { email, password } = req.body;
    const client = await clientPromise;
    const db = client.db();
  
    const user = await db.collection('users').findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });
  
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection('users').insertOne({ email, password: hashedPassword });
  
    res.status(201).json({ message: 'User created' });
})

// ---- Export to Vercel ----

export default (req, res) => {
  const parsedUrl = parse(req.url, true);
  req.query = parsedUrl.query;
  return app(req, res);
};
