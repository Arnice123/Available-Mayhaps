import clientPromise from '../../lib/mongodb';
import authenticateToken from '../../lib/authMiddleware'

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end()

    const user = authenticateToken(req)
    if (!user) return res.status(401).json({ message: 'Unauthorized'})

    try {
        const client = await clientPromise
        const db = client.db()

        const groups = await db.collection('groups').find({
            $or: [
              { organizerEmail: user.email },
              { members: { $elemMatch: { email: user.email } } }
            ]
        }).toArray();
        
        res.status(200).json({ groups })
    } catch (err) {
        console.error('Failed to fecth groups:', err)
        res.status(500).json({message: "Internal server error"})
    }
}