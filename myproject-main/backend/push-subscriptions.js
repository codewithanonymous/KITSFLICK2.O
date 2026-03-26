const db = require('./db-pg');

async function upsertPushSubscription({ userId, subscription }) {
    const endpoint = String(subscription?.endpoint || '').trim();
    if (!endpoint) {
        throw new Error('A valid push subscription endpoint is required');
    }

    const result = await db.query(
        `
            INSERT INTO push_subscriptions (
                user_id,
                endpoint,
                subscription,
                updated_at
            ) VALUES ($1, $2, $3::jsonb, NOW())
            ON CONFLICT (endpoint)
            DO UPDATE SET
                user_id = EXCLUDED.user_id,
                subscription = EXCLUDED.subscription,
                updated_at = NOW()
            RETURNING
                id,
                user_id AS "userId",
                endpoint,
                subscription,
                created_at AS "createdAt",
                updated_at AS "updatedAt"
        `,
        [userId, endpoint, JSON.stringify(subscription)],
    );

    return result.rows[0];
}

async function listPushSubscriptions() {
    const result = await db.query(
        `
            SELECT
                id,
                user_id AS "userId",
                endpoint,
                subscription
            FROM push_subscriptions
            WHERE endpoint IS NOT NULL
              AND subscription IS NOT NULL
        `,
    );

    return result.rows;
}

async function listPushSubscriptionsForApprovedUsers() {
    const result = await db.query(
        `
            SELECT
                ps.id,
                ps.user_id AS "userId",
                ps.endpoint,
                ps.subscription
            FROM push_subscriptions ps
            JOIN users u ON u.id = ps.user_id
            WHERE ps.endpoint IS NOT NULL
              AND ps.subscription IS NOT NULL
              AND u.is_active = true
              AND u.can_send_push_notifications = true
        `,
    );

    return result.rows;
}

async function deletePushSubscriptionByEndpoint(endpoint) {
    const normalizedEndpoint = String(endpoint || '').trim();
    if (!normalizedEndpoint) {
        return 0;
    }

    const result = await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [normalizedEndpoint]);
    return result.rowCount;
}

module.exports = {
    deletePushSubscriptionByEndpoint,
    listPushSubscriptions,
    listPushSubscriptionsForApprovedUsers,
    upsertPushSubscription,
};
