import { Response } from 'express';

interface Client {
  id: string;
  res: Response;
  userId?: string;
  role?: string;
  connectedAt: Date;
}

class SSEManager {
  private clients: Map<string, Client> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      this.broadcast('ping', { time: Date.now() });
    }, 20000);
  }

  public addClient(res: Response, userId?: string, role?: string): string {
    const id = `sse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Set proper SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // For nginx/cloud proxies
      'Access-Control-Allow-Origin': '*',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', clientId: id, timestamp: new Date().toISOString() })}\n\n`);

    const client: Client = { id, res, userId, role, connectedAt: new Date() };
    this.clients.set(id, client);

    res.on('close', () => {
      this.removeClient(id);
    });

    return id;
  }

  public removeClient(id: string) {
    this.clients.delete(id);
  }

  public broadcast(event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(payload);
      } catch (err) {
        this.clients.delete(id);
      }
    }
  }

  public sendToUser(userId: string, event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [id, client] of this.clients.entries()) {
      if (client.userId === userId) {
        try {
          client.res.write(payload);
        } catch (err) {
          this.clients.delete(id);
        }
      }
    }
  }

  public sendToRole(role: string, event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [id, client] of this.clients.entries()) {
      if (client.role === role) {
        try {
          client.res.write(payload);
        } catch (err) {
          this.clients.delete(id);
        }
      }
    }
  }

  public getClientCount(): number {
    return this.clients.size;
  }
}

export const sse = new SSEManager();
