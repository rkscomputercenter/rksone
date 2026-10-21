import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from './env';

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Allow all for local Wi-Fi access
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/api/socket.io'
  });

  // Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, username, role } = socket.data.user;
    console.log(`[SOCKET] User connected: ${username} (${userId})`);

    // Join a private room for this user
    socket.join(`user:${userId}`);
    
    // Join a room for their role
    socket.join(`role:${role}`);

    socket.on('disconnect', () => {
      console.log(`[SOCKET] User disconnected: ${username}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

/**
 * Broadcast message to all or targeted
 */
export const socketBroadcast = (data: { 
  type: string; 
  message?: string; 
  userId?: string; 
  excludeRole?: string;
  targetRole?: string;
  targetRoles?: string[];
  payload?: any;
}) => {
  if (!io) return;

  if (data.userId) {
    io.to(`user:${data.userId}`).emit('notification', data);
  } else if (data.targetRole) {
    io.to(`role:${data.targetRole}`).emit('notification', data);
  } else if (data.targetRoles) {
    data.targetRoles.forEach(r => io.to(`role:${r}`).emit('notification', data));
  } else if (data.excludeRole) {
    const roles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
    roles.forEach(r => {
      if (r !== data.excludeRole) {
        io.to(`role:${r}`).emit('notification', data);
      }
    });
  } else {
    io.emit('notification', data);
  }
};
