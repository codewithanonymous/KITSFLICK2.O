const express = require('express');
const http = require('http');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');
const cors = require('cors');
require('dotenv').config();

const db = require('./db-pg');
const { initSocket, emitDeletedSnap, emitNewSnap, emitUpdatedSnap } = require('./socket');
const { JWT_SECRET, authenticateAdmin, authenticateToken } = require('./auth-helpers');
const {
    fetchOrganizations,
    fetchPostById,
    fetchPosts,
    fetchUserOrganizations,
    createPost,
    normalizeText,
    normalizeOptionalText,
    parseBoolean,
    parseUuid,
    sanitizeOrganizationType,
    updatePost,
} = require('./post-service');
const jwt = require('jsonwebtoken');
const webpush = require('./push');
const {
    deletePushSubscriptionByEndpoint,
    listPushSubscriptionsForApprovedUsers,
    upsertPushSubscription,
} = require('./push-subscriptions');

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 5000);
const builtFrontendDir = path.join(__dirname, '../frontend/dist');
const frontendDir = fs.existsSync(builtFrontendDir) ? builtFrontendDir : path.join(__dirname, '../frontend');
const uploadDir = path.join(__dirname, '../frontend', 'uploads');
const CORS_DEBUG_ALL = process.env.CORS_DEBUG_ALL === 'true';
const PUSH_ENABLED = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

function normalizeOrigin(origin = '') {
    return origin.trim().replace(/\/+$/, '').toLowerCase();
}

const defaultAllowedOrigins = [
    'https://kitsflick.in',
    'https://www.kitsflick.in',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

const configuredAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

const allowedOrigins = new Set([
    ...defaultAllowedOrigins.map((origin) => normalizeOrigin(origin)),
    ...configuredAllowedOrigins,
]);

const wildcardOrigins = configuredAllowedOrigins.filter((origin) => origin.includes('*'));

function matchesWildcardOrigin(origin) {
    return wildcardOrigins.some((pattern) => {
        const normalizedPattern = normalizeOrigin(pattern);
        if (!normalizedPattern.startsWith('https://*.')) {
            return false;
        }

        const suffix = normalizedPattern.replace('https://*', '');
        return origin.startsWith('https://') && origin.endsWith(suffix);
    });
}

function isAllowedOrigin(origin) {
    const normalizedOrigin = normalizeOrigin(origin);
    if (allowedOrigins.has(normalizedOrigin)) {
        return true;
    }

    if (matchesWildcardOrigin(normalizedOrigin)) {
        return true;
    }

    try {
        const parsed = new URL(normalizedOrigin);
        if (parsed.protocol === 'https:' && (parsed.hostname === 'kitsflick.in' || parsed.hostname.endsWith('.kitsflick.in'))) {
            return true;
        }
    } catch (error) {
        return false;
    }

    return false;
}

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

initSocket(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (CORS_DEBUG_ALL) {
    console.warn('[BE][CORS] Debug mode enabled via CORS_DEBUG_ALL=true (all origins allowed)');
    app.use(cors());
} else {
    const corsOptions = {
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }

            if (isAllowedOrigin(origin)) {
                callback(null, true);
                return;
            }

            console.warn(`[BE][CORS] Blocked origin: ${origin}`);
            callback(new Error(`Origin not allowed by CORS: ${origin}`));
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        credentials: true,
        optionsSuccessStatus: 204,
    };

    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions));
}

app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next();
    }

    return express.static(frontendDir)(req, res, next);
});

app.use((req, res, next) => {
    const startedAt = Date.now();
    const origin = req.headers.origin || 'n/a';
    const bodyKeys = req.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
    console.log(`[BE][REQ] ${req.method} ${req.originalUrl} origin=${origin} bodyKeys=${bodyKeys.join(',') || 'none'}`);
    res.on('finish', () => {
        console.log(`[BE][RES] ${req.method} ${req.originalUrl} status=${res.statusCode} durationMs=${Date.now() - startedAt}`);
    });
    next();
});

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`),
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.'));
    },
});

function normalizeUploadedFiles(req, res, next) {
    if (req.files && !Array.isArray(req.files)) {
        req.files = Object.values(req.files).flat();
    }
    next();
}

function cleanUpTempFiles(files = []) {
    files.forEach((file) => {
        if (!file?.path) {
            return;
        }

        try {
            fs.unlinkSync(file.path);
        } catch (error) {
            console.warn('Failed to clean temporary upload:', error.message);
        }
    });
}

function buildPushPayload(post) {
    const authorName = String(post?.username || 'Someone').trim() || 'Someone';
    const postTitle = String(post?.title || '').trim();
    const postCaption = String(post?.caption || '').trim();
    const title = post?.postType === 'notice' ? 'New Notice on KITSflick' : 'New Post on KITSflick';
    const bodySource = postTitle || postCaption || 'A new update is available.';

    return {
        title,
        body: `${authorName}: ${bodySource}`.slice(0, 180),
        url: '/#/feed',
        postId: post?.id || null,
    };
}

async function sendPushToApprovedUsers(title, body, metadata = {}) {
    if (!PUSH_ENABLED) {
        return { attempted: 0, sent: 0 };
    }

    const safeTitle = normalizeText(String(title || ''), 120) || 'KITSflick';
    const safeBody = normalizeText(String(body || ''), 240) || 'New update available.';
    const payload = JSON.stringify({
        title: safeTitle,
        body: safeBody,
        ...metadata,
    });

    const subscriptions = await listPushSubscriptionsForApprovedUsers();
    console.log(`[BE][PUSH] Sending push to: ${subscriptions.length}`);

    if (!subscriptions.length) {
        return { attempted: 0, sent: 0 };
    }

    let sent = 0;
    await Promise.allSettled(subscriptions.map(async ({ endpoint, subscription }) => {
        try {
            await webpush.sendNotification(subscription, payload);
            sent += 1;
        } catch (error) {
            const statusCode = Number(error?.statusCode || 0);
            if (statusCode === 404 || statusCode === 410) {
                await deletePushSubscriptionByEndpoint(endpoint);
                return;
            }
            console.warn('[BE][PUSH] Push send failed:', error?.message || error);
        }
    }));

    return { attempted: subscriptions.length, sent };
}

async function sendPostNotifications(post) {
    try {
        const payload = buildPushPayload(post);
        await sendPushToApprovedUsers(payload.title, payload.body, { url: payload.url, postId: payload.postId });
    } catch (error) {
        console.warn('[BE][PUSH] Notification dispatch failed:', error?.message || error);
    }
}

async function createRequestRecord({ tableName, organizationColumn, payload, userId = null }) {
    const name = normalizeText(payload.name, 120);
    const email = normalizeText(payload.email, 255).toLowerCase();
    const phoneNumber = normalizeText(payload.phoneNumber, 32);
    const departmentName = normalizeText(payload.departmentName, 120);
    const organizationName = normalizeText(payload.organizationName, 120);
    const description = normalizeOptionalText(payload.description, 3000);

    if (!name || !email || !phoneNumber || !departmentName || !organizationName || !description) {
        throw new Error('All request fields are required');
    }

    const result = await db.query(
        `
            INSERT INTO ${tableName} (
                name,
                email,
                phone_number,
                department_name,
                ${organizationColumn},
                description,
                requester_user_id,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING *
        `,
        [name, email, phoneNumber, departmentName, organizationName, description, userId],
    );

    return result.rows[0];
}

app.get('/', (req, res) => res.sendFile(path.join(frontendDir, 'index.html')));
app.get('/feed', (req, res) => res.sendFile(path.join(frontendDir, 'feed.html')));
app.get('/upload', (req, res) => res.sendFile(path.join(frontendDir, 'upload.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(frontendDir, 'admin.html')));

const handleSignup = async (req, res) => {
    try {
        console.log('[BE][FLOW] Signup route hit (/api/signup or /api/register)');
        const username = normalizeText(req.body.username, 50);
        const email = normalizeText(req.body.email, 255).toLowerCase();
        const password = String(req.body.password || '').trim();

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Username, email, and password are required' });
        }

        if (!email.endsWith('@kitsw.ac.in')) {
            return res.status(400).json({ success: false, message: 'Please use a valid @kitsw.ac.in email address' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, passwordHash],
        );

        console.log(`[BE][FLOW] Signup success userId=${result.rows[0].id}`);
        void sendPushToApprovedUsers('New User', 'Someone just joined KITSFlick!', { url: '/#/feed' });
        return res.status(201).json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(400).json({ success: false, message: error.code === '23505' ? 'Username or email already exists' : 'Failed to create account' });
    }
};

app.post('/api/signup', handleSignup);
app.post('/api/register', handleSignup);

app.post('/api/association-requests', async (req, res) => {
    try {
        const request = await createRequestRecord({
            tableName: 'association_requests',
            organizationColumn: 'association_name',
            payload: { ...req.body, organizationName: req.body.associationName },
            userId: parseUuid(req.body.requesterUserId),
        });
        return res.status(201).json({ success: true, request });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message || 'Failed to submit association request' });
    }
});

app.post('/api/club-requests', async (req, res) => {
    try {
        const request = await createRequestRecord({
            tableName: 'club_requests',
            organizationColumn: 'club_name',
            payload: { ...req.body, organizationName: req.body.clubName },
            userId: parseUuid(req.body.requesterUserId),
        });
        return res.status(201).json({ success: true, request });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message || 'Failed to submit club request' });
    }
});

app.post('/api/queries', async (req, res) => {
    try {
        const name = normalizeText(req.body.name, 120);
        const email = normalizeText(req.body.email, 255).toLowerCase();
        const phoneNumber = normalizeText(req.body.phoneNumber, 32);
        const message = normalizeText(req.body.message, 4000);
        const requesterUserId = parseUuid(req.body.requesterUserId);

        if (!name || !email || !phoneNumber || !message) {
            return res.status(400).json({ success: false, message: 'All query fields are required' });
        }

        const result = await db.query(
            `
                INSERT INTO queries (name, email, phone_number, message, requester_user_id, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
                RETURNING id, name, email, phone_number AS "phoneNumber", message, is_resolved AS "isResolved", created_at AS "createdAt"
            `,
            [name, email, phoneNumber, message, requesterUserId],
        );

        return res.status(201).json({ success: true, query: result.rows[0] });
    } catch (error) {
        console.error('Create query error:', error);
        return res.status(400).json({ success: false, message: 'Failed to submit query' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        console.log('[BE][FLOW] Login route hit (/api/login)');
        const identifier = normalizeText(req.body.username || req.body.email, 120);
        const password = String(req.body.password || '').trim();

        if (!identifier || !password) {
            return res.status(400).json({ success: false, message: 'Username or email and password are required' });
        }

        const result = await db.query(
            `
                SELECT id, username, email, password_hash, is_active AS "isActive"
                FROM users
                WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)
                LIMIT 1
            `,
            [identifier],
        );

        if (!result.rows.length) {
            return res.status(401).json({ success: false, message: 'Invalid username/email or password' });
        }

        const user = result.rows[0];
        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'This user account has been disabled' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid username/email or password' });
        }

        await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        const token = jwt.sign({ id: user.id, username: user.username, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });

        console.log(`[BE][FLOW] Login success userId=${user.id}`);
        return res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, role: 'user' } });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'Error during login' });
    }
});

app.post('/api/admin/login', async (req, res) => {
    try {
        const username = normalizeText(req.body.username, 50);
        const password = String(req.body.password || '').trim();
        const result = await db.query(
            'SELECT id, username, password_hash, role, permissions, is_active AS "isActive" FROM admin_users WHERE username = $1',
            [username],
        );

        if (!result.rows.length) {
            return res.status(401).json({ success: false, message: 'Login failed' });
        }

        const admin = result.rows[0];
        if (!admin.isActive) {
            return res.status(403).json({ success: false, message: 'Admin account is disabled' });
        }

        const validPassword = await bcrypt.compare(password, admin.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Login failed' });
        }

        await db.query('UPDATE admin_users SET last_login = NOW(), updated_at = NOW() WHERE id = $1', [admin.id]);
        const token = jwt.sign({ id: admin.id, username: admin.username, role: 'admin', adminRole: admin.role }, JWT_SECRET, { expiresIn: '24h' });

        return res.json({ success: true, token, admin: { id: admin.id, username: admin.username, role: admin.role, permissions: admin.permissions || [] } });
    } catch (error) {
        console.error('Admin login error:', error);
        return res.status(500).json({ success: false, message: 'Login failed' });
    }
});

app.get('/api/feed', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const offset = (page - 1) * limit;
        const snaps = await fetchPosts({ limit, offset, includeExpired: false });
        const countResult = await db.query("SELECT COUNT(*)::int AS count FROM snaps WHERE expires_at IS NULL OR expires_at > NOW() OR post_type IN ('text', 'notice')");
        const totalItems = countResult.rows[0].count;
        return res.json({ success: true, snaps, pagination: { page, limit, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / limit)) } });
    } catch (error) {
        console.error('Feed error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch feed' });
    }
});

app.get('/api/snaps', async (req, res) => {
    try {
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        return res.json({ success: true, snaps: await fetchPosts({ limit, offset: 0, includeExpired: parseBoolean(req.query.includeExpired) }) });
    } catch (error) {
        console.error('Posts error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch posts' });
    }
});

app.get('/api/snaps/:id', async (req, res) => {
    const snap = await fetchPostById(req.params.id);
    if (!snap) {
        return res.status(404).json({ success: false, message: 'Post not found' });
    }
    return res.json({ success: true, snap });
});

app.get('/api/me/organizations', authenticateToken, async (req, res) => {
    return res.json({ success: true, organizations: await fetchUserOrganizations(req.user.id) });
});

app.post('/api/push/subscribe', authenticateToken, async (req, res) => {
    try {
        const subscription = req.body?.subscription;
        const endpoint = String(subscription?.endpoint || '').trim();

        if (!endpoint) {
            return res.status(400).json({ success: false, message: 'Valid push subscription data is required' });
        }

        await upsertPushSubscription({ userId: req.user.id, subscription });
        return res.json({ success: true, message: 'Subscription saved' });
    } catch (error) {
        console.error('Save push subscription error:', error);
        return res.status(400).json({ success: false, message: error.message || 'Failed to save subscription' });
    }
});

async function handleManualPush(req, res) {
    try {
        const title = normalizeText(req.body?.title, 120) || 'Manual Push';
        const body = normalizeText(req.body?.body, 240) || 'Manual push notification from KITSFlick.';
        const url = normalizeOptionalText(req.body?.url, 512) || '/#/feed';
        const result = await sendPushToApprovedUsers(title, body, { url });

        return res.json({
            success: true,
            message: 'Push trigger completed',
            attempted: result.attempted,
            sent: result.sent,
        });
    } catch (error) {
        console.error('Manual send-push error:', error);
        return res.status(400).json({ success: false, message: error.message || 'Failed to trigger push' });
    }
}

app.post('/send-push', authenticateAdmin, handleManualPush);
app.post('/api/send-push', authenticateAdmin, handleManualPush);

app.get('/api/snaps/image/:id', async (req, res) => {
    const result = await db.query('SELECT image_data, mime_type FROM snaps WHERE id = $1', [req.params.id]);
    if (!result.rows.length || !result.rows[0].image_data) {
        return res.status(404).send('Image not found');
    }
    res.set('Content-Type', result.rows[0].mime_type || 'application/octet-stream');
    return res.send(result.rows[0].image_data);
});

async function handleUserPost(req, res) {
    const files = Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];
    let client;

    try {
        client = await db.getClient();
        await client.query('BEGIN');

        const payload = {
            title: req.body.title,
            caption: req.body.caption,
            location: req.body.location,
            hashtags: req.body.hashtags,
            organizationId: req.body.organizationId,
            postType: req.body.postType,
            authorTypeOverride: req.body.postAs === 'organization' ? 'organization' : 'user',
            isAnonymous: req.body.anonymous,
            imageUrl: req.body.imageUrl,
        };

        const createdPosts = [];
        if (files.length) {
            for (const file of files) {
                createdPosts.push(await createPost({ client, authorType: 'user', userId: req.user.id, ...payload, file }));
            }
        } else {
            createdPosts.push(await createPost({ client, authorType: 'user', userId: req.user.id, ...payload, file: null }));
        }

        await client.query('COMMIT');
        createdPosts.forEach((post) => {
            emitNewSnap(post);
            if (req.user?.canSendPushNotifications) {
                void sendPostNotifications(post);
            }
        });
        return res.status(201).json({ success: true, uploadedCount: createdPosts.length, snap: createdPosts[0], snaps: createdPosts });
    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('Create user post error:', error);
        return res.status(400).json({ success: false, message: error.message || 'Failed to create post' });
    } finally {
        if (client) {
            client.release();
        }
        cleanUpTempFiles(files);
    }
}

app.post('/api/snaps', authenticateToken, upload.single('image'), handleUserPost);
app.post('/api/upload', authenticateToken, upload.fields([{ name: 'image', maxCount: 10 }, { name: 'images', maxCount: 10 }, { name: 'images[]', maxCount: 10 }]), normalizeUploadedFiles, handleUserPost);

app.post('/api/snap/view', authenticateToken, async (req, res) => {
    const snapId = normalizeText(req.body?.snapId, 64);
    if (!snapId) {
        return res.status(400).json({ success: false, message: 'snapId is required' });
    }
    await db.query('UPDATE snaps SET view_count = view_count + 1, updated_at = NOW() WHERE id = $1', [snapId]);
    return res.json({ success: true, message: 'Post view recorded' });
});

app.get('/api/users', authenticateAdmin, async (req, res) => {
    const result = await db.query(`
        SELECT
            u.id,
            u.username,
            u.email,
            u.is_active AS "isActive",
            u.can_send_push_notifications AS "canSendPushNotifications",
            u.created_at AS "createdAt",
            u.updated_at AS "updatedAt",
            u.last_login AS "lastLogin",
            COUNT(s.id)::int AS "postCount"
        FROM users u
        LEFT JOIN snaps s ON s.user_id = u.id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    `);
    return res.json({ success: true, users: result.rows });
});

app.patch('/api/users/:id/status', authenticateAdmin, async (req, res) => {
    const result = await db.query('UPDATE users SET is_active = $2, updated_at = NOW() WHERE id = $1 RETURNING id, username, email, is_active AS "isActive"', [req.params.id, parseBoolean(req.body?.isActive)]);
    if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, user: result.rows[0] });
});

app.patch('/api/users/:id/push-notifications', authenticateAdmin, async (req, res) => {
    const result = await db.query(
        `
            UPDATE users
            SET can_send_push_notifications = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING
                id,
                username,
                email,
                can_send_push_notifications AS "canSendPushNotifications"
        `,
        [req.params.id, parseBoolean(req.body?.canSendPushNotifications)],
    );

    if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, user: result.rows[0] });
});

app.delete('/api/users/:id', authenticateAdmin, async (req, res) => {
    const result = await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (!result.rowCount) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, message: 'User deleted successfully' });
});

app.get('/api/admin/posts', authenticateAdmin, async (req, res) => {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));
    return res.json({ success: true, posts: await fetchPosts({ limit, offset: 0, includeExpired: true }) });
});

app.post('/api/admin/posts', authenticateAdmin, upload.single('image'), async (req, res) => {
    const files = req.file ? [req.file] : [];
    let client;
    try {
        client = await db.getClient();
        await client.query('BEGIN');
        const post = await createPost({ client, authorType: 'admin', adminUserId: req.admin.id, title: req.body.title, caption: req.body.caption, location: req.body.location, hashtags: req.body.hashtags, organizationId: req.body.organizationId, postType: req.body.postType, isAnonymous: req.body.anonymous, file: req.file, imageUrl: req.body.imageUrl });
        await client.query('COMMIT');
        emitNewSnap(post);
        void sendPostNotifications(post);
        return res.status(201).json({ success: true, post });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Admin create post error:', error);
        return res.status(400).json({ success: false, message: error.message || 'Failed to create admin post' });
    } finally {
        if (client) client.release();
        cleanUpTempFiles(files);
    }
});

app.post('/api/admin/notices', authenticateAdmin, async (req, res) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const notice = await createPost({ client, authorType: 'admin', adminUserId: req.admin.id, title: req.body.title || 'Official notice', caption: req.body.caption, location: req.body.location, hashtags: req.body.hashtags, organizationId: req.body.organizationId, postType: 'notice', isAnonymous: false, file: null, imageUrl: req.body.imageUrl });
        await client.query('COMMIT');
        emitNewSnap(notice);
        void sendPostNotifications(notice);
        return res.status(201).json({ success: true, notice });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create notice error:', error);
        return res.status(400).json({ success: false, message: error.message || 'Failed to publish notice' });
    } finally {
        client.release();
    }
});

async function handleAdminUpdate(req, res) {
    const files = req.file ? [req.file] : [];
    let client;
    try {
        client = await db.getClient();
        await client.query('BEGIN');
        const post = await updatePost({ client, id: req.params.id, title: req.body.title, caption: req.body.caption, location: req.body.location, hashtags: req.body.hashtags, organizationId: req.body.organizationId, postType: req.body.postType, isAnonymous: req.body.anonymous, imageUrl: req.body.imageUrl, removeMedia: req.body.removeMedia, file: req.file || null });
        if (!post) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        await client.query('COMMIT');
        emitUpdatedSnap(post);
        return res.json({ success: true, post, message: 'Post updated successfully' });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Admin update post error:', error);
        return res.status(400).json({ success: false, message: error.message || 'Failed to update post' });
    } finally {
        if (client) client.release();
        cleanUpTempFiles(files);
    }
}

app.put('/api/admin/posts/:id', authenticateAdmin, upload.single('image'), handleAdminUpdate);
app.put('/api/admin/snap/:id', authenticateAdmin, handleAdminUpdate);

app.delete('/api/admin/posts/:id', authenticateAdmin, async (req, res) => {
    const result = await db.query('DELETE FROM snaps WHERE id = $1', [req.params.id]);
    if (!result.rowCount) {
        return res.status(404).json({ success: false, message: 'Post not found' });
    }
    emitDeletedSnap(req.params.id);
    return res.json({ success: true, message: 'Post deleted successfully' });
});

app.delete('/api/snaps/:id', authenticateAdmin, async (req, res) => {
    const result = await db.query('DELETE FROM snaps WHERE id = $1', [req.params.id]);
    if (!result.rowCount) {
        return res.status(404).json({ success: false, message: 'Post not found' });
    }
    emitDeletedSnap(req.params.id);
    return res.json({ success: true, message: 'Post deleted successfully' });
});

app.get('/api/admin/organizations', authenticateAdmin, async (req, res) => {
    return res.json({ success: true, organizations: await fetchOrganizations() });
});

app.get('/api/admin/association-requests', authenticateAdmin, async (req, res) => {
    const result = await db.query(
        `
            SELECT
                id,
                name,
                email,
                phone_number AS "phoneNumber",
                department_name AS "departmentName",
                association_name AS "associationName",
                description,
                status,
                admin_notes AS "adminNotes",
                reviewed_at AS "reviewedAt",
                created_at AS "createdAt",
                requester_user_id AS "requesterUserId",
                created_organization_id AS "createdOrganizationId"
            FROM association_requests
            ORDER BY created_at DESC
        `,
    );
    return res.json({ success: true, requests: result.rows });
});

app.get('/api/admin/club-requests', authenticateAdmin, async (req, res) => {
    const result = await db.query(
        `
            SELECT
                id,
                name,
                email,
                phone_number AS "phoneNumber",
                department_name AS "departmentName",
                club_name AS "clubName",
                description,
                status,
                admin_notes AS "adminNotes",
                reviewed_at AS "reviewedAt",
                created_at AS "createdAt",
                requester_user_id AS "requesterUserId",
                created_organization_id AS "createdOrganizationId"
            FROM club_requests
            ORDER BY created_at DESC
        `,
    );
    return res.json({ success: true, requests: result.rows });
});

async function approveRequest({ req, res, tableName, requestNameColumn, organizationKind }) {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const requestResult = await client.query(`SELECT * FROM ${tableName} WHERE id = $1 FOR UPDATE`, [req.params.id]);
        if (!requestResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        const requestRow = requestResult.rows[0];
        if (requestRow.status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'This request has already been reviewed' });
        }

        const organizationResult = await client.query(
            `
                INSERT INTO organizations (kind, name, description, created_by, updated_at)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (kind, name)
                DO UPDATE SET description = EXCLUDED.description, updated_at = NOW()
                RETURNING id, kind, name, description, created_at AS "createdAt", updated_at AS "updatedAt"
            `,
            [organizationKind, requestRow[requestNameColumn], requestRow.description, req.admin.id],
        );

        if (requestRow.requester_user_id) {
            await client.query(
                `
                    INSERT INTO organization_memberships (user_id, organization_id, role, status, updated_at)
                    VALUES ($1, $2, 'owner', 'active', NOW())
                    ON CONFLICT (user_id, organization_id)
                    DO UPDATE SET role = 'owner', status = 'active', updated_at = NOW()
                `,
                [requestRow.requester_user_id, organizationResult.rows[0].id],
            );
        }

        await client.query(
            `
                UPDATE ${tableName}
                SET status = 'approved',
                    admin_notes = $2,
                    reviewed_by = $3,
                    reviewed_at = NOW(),
                    created_organization_id = $4,
                    updated_at = NOW()
                WHERE id = $1
            `,
            [req.params.id, normalizeOptionalText(req.body.adminNotes, 2000), req.admin.id, organizationResult.rows[0].id],
        );

        await client.query('COMMIT');
        return res.json({ success: true, organization: organizationResult.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Approve request error:', error);
        return res.status(400).json({ success: false, message: error.message || 'Failed to approve request' });
    } finally {
        client.release();
    }
}

async function rejectRequest({ req, res, tableName }) {
    const result = await db.query(
        `
            UPDATE ${tableName}
            SET status = 'rejected',
                admin_notes = $2,
                reviewed_by = $3,
                reviewed_at = NOW(),
                updated_at = NOW()
            WHERE id = $1 AND status = 'pending'
            RETURNING id
        `,
        [req.params.id, normalizeOptionalText(req.body.adminNotes, 2000), req.admin.id],
    );

    if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'Pending request not found' });
    }

    return res.json({ success: true, message: 'Request rejected successfully' });
}

app.post('/api/admin/association-requests/:id/approve', authenticateAdmin, async (req, res) =>
    approveRequest({ req, res, tableName: 'association_requests', requestNameColumn: 'association_name', organizationKind: 'association' }));
app.post('/api/admin/association-requests/:id/reject', authenticateAdmin, async (req, res) =>
    rejectRequest({ req, res, tableName: 'association_requests' }));
app.post('/api/admin/club-requests/:id/approve', authenticateAdmin, async (req, res) =>
    approveRequest({ req, res, tableName: 'club_requests', requestNameColumn: 'club_name', organizationKind: 'club' }));
app.post('/api/admin/club-requests/:id/reject', authenticateAdmin, async (req, res) =>
    rejectRequest({ req, res, tableName: 'club_requests' }));

app.get('/api/admin/queries', authenticateAdmin, async (req, res) => {
    const result = await db.query(
        `
            SELECT
                id,
                name,
                email,
                phone_number AS "phoneNumber",
                message,
                is_resolved AS "isResolved",
                resolved_at AS "resolvedAt",
                created_at AS "createdAt"
            FROM queries
            ORDER BY created_at DESC
        `,
    );
    return res.json({ success: true, queries: result.rows });
});

app.patch('/api/admin/queries/:id', authenticateAdmin, async (req, res) => {
    const result = await db.query(
        `
            UPDATE queries
            SET
                is_resolved = $2,
                resolved_by = CASE WHEN $2 THEN $3::uuid ELSE NULL END,
                resolved_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, is_resolved AS "isResolved", resolved_at AS "resolvedAt"
        `,
        [req.params.id, parseBoolean(req.body.isResolved), req.admin.id],
    );

    if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'Query not found' });
    }

    return res.json({ success: true, query: result.rows[0] });
});

app.post('/api/admin/organizations', authenticateAdmin, async (req, res) => {
    try {
        const kind = sanitizeOrganizationType(req.body.kind);
        const name = normalizeText(req.body.name, 120);
        const description = normalizeOptionalText(req.body.description, 2000);
        if (!kind || !name) {
            return res.status(400).json({ success: false, message: 'Organization kind and name are required' });
        }
        const result = await db.query('INSERT INTO organizations (kind, name, description, created_by, updated_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, kind, name, description, created_at AS "createdAt", updated_at AS "updatedAt", created_by AS "createdBy"', [kind, name, description, req.admin.id]);
        return res.status(201).json({ success: true, organization: result.rows[0] });
    } catch (error) {
        console.error('Create organization error:', error);
        return res.status(400).json({ success: false, message: error.code === '23505' ? 'That organization already exists' : 'Failed to create organization' });
    }
});

app.put('/api/admin/organizations/:id', authenticateAdmin, async (req, res) => {
    try {
        const kind = sanitizeOrganizationType(req.body.kind);
        const name = normalizeText(req.body.name, 120);
        const description = normalizeOptionalText(req.body.description, 2000);
        if (!kind || !name) {
            return res.status(400).json({ success: false, message: 'Organization kind and name are required' });
        }
        const result = await db.query('UPDATE organizations SET kind = $2, name = $3, description = $4, updated_at = NOW() WHERE id = $1 RETURNING id, kind, name, description, created_at AS "createdAt", updated_at AS "updatedAt", created_by AS "createdBy"', [req.params.id, kind, name, description]);
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }
        return res.json({ success: true, organization: result.rows[0] });
    } catch (error) {
        console.error('Update organization error:', error);
        return res.status(400).json({ success: false, message: error.code === '23505' ? 'That organization already exists' : 'Failed to update organization' });
    }
});

app.delete('/api/admin/organizations/:id', authenticateAdmin, async (req, res) => {
    const result = await db.query('DELETE FROM organizations WHERE id = $1', [req.params.id]);
    if (!result.rowCount) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    return res.json({ success: true, message: 'Organization deleted successfully' });
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err?.message?.includes('Invalid file type')) {
        return res.status(400).json({ success: false, message: err.message });
    }
    return next(err);
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

async function cleanupExpiredSnaps() {
    try {
        const result = await db.query('DELETE FROM snaps WHERE expires_at IS NOT NULL AND expires_at < NOW() RETURNING id');
        if (result.rows.length) {
            console.log(`Deleted ${result.rows.length} expired media snaps`);
        }
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

db.initDb().then(() => {
    setInterval(cleanupExpiredSnaps, 60 * 60 * 1000);
    cleanupExpiredSnaps();
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log('Postgres-backed feed, admin dashboard, and text posts are ready');
    });
}).catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

module.exports = { app };
