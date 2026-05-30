import { Server as SocketServer } from "socket.io";
import { Server } from "http";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { getDb } from "../db/schema";
import { v4 as uuidv4 } from "uuid";

export let io: SocketServer;

interface AuthPayload {
  userId: string;
  username: string;
  role: string;
}

interface ClientMeta {
  userId: string;
  username: string;
  displayName: string;
  roomId?: string;
}

const clients = new Map<string, ClientMeta>();

export function setupWebSocket(httpServer: Server) {
  io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  // ── Auth middleware ───────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token ?? socket.handshake.headers["authorization"]?.split(" ")[1];
    if (!token) return next(new Error("Authentication required"));
    try {
      const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
      (socket as unknown as { _user: AuthPayload })._user = payload;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = (socket as unknown as { _user: AuthPayload })._user;
    const db = getDb();
    const userData = db.prepare("SELECT display_name FROM users WHERE id = ?").get(user.userId) as { display_name: string } | undefined;

    clients.set(socket.id, {
      userId: user.userId,
      username: user.username,
      displayName: userData?.display_name ?? user.username,
    });

    // ── Watch Party ──────────────────────────────────────────────────────
    socket.on("room:join", (roomId: string) => {
      socket.join(`room:${roomId}`);
      const meta = clients.get(socket.id)!;
      meta.roomId = roomId;
      io.to(`room:${roomId}`).emit("room:user_joined", {
        userId: user.userId,
        displayName: meta.displayName,
      });
    });

    socket.on("room:leave", (roomId: string) => {
      socket.leave(`room:${roomId}`);
      const meta = clients.get(socket.id);
      if (meta) meta.roomId = undefined;
      io.to(`room:${roomId}`).emit("room:user_left", { userId: user.userId });
    });

    socket.on("room:play", ({ roomId, position }: { roomId: string; position: number }) => {
      db.prepare("UPDATE rooms SET state = 'playing', position = ? WHERE id = ?").run(position, roomId);
      socket.to(`room:${roomId}`).emit("room:play", { position, by: user.username });
    });

    socket.on("room:pause", ({ roomId, position }: { roomId: string; position: number }) => {
      db.prepare("UPDATE rooms SET state = 'paused', position = ? WHERE id = ?").run(position, roomId);
      socket.to(`room:${roomId}`).emit("room:pause", { position, by: user.username });
    });

    socket.on("room:seek", ({ roomId, position }: { roomId: string; position: number }) => {
      db.prepare("UPDATE rooms SET position = ? WHERE id = ?").run(position, roomId);
      socket.to(`room:${roomId}`).emit("room:seek", { position, by: user.username });
    });

    // ── Chat ─────────────────────────────────────────────────────────────
    socket.on("chat:message", ({ roomId, content }: { roomId?: string; content: string }) => {
      if (!content?.trim() || content.length > 500) return;
      const db = getDb();
      const meta = clients.get(socket.id)!;
      const msgId = uuidv4();

      if (roomId) {
        db.prepare(
          "INSERT INTO chat_messages (id, room_id, user_id, content) VALUES (?, ?, ?, ?)"
        ).run(msgId, roomId, user.userId, content.trim());
        io.to(`room:${roomId}`).emit("chat:message", {
          id: msgId,
          userId: user.userId,
          displayName: meta.displayName,
          content: content.trim(),
          sentAt: Date.now(),
        });
      } else {
        // Global chat
        db.prepare(
          "INSERT INTO chat_messages (id, user_id, content) VALUES (?, ?, ?)"
        ).run(msgId, user.userId, content.trim());
        io.emit("chat:global", {
          id: msgId,
          userId: user.userId,
          displayName: meta.displayName,
          content: content.trim(),
          sentAt: Date.now(),
        });
      }
    });

    // ── Online status ─────────────────────────────────────────────────────
    io.emit("users:online", { count: clients.size });

    socket.on("disconnect", () => {
      const meta = clients.get(socket.id);
      if (meta?.roomId) {
        io.to(`room:${meta.roomId}`).emit("room:user_left", { userId: user.userId });
      }
      clients.delete(socket.id);
      io.emit("users:online", { count: clients.size });
    });
  });

  return io;
}
