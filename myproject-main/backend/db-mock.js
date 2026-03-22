const bcrypt = require('bcrypt');

// Mock database using in-memory storage
let users = [];
let snaps = [];
let userIdCounter = 1;
let snapIdCounter = 1;

// Mock Pool class
class MockPool {
    constructor(config) {
        this.config = config;
        console.log('Mock database initialized (using in-memory storage)');
    }
    
    async query(text, params) {
        console.log('Mock query:', text, params);
        
        // Handle user queries
        if (text.includes('SELECT') && text.includes('users') && text.includes('username')) {
            const username = params[0];
            const user = users.find(u => u.username === username);
            if (user) {
                // Return user with password_hash field to match PostgreSQL schema
                return { rows: [{ ...user, password_hash: user.password }] };
            }
            return { rows: [] };
        }
        
        if (text.includes('INSERT') && text.includes('users')) {
            const { username, email, password } = params[0];
            const existingUser = users.find(u => u.username === username);
            if (existingUser) {
                throw new Error('Username already exists');
            }
            
            const newUser = {
                id: userIdCounter++,
                username,
                email,
                password_hash: password, // Store as password_hash to match PostgreSQL schema
                created_at: new Date()
            };
            users.push(newUser);
            // Return only id, username, email as per the query
            return { rows: [{ id: newUser.id, username: newUser.username, email: newUser.email }] };
        }
        
        // Handle snap queries
        if (text.includes('SELECT') && text.includes('snaps')) {
            const snapsWithUsers = snaps.map(snap => {
                const user = users.find(u => u.id === snap.user_id);
                return {
                    ...snap,
                    username: user ? user.username : 'unknown'
                };
            });
            return { rows: snapsWithUsers };
        }
        
        if (text.includes('INSERT') && text.includes('snaps')) {
            const { user_id, image_path, caption } = params[0];
            const newSnap = {
                id: snapIdCounter++,
                user_id,
                image_path,
                caption: caption || null,
                created_at: new Date()
            };
            snaps.push(newSnap);
            return { rows: [newSnap] };
        }
        
        // Handle snap with user join query
        if (text.includes('JOIN') && text.includes('users') && text.includes('snaps')) {
            const snapsWithUsers = snaps.map(snap => {
                const user = users.find(u => u.id === snap.user_id);
                return {
                    ...snap,
                    username: user ? user.username : 'unknown'
                };
            }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return { rows: snapsWithUsers };
        }
        
        return { rows: [] };
    }
    
    async end() {
        console.log('Mock database connection closed');
    }
}

// Mock authentication functions
const auth = {
    async createUser(username, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: userIdCounter++,
            username,
            password: hashedPassword,
            created_at: new Date()
        };
        users.push(newUser);
        return newUser;
    },
    
    async findUserByUsername(username) {
        return users.find(u => u.username === username);
    },
    
    async validateUser(username, password) {
        const user = users.find(u => u.username === username);
        if (!user) return null;
        
        const isValid = await bcrypt.compare(password, user.password);
        return isValid ? user : null;
    },
    
    async createSnap(userId, imagePath, caption) {
        const newSnap = {
            id: snapIdCounter++,
            user_id: userId,
            image_path: imagePath,
            caption: caption || null,
            created_at: new Date()
        };
        snaps.push(newSnap);
        return newSnap;
    },
    
    getAllSnaps() {
        return snaps.map(snap => {
            const user = users.find(u => u.id === snap.user_id);
            return {
                ...snap,
                username: user ? user.username : 'unknown'
            };
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
};

// Create and export mock pool
const pool = new MockPool();

// Initialize database (mock function)
const initDb = async () => {
    console.log('Mock database initialized successfully');
    return Promise.resolve();
};

// Get client (mock function)
const getClient = () => {
    return Promise.resolve({
        query: (text, params) => pool.query(text, params),
        release: () => console.log('Mock client released')
    });
};

// Get connection config (mock function)
const getConnectionConfig = () => ({
    user: 'mock_user',
    host: 'localhost',
    database: 'mock_db',
    password: 'mock_password',
    port: 5432
});

module.exports = {
    pool,
    auth,
    query: (text, params) => pool.query(text, params),
    getClient,
    getConnectionConfig,
    initDb,
    end: () => pool.end()
};
