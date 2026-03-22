const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db-pg');

const USER_MEDIA_TTL_MS = 24 * 60 * 60 * 1000;
const POST_TYPES = new Set(['media', 'text', 'notice']);
const ORG_TYPES = new Set(['club', 'association', 'department']);
const AUTHOR_TYPES = new Set(['user', 'admin', 'organization']);

function normalizeText(value, maxLength = 5000) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().slice(0, maxLength);
}

function normalizeOptionalText(value, maxLength = 5000) {
    const normalized = normalizeText(value, maxLength);
    return normalized || null;
}

function parseBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }

    return false;
}

function parseUuid(value) {
    const normalized = normalizeText(value, 64);
    return normalized || null;
}

function parseHashtags(rawHashtags) {
    if (!rawHashtags || typeof rawHashtags !== 'string') {
        return [];
    }

    return [...new Set(
        rawHashtags
            .split(/[\s,#]+/)
            .map((tag) => tag.trim().replace(/^#/, '').toLowerCase())
            .filter(Boolean),
    )];
}

function sanitizePostType(value, fallback = 'text') {
    const normalized = normalizeText(value, 20).toLowerCase();
    return POST_TYPES.has(normalized) ? normalized : fallback;
}

function sanitizeAuthorType(value, fallback = 'user') {
    const normalized = normalizeText(value, 20).toLowerCase();
    return AUTHOR_TYPES.has(normalized) ? normalized : fallback;
}

function sanitizeOrganizationType(value) {
    const normalized = normalizeText(value, 32).toLowerCase();
    return ORG_TYPES.has(normalized) ? normalized : null;
}

function validatePostPayload({ postType, title, caption, file, imageUrl, authorType }) {
    if (postType === 'notice' && authorType !== 'admin') {
        throw new Error('Only admins can publish notices');
    }

    const hasText = Boolean(title || caption);
    const hasMedia = Boolean(file || imageUrl);

    if (!hasText && !hasMedia) {
        throw new Error('Provide text content or media for the post');
    }

    if (postType === 'media' && !hasMedia) {
        throw new Error('Media posts require an uploaded image or media reference');
    }
}

async function fetchPosts({ limit = 20, offset = 0, includeExpired = false }) {
    const result = await db.query(
        `
            SELECT
                s.id,
                COALESCE(NULLIF(s.image_url, ''), CASE WHEN s.image_data IS NOT NULL THEN '/api/snaps/image/' || s.id ELSE NULL END) AS "imageUrl",
                s.title,
                s.caption,
                s.location,
                s.created_at AS "createdAt",
                s.updated_at AS "updatedAt",
                s.expires_at AS "expiresAt",
                s.post_type AS "postType",
                s.author_type AS "authorType",
                s.is_anonymous AS "isAnonymous",
                s.view_count AS "viewCount",
                s.organization_id AS "organizationId",
                o.name AS "organizationName",
                o.kind AS "organizationKind",
                CASE
                    WHEN s.is_anonymous THEN 'Anonymous'
                    WHEN s.author_type = 'organization' THEN o.name
                    WHEN s.author_type = 'admin' THEN au.username
                    ELSE u.username
                END AS username,
                CASE
                    WHEN s.author_type = 'organization' THEN o.id
                    WHEN s.author_type = 'admin' THEN au.id
                    ELSE u.id
                END AS "postedBy",
                COALESCE(array_remove(array_agg(h.hashtag ORDER BY h.created_at), NULL), '{}') AS hashtags
            FROM snaps s
            LEFT JOIN users u ON u.id = s.user_id
            LEFT JOIN admin_users au ON au.id = s.admin_user_id
            LEFT JOIN organizations o ON o.id = s.organization_id
            LEFT JOIN hashtags h ON h.snap_id = s.id
            WHERE (
                $3::boolean
                OR s.expires_at IS NULL
                OR s.expires_at > NOW()
                OR s.post_type IN ('text', 'notice')
            )
            GROUP BY s.id, u.id, au.id, o.id
            ORDER BY s.created_at DESC
            LIMIT $1 OFFSET $2
        `,
        [limit, offset, includeExpired],
    );

    return result.rows.map((row) => ({ ...row, hashtags: row.hashtags || [] }));
}

async function fetchPostById(id, client = db) {
    const result = await client.query(
        `
            SELECT
                s.id,
                COALESCE(NULLIF(s.image_url, ''), CASE WHEN s.image_data IS NOT NULL THEN '/api/snaps/image/' || s.id ELSE NULL END) AS "imageUrl",
                s.title,
                s.caption,
                s.location,
                s.created_at AS "createdAt",
                s.updated_at AS "updatedAt",
                s.expires_at AS "expiresAt",
                s.post_type AS "postType",
                s.author_type AS "authorType",
                s.is_anonymous AS "isAnonymous",
                s.view_count AS "viewCount",
                s.organization_id AS "organizationId",
                o.name AS "organizationName",
                o.kind AS "organizationKind",
                CASE
                    WHEN s.is_anonymous THEN 'Anonymous'
                    WHEN s.author_type = 'organization' THEN o.name
                    WHEN s.author_type = 'admin' THEN au.username
                    ELSE u.username
                END AS username,
                CASE
                    WHEN s.author_type = 'organization' THEN o.id
                    WHEN s.author_type = 'admin' THEN au.id
                    ELSE u.id
                END AS "postedBy",
                COALESCE(array_remove(array_agg(h.hashtag ORDER BY h.created_at), NULL), '{}') AS hashtags
            FROM snaps s
            LEFT JOIN users u ON u.id = s.user_id
            LEFT JOIN admin_users au ON au.id = s.admin_user_id
            LEFT JOIN organizations o ON o.id = s.organization_id
            LEFT JOIN hashtags h ON h.snap_id = s.id
            WHERE s.id = $1
            GROUP BY s.id, u.id, au.id, o.id
        `,
        [id],
    );

    return result.rows.length ? { ...result.rows[0], hashtags: result.rows[0].hashtags || [] } : null;
}

async function createPost({
    client,
    authorType,
    userId = null,
    adminUserId = null,
    title,
    caption,
    location,
    hashtags,
    organizationId,
    postType,
    authorTypeOverride,
    isAnonymous,
    file,
    imageUrl,
}) {
    const normalizedTitle = normalizeOptionalText(title, 255);
    const normalizedCaption = normalizeOptionalText(caption, 6000);
    const normalizedLocation = normalizeOptionalText(location, 255);
    const normalizedImageUrl = normalizeOptionalText(imageUrl, 512);
    const normalizedPostType = sanitizePostType(postType, file || normalizedImageUrl ? 'media' : 'text');
    const normalizedOrganizationId = parseUuid(organizationId);
    const normalizedAnonymous = parseBoolean(isAnonymous);
    const normalizedAuthorType = normalizedAnonymous
        ? 'user'
        : sanitizeAuthorType(authorTypeOverride, normalizedOrganizationId ? 'organization' : authorType);

    validatePostPayload({
        postType: normalizedPostType,
        title: normalizedTitle,
        caption: normalizedCaption,
        file,
        imageUrl: normalizedImageUrl,
        authorType,
    });

    if (normalizedAuthorType === 'organization') {
        if (!normalizedOrganizationId) {
            throw new Error('Choose an association or club identity to post as an organization');
        }

        const membershipResult = await client.query(
            `
                SELECT o.id, o.kind, o.name
                FROM organization_memberships om
                JOIN organizations o ON o.id = om.organization_id
                WHERE om.user_id = $1
                  AND om.organization_id = $2
                  AND om.status = 'active'
                LIMIT 1
            `,
            [userId, normalizedOrganizationId],
        );

        if (!membershipResult.rows.length) {
            throw new Error('You can only post as an association or club you belong to');
        }
    }

    const postId = uuidv4();
    const imageData = file ? fs.readFileSync(file.path) : null;
    const mimeType = file ? file.mimetype : null;
    const resolvedImageUrl = file ? `/api/snaps/image/${postId}` : normalizedImageUrl;
    const expiresAt = authorType === 'user' && normalizedPostType === 'media'
        ? new Date(Date.now() + USER_MEDIA_TTL_MS)
        : null;

    const insertResult = await client.query(
        `
            INSERT INTO snaps (
                id,
                user_id,
                admin_user_id,
                organization_id,
                title,
                caption,
                location,
                image_url,
                image_data,
                mime_type,
                expires_at,
                post_type,
                author_type,
                is_anonymous,
                updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()
            )
            RETURNING id
        `,
        [
            postId,
            userId,
            adminUserId,
            normalizedOrganizationId,
            normalizedTitle,
            normalizedCaption,
            normalizedLocation,
            resolvedImageUrl,
            imageData,
            mimeType,
            expiresAt,
            normalizedPostType,
            normalizedAuthorType,
            normalizedAnonymous,
        ],
    );

    for (const hashtag of parseHashtags(hashtags)) {
        await client.query('INSERT INTO hashtags (snap_id, hashtag) VALUES ($1, $2)', [
            insertResult.rows[0].id,
            hashtag,
        ]);
    }

    return fetchPostById(insertResult.rows[0].id, client);
}

async function updatePost({
    client,
    id,
    title,
    caption,
    location,
    hashtags,
    organizationId,
    postType,
    isAnonymous,
    imageUrl,
    removeMedia,
    file,
}) {
    const existingResult = await client.query('SELECT * FROM snaps WHERE id = $1', [id]);
    if (!existingResult.rows.length) {
        return null;
    }

    const existing = existingResult.rows[0];
    const nextPostType = sanitizePostType(postType, existing.post_type || 'text');
    const nextTitle = title === undefined ? existing.title : normalizeOptionalText(title, 255);
    const nextCaption = caption === undefined ? existing.caption : normalizeOptionalText(caption, 6000);
    const nextLocation = location === undefined ? existing.location : normalizeOptionalText(location, 255);
    const nextOrganizationId = organizationId === undefined ? existing.organization_id : parseUuid(organizationId);
    const nextAnonymous = isAnonymous === undefined ? existing.is_anonymous : parseBoolean(isAnonymous);

    let nextImageData = existing.image_data;
    let nextMimeType = existing.mime_type;
    let nextImageUrl = imageUrl === undefined ? existing.image_url : normalizeOptionalText(imageUrl, 512);

    if (file) {
        nextImageData = fs.readFileSync(file.path);
        nextMimeType = file.mimetype;
        nextImageUrl = `/api/snaps/image/${id}`;
    } else if (parseBoolean(removeMedia) || nextPostType !== 'media') {
        nextImageData = null;
        nextMimeType = null;
        if (imageUrl !== undefined || parseBoolean(removeMedia) || nextPostType !== 'media') {
            nextImageUrl = null;
        }
    }

    validatePostPayload({
        postType: nextPostType,
        title: nextTitle,
        caption: nextCaption,
        file: nextImageData || nextImageUrl,
        imageUrl: nextImageUrl,
        authorType: existing.author_type,
    });

    const nextExpiresAt = existing.author_type === 'user' && nextPostType === 'media'
        ? (existing.expires_at || new Date(Date.now() + USER_MEDIA_TTL_MS))
        : null;

    await client.query(
        `
            UPDATE snaps
            SET
                title = $2,
                caption = $3,
                location = $4,
                organization_id = $5,
                post_type = $6,
                is_anonymous = $7,
                image_url = $8,
                image_data = $9,
                mime_type = $10,
                expires_at = $11,
                updated_at = NOW()
            WHERE id = $1
        `,
        [id, nextTitle, nextCaption, nextLocation, nextOrganizationId, nextPostType, nextAnonymous, nextImageUrl, nextImageData, nextMimeType, nextExpiresAt],
    );

    if (hashtags !== undefined) {
        await client.query('DELETE FROM hashtags WHERE snap_id = $1', [id]);
        for (const hashtag of parseHashtags(hashtags)) {
            await client.query('INSERT INTO hashtags (snap_id, hashtag) VALUES ($1, $2)', [id, hashtag]);
        }
    }

    return fetchPostById(id, client);
}

async function fetchOrganizations() {
    const result = await db.query(
        `
            SELECT
                o.id,
                o.kind,
                o.name,
                o.description,
                o.created_at AS "createdAt",
                o.updated_at AS "updatedAt",
                o.created_by AS "createdBy",
                au.username AS "createdByName"
            FROM organizations o
            LEFT JOIN admin_users au ON au.id = o.created_by
            ORDER BY o.kind, o.name
        `,
    );

    return result.rows;
}

async function fetchUserOrganizations(userId) {
    const result = await db.query(
        `
            SELECT
                o.id,
                o.kind,
                o.name,
                o.description,
                om.role,
                om.status
            FROM organization_memberships om
            JOIN organizations o ON o.id = om.organization_id
            WHERE om.user_id = $1
              AND om.status = 'active'
            ORDER BY o.kind, o.name
        `,
        [userId],
    );

    return result.rows;
}

module.exports = {
    fetchOrganizations,
    fetchPostById,
    fetchPosts,
    fetchUserOrganizations,
    createPost,
    normalizeOptionalText,
    normalizeText,
    parseBoolean,
    parseHashtags,
    parseUuid,
    sanitizeAuthorType,
    sanitizeOrganizationType,
    updatePost,
};
