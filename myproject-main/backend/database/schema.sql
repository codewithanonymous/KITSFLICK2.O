CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    profile_picture_url VARCHAR(512),
    bio TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    can_send_push_notifications BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    role VARCHAR(50) NOT NULL DEFAULT 'super_admin',
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kind VARCHAR(32) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT organizations_kind_check CHECK (kind IN ('club', 'association', 'department')),
    CONSTRAINT organizations_kind_name_unique UNIQUE (kind, name)
);

CREATE TABLE IF NOT EXISTS organization_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'member',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT organization_memberships_role_check CHECK (role IN ('owner', 'member')),
    CONSTRAINT organization_memberships_status_check CHECK (status IN ('active', 'inactive')),
    CONSTRAINT organization_memberships_user_org_unique UNIQUE (user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS association_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(32) NOT NULL,
    department_name VARCHAR(120) NOT NULL,
    association_name VARCHAR(120) NOT NULL,
    description TEXT,
    requester_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT association_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE TABLE IF NOT EXISTS club_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(32) NOT NULL,
    department_name VARCHAR(120) NOT NULL,
    club_name VARCHAR(120) NOT NULL,
    description TEXT,
    requester_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT club_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE TABLE IF NOT EXISTS queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(32) NOT NULL,
    message TEXT NOT NULL,
    requester_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS snaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    title VARCHAR(255),
    image_url VARCHAR(512),
    caption TEXT,
    location VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    view_count INTEGER NOT NULL DEFAULT 0,
    is_public BOOLEAN NOT NULL DEFAULT true,
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    post_type VARCHAR(20) NOT NULL DEFAULT 'media',
    author_type VARCHAR(20) NOT NULL DEFAULT 'user',
    image_data BYTEA,
    mime_type VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS hashtags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snap_id UUID NOT NULL REFERENCES snaps(id) ON DELETE CASCADE,
    hashtag VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(512);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_send_push_notifications BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'super_admin';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE snaps ADD COLUMN IF NOT EXISTS admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE snaps ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE snaps ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE snaps ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE snaps ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE snaps ADD COLUMN IF NOT EXISTS post_type VARCHAR(20) NOT NULL DEFAULT 'media';
ALTER TABLE snaps ADD COLUMN IF NOT EXISTS author_type VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE snaps ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE snaps ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE snaps ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE snaps ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE snaps ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE snaps ADD COLUMN IF NOT EXISTS image_data BYTEA;
ALTER TABLE snaps ADD COLUMN IF NOT EXISTS mime_type VARCHAR(50);
ALTER TABLE snaps ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE snaps ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE snaps ALTER COLUMN expires_at SET DEFAULT NULL;

ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS endpoint TEXT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS subscription JSONB;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE push_subscriptions
SET endpoint = COALESCE(endpoint, subscription->>'endpoint')
WHERE endpoint IS NULL;

DELETE FROM push_subscriptions a
USING push_subscriptions b
WHERE a.ctid < b.ctid
  AND a.endpoint IS NOT NULL
  AND a.endpoint = b.endpoint;

UPDATE snaps
SET author_type = 'user'
WHERE author_type IS NULL OR author_type = '';

UPDATE snaps
SET author_type = 'organization'
WHERE organization_id IS NOT NULL
  AND is_anonymous = false
  AND author_type = 'user';

UPDATE snaps
SET post_type = CASE
    WHEN image_data IS NOT NULL OR COALESCE(image_url, '') <> '' THEN 'media'
    ELSE 'text'
END
WHERE post_type IS NULL OR post_type = '';

UPDATE snaps
SET updated_at = created_at
WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_can_send_push_notifications ON users(can_send_push_notifications);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_kind ON organizations(kind);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_user_id ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_org_id ON organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_snaps_user_id ON snaps(user_id);
CREATE INDEX IF NOT EXISTS idx_snaps_admin_user_id ON snaps(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_snaps_organization_id ON snaps(organization_id);
CREATE INDEX IF NOT EXISTS idx_snaps_created_at ON snaps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_snaps_expires_at ON snaps(expires_at);
CREATE INDEX IF NOT EXISTS idx_snaps_post_type ON snaps(post_type);
CREATE INDEX IF NOT EXISTS idx_snaps_author_type ON snaps(author_type);
CREATE INDEX IF NOT EXISTS idx_hashtags_snap_id ON hashtags(snap_id);
CREATE INDEX IF NOT EXISTS idx_hashtags_hashtag ON hashtags(hashtag);
CREATE INDEX IF NOT EXISTS idx_association_requests_status ON association_requests(status);
CREATE INDEX IF NOT EXISTS idx_club_requests_status ON club_requests(status);
CREATE INDEX IF NOT EXISTS idx_queries_is_resolved ON queries(is_resolved);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
