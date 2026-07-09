
import { supabase } from '../config/supabase.js';

/**
 * @typedef {Object} AuthenticatedRequest
 * @property {Object} user - The authenticated Supabase user object
 * @property {string} user.id - The user's ID
 */

/**
 * @param {AuthenticatedRequest} req
 * @param {Object} res
 * @param {Function} next
 */
export async function verifyAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const accessToken = authHeader.slice(7);
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
