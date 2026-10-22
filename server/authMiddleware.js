import { verifyToken } from './auth.js'

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  try {
    const { userId } = await verifyToken(token)
    if (!userId) return res.status(401).json({ error: 'Invalid token' })
    req.userId = userId
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// Attaches req.userId when a valid token is present; otherwise continues
// anonymously. Used for endpoints that serve extra per-user data.
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (token) {
    try {
      const { userId } = await verifyToken(token)
      if (userId) req.userId = userId
    } catch {
      // ignore invalid tokens — request proceeds anonymously
    }
  }
  next()
}
