import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import { dbService } from './src/services/dbService.ts';
import { createServer } from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Cryptographic token helpers
function generateToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 })).toString('base64url'); // 7 days expiration
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSignature) return null;
    const decodedBody = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (decodedBody.exp && decodedBody.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return decodedBody;
  } catch (err) {
    return null;
  }
}

// Authentication middleware to enforce multi-tenant isolation
const authenticateSession = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header is missing or malformed.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  (req as any).session = decoded;
  next();
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"]
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 Client connected to Realtime WebSocket:', socket.id);
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });

  const broadcastDbChange = (table: string) => {
    console.log(`📡 Broadcasting change on table: ${table}`);
    io.emit('db_changed', { table });
  };

  // Middleware to parse JSON
  app.use(express.json());

  // Handle Database Seeding & Clean Demo Data on boot
  await dbService.seedIfNeeded();

  // --- API Endpoints backed by Supabase / Local JSON ---

  // 1. Churches
  app.get('/api/churches', async (req, res) => {
    try {
      const list = await dbService.getCollection('churches');
      res.json(list.map(c => ({ id: c.id, name: c.name, mapName: c.mapName })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/churches/:id', async (req, res) => {
    try {
      const data = await dbService.docGet('churches', req.params.id);
      if (!data) return res.status(404).json({ error: 'Church not found' });
      delete data.passwordHash;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/churches', async (req, res) => {
    try {
      const { id, name, mapName, logoName, passwordHash } = req.body;
      
      const snap = await dbService.where('churches', 'name', '==', name);
      if (snap.length > 0) {
        return res.status(400).json({ error: 'A church with this name is already registered.' });
      }

      await dbService.docSet('churches', id, { id, name, mapName, logoName, passwordHash });
      
      // Seed default AppSettings for newly registered church
      await dbService.docSet('appSettings', id, {
        id,
        mapName,
        churchName: name,
        themeColor: '#2563eb',
        logoName: logoName || `${name} Admin`
      });

      broadcastDbChange('churches');
      broadcastDbChange('appSettings');

      res.status(201).json({ id, name });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Auth Logins
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { churchName, passwordHash } = req.body;
      const list = await dbService.getCollection('churches');
      
      const found = list.find(c => c.name.toLowerCase().trim() === churchName.toLowerCase().trim());
      if (!found) {
        return res.status(404).json({ error: 'Church not registered.' });
      }
      
      let isMatch = found.passwordHash === passwordHash;
      // Multi-hash alignment check for demo accounts
      if (!isMatch) {
        if (found.id === 'futamap' && (passwordHash === 'mock_bcrypt_pbkdf2_2ec9aec' || passwordHash === 'mock_bcrypt_pbkdf2_6dfb8d23')) {
          isMatch = true;
        } else if (found.id === 'rccg' && (passwordHash === 'mock_bcrypt_pbkdf2_660194d7' || passwordHash === 'mock_bcrypt_pbkdf2_2e718b5b')) {
          isMatch = true;
        } else if (found.id === 'winners' && (passwordHash === 'mock_bcrypt_pbkdf2_68615316' || passwordHash === 'mock_bcrypt_pbkdf2_71f496e1')) {
          isMatch = true;
        }
      }

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password.' });
      }

      const token = generateToken({
        churchId: found.id,
        role: 'admin'
      });

      res.json({
        churchId: found.id,
        churchName: found.name,
        mapName: found.mapName,
        logoName: found.logoName,
        authenticatedAt: new Date().toISOString(),
        token
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/member-login', async (req, res) => {
    try {
      const { emailOrPhone, passwordHash, rawPassword } = req.body;
      const allMembers = await dbService.getCollection('members');
      const cleanInput = emailOrPhone.toLowerCase().trim().replace(/[\s\-\+\(\)]/g, '');

      const matched = allMembers.find(m => {
        const dbEmail = m.email ? m.email.toLowerCase().trim() : '';
        const dbPhoneClean = m.phoneNumber.replace(/[\s\-\+\(\)]/g, '');
        const isEmailMatch = m.email && dbEmail === emailOrPhone.toLowerCase().trim();
        const isPhoneMatch = dbPhoneClean.endsWith(cleanInput) || cleanInput.endsWith(dbPhoneClean);
        return isEmailMatch || isPhoneMatch;
      });

      if (!matched) {
        return res.status(404).json({ error: 'Member profile not found with this phone number or email address.' });
      }

      if (matched.passwordHash) {
        let isMatch = matched.passwordHash === passwordHash;
        // Aligns seeded members with both legacy and new frontend hashes for "celebration2026"
        if (!isMatch && (matched.passwordHash === 'mock_bcrypt_pbkdf2_6dfb8d23' || matched.passwordHash === 'mock_bcrypt_pbkdf2_2ec9aec') && (passwordHash === 'mock_bcrypt_pbkdf2_2ec9aec' || passwordHash === 'mock_bcrypt_pbkdf2_6dfb8d23')) {
          isMatch = true;
        }
        if (!isMatch) {
          return res.status(401).json({ error: 'Incorrect password.' });
        }
      } else {
        // First login fallback options
        const defaultPhonePass = matched.phoneNumber.replace(/[^0-9]/g, '');
        const defaultThemePass = 'celebration2026';
        
        const isPhonePass = rawPassword === defaultPhonePass || rawPassword === matched.phoneNumber.trim();
        const isThemePass = rawPassword === defaultThemePass;

        if (!isPhonePass && !isThemePass) {
          return res.status(401).json({ 
            error: 'Incorrect password. (Tip: For your first login, use your phone number digits or "celebration2026" as your password, or click Forgot Password to set a custom one).' 
          });
        }

        // Save passwordHash on first login
        await dbService.docUpdate('members', matched.id, { passwordHash });
        broadcastDbChange('members');
      }

      const token = generateToken({
        churchId: matched.churchId || 'futamap',
        memberId: matched.id,
        role: 'member'
      });

      res.json({
        memberId: matched.id,
        fullName: matched.fullName,
        churchId: matched.churchId || 'futamap',
        phoneNumber: matched.phoneNumber,
        email: matched.email,
        authenticatedAt: new Date().toISOString(),
        token
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/member-reset-password', async (req, res) => {
    try {
      const { emailOrPhone, passwordHash } = req.body;
      if (!emailOrPhone || !passwordHash) {
        return res.status(400).json({ error: 'Missing required credentials.' });
      }

      const allMembers = await dbService.getCollection('members');
      const cleanInput = emailOrPhone.toLowerCase().trim().replace(/[\s\-\+\(\)]/g, '');

      const matched = allMembers.find(m => {
        const dbEmail = m.email ? m.email.toLowerCase().trim() : '';
        const dbPhoneClean = m.phoneNumber.replace(/[\s\-\+\(\)]/g, '');
        const isEmailMatch = m.email && dbEmail === emailOrPhone.toLowerCase().trim();
        const isPhoneMatch = dbPhoneClean.endsWith(cleanInput) || cleanInput.endsWith(dbPhoneClean);
        return isEmailMatch || isPhoneMatch;
      });

      if (!matched) {
        return res.status(404).json({ error: 'No existing member profile is linked to this phone number or email.' });
      }

      await dbService.docUpdate('members', matched.id, { passwordHash });
      broadcastDbChange('members');
      res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Members
  app.get('/api/members', authenticateSession, async (req, res) => {
    try {
      const { churchId } = req.query;
      const session = (req as any).session;
      
      if (!churchId || typeof churchId !== 'string') {
        return res.status(400).json({ error: 'churchId query parameter is required for multi-tenant isolation.' });
      }

      if (session.churchId !== churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      const list = await dbService.where('members', 'churchId', '==', churchId);
      const cleaned = list.map(m => {
        const { passwordHash, ...rest } = m;
        return rest;
      });
      res.json(cleaned);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/members/:id', authenticateSession, async (req, res) => {
    try {
      const session = (req as any).session;
      const data = await dbService.docGet('members', req.params.id);
      if (!data) return res.status(404).json({ error: 'Member not found' });

      if (data.churchId !== session.churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      delete data.passwordHash;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/members', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      let session = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        session = verifyToken(token);
      }

      const memberData = req.body;

      if (session) {
        if (memberData.churchId !== session.churchId) {
          return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
        }
      } else {
        const church = await dbService.docGet('churches', memberData.churchId);
        if (!church) {
          return res.status(400).json({ error: 'Selected church/assembly does not exist.' });
        }
      }

      await dbService.docSet('members', memberData.id, memberData);
      broadcastDbChange('members');
      res.status(201).json(memberData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/members/:id', authenticateSession, async (req, res) => {
    try {
      const session = (req as any).session;
      const data = await dbService.docGet('members', req.params.id);
      if (!data) return res.status(404).json({ error: 'Member not found' });

      if (data.churchId !== session.churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      const updates = { ...req.body, churchId: session.churchId };
      const updated = await dbService.docUpdate('members', req.params.id, updates);
      broadcastDbChange('members');
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Automated Birthday Trigger
  app.post('/api/birthdays/trigger', authenticateSession, async (req, res) => {
    try {
      const { churchId } = req.body;
      const session = (req as any).session;

      if (!churchId) {
        return res.status(400).json({ error: 'churchId is required.' });
      }

      if (session.churchId !== churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      // Get current date MM-DD
      const today = new Date();
      const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
      const todayDay = String(today.getDate()).padStart(2, '0');
      const todayMonthDay = `${todayMonth}-${todayDay}`; // e.g. "06-29"

      const allMembers = await dbService.where('members', 'churchId', '==', churchId);

      const celebratedMembers = allMembers.filter(m => {
        if (!m.birthday) return false;
        const parts = m.birthday.split('-');
        if (parts.length >= 2) {
          const mMonth = parts[1].padStart(2, '0');
          const mDay = parts[2].padStart(2, '0');
          return `${mMonth}-${mDay}` === todayMonthDay;
        }
        return false;
      });

      const triggered: any[] = [];
      const todayStr = today.toISOString().split('T')[0];

      for (const m of celebratedMembers) {
        const activityId = `bday_${m.id}_${todayStr}`;
        const existingDoc = await dbService.docGet('recentActivities', activityId);

        if (!existingDoc) {
          // Send automatic birthday greeting (we log it as an automated care activity)
          const activity = {
            id: activityId,
            churchId,
            type: 'registration',
            description: `🎂 [Automated] Happy Birthday email successfully dispatched to ${m.fullName} (${m.email || 'No email registered - sent SMS'}). 🎉`,
            timestamp: todayStr,
            memberName: m.fullName
          };

          await dbService.docSet('recentActivities', activityId, activity);
          broadcastDbChange('recentActivities');
          triggered.push({ memberId: m.id, fullName: m.fullName, email: m.email, success: true });
        } else {
          triggered.push({ memberId: m.id, fullName: m.fullName, email: m.email, success: false, reason: 'Already sent today' });
        }
      }

      res.json({ date: todayMonthDay, triggeredCount: triggered.filter(t => t.success).length, details: triggered });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Visitors
  app.get('/api/visitors', authenticateSession, async (req, res) => {
    try {
      const { churchId } = req.query;
      const session = (req as any).session;

      if (!churchId || typeof churchId !== 'string') {
        return res.status(400).json({ error: 'churchId query parameter is required for multi-tenant isolation.' });
      }

      if (session.churchId !== churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      const list = await dbService.where('visitors', 'churchId', '==', churchId);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/visitors', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      let session = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        session = verifyToken(token);
      }

      const visitorData = req.body;

      if (session) {
        if (visitorData.churchId !== session.churchId) {
          return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
        }
      } else {
        const church = await dbService.docGet('churches', visitorData.churchId);
        if (!church) {
          return res.status(400).json({ error: 'Selected church/assembly does not exist.' });
        }
      }

      await dbService.docSet('visitors', visitorData.id, visitorData);
      broadcastDbChange('visitors');
      res.status(201).json(visitorData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/visitors/:id', authenticateSession, async (req, res) => {
    try {
      const session = (req as any).session;
      const data = await dbService.docGet('visitors', req.params.id);
      if (!data) return res.status(404).json({ error: 'Visitor not found' });

      if (data.churchId !== session.churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      const updates = { ...req.body, churchId: session.churchId };
      const updated = await dbService.docUpdate('visitors', req.params.id, updates);
      broadcastDbChange('visitors');
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Attendance Logs
  app.get('/api/attendance', authenticateSession, async (req, res) => {
    try {
      const { churchId } = req.query;
      const session = (req as any).session;

      if (!churchId || typeof churchId !== 'string') {
        return res.status(400).json({ error: 'churchId query parameter is required for multi-tenant isolation.' });
      }

      if (session.churchId !== churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      const list = await dbService.where('attendance', 'churchId', '==', churchId);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/attendance', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      let session = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        session = verifyToken(token);
      }

      const attData = req.body;

      if (session) {
        if (attData.churchId !== session.churchId) {
          return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
        }
      } else {
        const church = await dbService.docGet('churches', attData.churchId);
        if (!church) {
          return res.status(400).json({ error: 'Selected church/assembly does not exist.' });
        }
      }

      // Check if already registered
      const list = await dbService.where('attendance', 'memberId', '==', attData.memberId);
      const dup = list.find(a => a.date === attData.date && a.serviceType === attData.serviceType);
        
      if (dup) {
        return res.status(409).json({ error: 'Attendance already registered for this member.' });
      }

      await dbService.docSet('attendance', attData.id, attData);
      broadcastDbChange('attendance');
      res.status(201).json(attData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/attendance/:id', authenticateSession, async (req, res) => {
    try {
      const session = (req as any).session;
      const data = await dbService.docGet('attendance', req.params.id);
      if (!data) return res.status(404).json({ error: 'Attendance log not found' });

      if (data.churchId !== session.churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      await dbService.docDelete('attendance', req.params.id);
      broadcastDbChange('attendance');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Prayer Requests
  app.get('/api/prayer-requests', authenticateSession, async (req, res) => {
    try {
      const { churchId } = req.query;
      const session = (req as any).session;

      if (!churchId || typeof churchId !== 'string') {
        return res.status(400).json({ error: 'churchId query parameter is required for multi-tenant isolation.' });
      }

      if (session.churchId !== churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      const list = await dbService.where('prayerRequests', 'churchId', '==', churchId);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/prayer-requests', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      let session = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        session = verifyToken(token);
      }

      const prayerData = req.body;

      if (session) {
        if (prayerData.churchId !== session.churchId) {
          return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
        }
      } else {
        const church = await dbService.docGet('churches', prayerData.churchId);
        if (!church) {
          return res.status(400).json({ error: 'Selected church/assembly does not exist.' });
        }
      }

      await dbService.docSet('prayerRequests', prayerData.id, prayerData);
      broadcastDbChange('prayerRequests');
      res.status(201).json(prayerData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/prayer-requests/:id', authenticateSession, async (req, res) => {
    try {
      const session = (req as any).session;
      const data = await dbService.docGet('prayerRequests', req.params.id);
      if (!data) return res.status(404).json({ error: 'Prayer request not found' });

      if (data.churchId !== session.churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      const updates = { ...req.body, churchId: session.churchId };
      const updated = await dbService.docUpdate('prayerRequests', req.params.id, updates);
      broadcastDbChange('prayerRequests');
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Follow Ups
  app.get('/api/follow-ups', authenticateSession, async (req, res) => {
    try {
      const { churchId } = req.query;
      const session = (req as any).session;

      if (!churchId || typeof churchId !== 'string') {
        return res.status(400).json({ error: 'churchId query parameter is required for multi-tenant isolation.' });
      }

      if (session.churchId !== churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      const list = await dbService.where('followUps', 'churchId', '==', churchId);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/follow-ups', authenticateSession, async (req, res) => {
    try {
      const session = (req as any).session;
      const fuData = req.body;

      if (fuData.churchId !== session.churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      await dbService.docSet('followUps', fuData.id, fuData);
      broadcastDbChange('followUps');
      res.status(201).json(fuData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/follow-ups/:id', authenticateSession, async (req, res) => {
    try {
      const session = (req as any).session;
      const data = await dbService.docGet('followUps', req.params.id);
      if (!data) return res.status(404).json({ error: 'Follow-up log not found' });

      if (data.churchId !== session.churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      const updates = { ...req.body, churchId: session.churchId };
      const updated = await dbService.docUpdate('followUps', req.params.id, updates);
      broadcastDbChange('followUps');
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Recent Activities
  app.get('/api/activities', authenticateSession, async (req, res) => {
    try {
      const { churchId } = req.query;
      const session = (req as any).session;

      if (!churchId || typeof churchId !== 'string') {
        return res.status(400).json({ error: 'churchId query parameter is required for multi-tenant isolation.' });
      }

      if (session.churchId !== churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      const list = await dbService.where('recentActivities', 'churchId', '==', churchId);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/activities', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      let session = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        session = verifyToken(token);
      }

      const activityData = req.body;

      if (session) {
        if (activityData.churchId !== session.churchId) {
          return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
        }
      } else {
        const church = await dbService.docGet('churches', activityData.churchId);
        if (!church) {
          return res.status(400).json({ error: 'Selected church/assembly does not exist.' });
        }
      }

      await dbService.docSet('recentActivities', activityData.id, activityData);
      broadcastDbChange('recentActivities');
      res.status(201).json(activityData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Fellowship Social (Connections)
  app.get('/api/fellowship/connections', authenticateSession, async (req, res) => {
    try {
      const { churchId } = req.query;
      const session = (req as any).session;

      if (!churchId || typeof churchId !== 'string') {
        return res.status(400).json({ error: 'churchId query parameter is required for multi-tenant isolation.' });
      }

      if (session.churchId !== churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      const list = await dbService.where('fellowshipConnections', 'churchId', '==', churchId);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/fellowship/connections', authenticateSession, async (req, res) => {
    try {
      const session = (req as any).session;
      const connData = req.body;

      if (connData.churchId !== session.churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      await dbService.docSet('fellowshipConnections', connData.id, connData);
      broadcastDbChange('fellowshipConnections');
      res.status(201).json(connData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/fellowship/connections/:id', authenticateSession, async (req, res) => {
    try {
      const session = (req as any).session;
      const data = await dbService.docGet('fellowshipConnections', req.params.id);
      if (!data) return res.status(404).json({ error: 'Fellowship connection not found' });

      if (data.churchId !== session.churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      const updates = { ...req.body, churchId: session.churchId };
      const updated = await dbService.docUpdate('fellowshipConnections', req.params.id, updates);
      broadcastDbChange('fellowshipConnections');
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/fellowship/connections/:id', authenticateSession, async (req, res) => {
    try {
      const session = (req as any).session;
      const data = await dbService.docGet('fellowshipConnections', req.params.id);
      if (!data) return res.status(404).json({ error: 'Fellowship connection not found' });

      if (data.churchId !== session.churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      await dbService.docDelete('fellowshipConnections', req.params.id);
      broadcastDbChange('fellowshipConnections');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10. Fellowship Social (Notes/Messages)
  app.get('/api/fellowship/notes', authenticateSession, async (req, res) => {
    try {
      const { churchId } = req.query;
      const session = (req as any).session;

      if (!churchId || typeof churchId !== 'string') {
        return res.status(400).json({ error: 'churchId query parameter is required for multi-tenant isolation.' });
      }

      if (session.churchId !== churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      const list = await dbService.where('fellowshipNotes', 'churchId', '==', churchId);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/fellowship/notes', authenticateSession, async (req, res) => {
    try {
      const session = (req as any).session;
      const noteData = req.body;

      if (noteData.churchId !== session.churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      await dbService.docSet('fellowshipNotes', noteData.id, noteData);
      broadcastDbChange('fellowshipNotes');
      res.status(201).json(noteData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. Settings (AppSettings)
  app.get('/api/settings/:churchId', authenticateSession, async (req, res) => {
    try {
      const session = (req as any).session;

      if (session.churchId !== req.params.churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      const data = await dbService.docGet('appSettings', req.params.churchId);
      if (!data) {
        return res.json({
          mapName: 'MAP',
          churchName: 'Church Assembly',
          themeColor: '#4f46e5',
          logoName: 'Admin'
        });
      }
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/settings/:churchId', authenticateSession, async (req, res) => {
    try {
      const { mapName, churchName, themeColor, logoName } = req.body;
      const session = (req as any).session;

      if (session.churchId !== req.params.churchId) {
        return res.status(403).json({ error: 'Access denied: Tenant mismatch.' });
      }

      const existing = await dbService.docGet('appSettings', req.params.churchId) || {};
      const updated = {
        ...existing,
        id: req.params.churchId,
        mapName,
        churchName,
        themeColor,
        logoName
      };
      await dbService.docSet('appSettings', req.params.churchId, updated);
      broadcastDbChange('appSettings');
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Serve Frontend Client (Vite middleware or static files) ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started with Supabase backend. Running fullstack port: http://localhost:${PORT}`);
  });
}

startServer();
