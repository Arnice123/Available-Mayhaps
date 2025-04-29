import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export function authenticateToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}
