const jwt = require('jsonwebtoken');
const db = require('./db-pg');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

function extractToken(req) {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
        return null;
    }

    return authHeader.slice(7).trim();
}

async function authenticateToken(req, res, next) {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authorization token is required',
        });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.role && payload.role !== 'user') {
            return res.status(403).json({
                success: false,
                message: 'User access required',
            });
        }

        const result = await db.query(
            `
                SELECT id, username, email, is_active AS "isActive", can_send_push_notifications AS "canSendPushNotifications"
                FROM users
                WHERE id = $1
            `,
            [payload.id],
        );

        if (!result.rows.length || !result.rows[0].isActive) {
            return res.status(403).json({
                success: false,
                message: 'User account is inactive or unavailable',
            });
        }

        req.user = {
            id: result.rows[0].id,
            username: result.rows[0].username,
            email: result.rows[0].email,
            canSendPushNotifications: Boolean(result.rows[0].canSendPushNotifications),
            role: 'user',
        };

        return next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token',
        });
    }
}

async function authenticateAdmin(req, res, next) {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Admin token is required',
        });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access denied',
            });
        }

        const result = await db.query(
            `
                SELECT id, username, role, permissions, is_active AS "isActive"
                FROM admin_users
                WHERE id = $1
            `,
            [payload.id],
        );

        if (!result.rows.length || !result.rows[0].isActive) {
            return res.status(403).json({
                success: false,
                message: 'Admin account is inactive or unavailable',
            });
        }

        req.admin = {
            id: result.rows[0].id,
            username: result.rows[0].username,
            role: result.rows[0].role,
            permissions: result.rows[0].permissions || [],
        };

        return next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired admin token',
        });
    }
}

module.exports = {
    JWT_SECRET,
    authenticateAdmin,
    authenticateToken,
};
