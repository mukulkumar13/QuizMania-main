import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export default function checkUserLogin(req, res, next) {
  // Retrieve the JWT cookie from the request
  const jwtCookie = req.cookies.jwt;

  // Checking if the JWT cookie exists
  if (!jwtCookie) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Verify the JWT token
    const decoded = jwt.verify(jwtCookie, process.env.JWT_SECRET); 
    
    req.user = decoded;
    next();
  } catch (err) {
    // If the JWT verification fails
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
