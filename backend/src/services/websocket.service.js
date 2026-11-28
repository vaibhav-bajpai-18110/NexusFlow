import { EventEmitter } from 'node:events';
import { WebSocket, WebSocketServer } from 'ws';
import { deviceService } from './device.service.js';
import { ruleEvaluationService } from './ruleEvaluation.service.js';
import { telemetryService } from './telemetry.service.js';

/**
 * WebSocket Service for real-time telemetry, device status, and alert broadcasting.
 */
export class WebSocketService extends EventEmitter {
  constructor() {
    super();
    /** @type {WebSocketServer|null} */
    this.wss = null;
    /** @type {Set<WebSocket>} */
    this.clients = new Set();
    /** @type {NodeJS.Timeout|null} */
    this.heartbeatInterval = null;
    /** Operational statistics */
    this.stats = {
      totalConnections: 0,
      totalBroadcasts: 0,
      totalTelemetryBroadcasts: 0,
      totalAlertBroadcasts: 0,
      totalDeviceStatusBroadcasts: 0,
    };

    this._boundTelemetryListener = null;
    this._boundAlertListener = null;
    this._boundDeviceUpdateListener = null;
    this._boundDeviceStatusListener = null;
  }

  /**
   * Initializes WebSocket server attached to an existing HTTP server.
   * @param {import('node:http').Server} httpServer
   * @param {object} [options]
   * @param {string} [options.path='/ws']
   * @returns {WebSocketServer}
   */
  init(httpServer, options = {}) {
    if (this.wss) {
      return this.wss;
    }

    const wsPath = options.path || '/ws';

    // Support both specific path /ws and general upgrade
    this.wss = new WebSocketServer({
      server: httpServer,
      path: wsPath,
      ...options,
    });

    this.wss.on('connection', (ws, req) => {
      this._handleConnection(ws, req);
    });

    this.wss.on('error', (err) => {
      console.error('[WebSocket] Server error:', err.message);
      this.emit('error', err);
    });

    // Start heartbeat interval (every 30 seconds)
    this.heartbeatInterval = setInterval(() => {
      this._checkHeartbeats();
    }, 30000);

    // Wire up domain event listeners for real-time broadcasting
    this._bindDomainEvents();

    console.log(`[WebSocket] Real-time service initialized on path "${wsPath}"`);
    return this.wss;
  }

  /**
   * Handles a new WebSocket client connection.
   * @private
   * @param {WebSocket} ws
   * @param {import('node:http').IncomingMessage} req
   */
  _handleConnection(ws, req) {
    ws.isAlive = true;
    ws.subscribedDeviceId = null;
    ws.connectedAt = new Date().toISOString();
    ws.remoteAddress = req?.socket?.remoteAddress || 'unknown';

    this.clients.add(ws);
    this.stats.totalConnections += 1;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message) => {
      this._handleClientMessage(ws, message);
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      this.emit('clientDisconnected', ws);
    });

    ws.on('error', (err) => {
      console.error('[WebSocket] Client error:', err.message);
      this.clients.delete(ws);
    });

    // Send welcome handshake message
    this._send(ws, {
      event: 'connected',
      type: 'connection',
      message: 'Connected to NexusFlow Real-Time Telemetry & Rule Engine Stream',
      clientCount: this.clients.size,
      timestamp: new Date().toISOString(),
    });

    this.emit('clientConnected', ws);
  }

  /**
   * Processes incoming messages from a connected client.
   * Supports: ping, subscribe, unsubscribe, get_latest.
   * @private
   * @param {WebSocket} ws
   * @param {string|Buffer} rawMessage
   */
  _handleClientMessage(ws, rawMessage) {
    try {
      const parsed = JSON.parse(rawMessage.toString());
      const action = (parsed.action || parsed.type || parsed.event || '').toLowerCase();

      switch (action) {
        case 'ping':
          this._send(ws, {
            event: 'pong',
            type: 'pong',
            timestamp: new Date().toISOString(),
          });
          break;

        case 'subscribe':
          if (parsed.deviceId) {
            ws.subscribedDeviceId = parsed.deviceId.toString().toUpperCase().trim();
            this._send(ws, {
              event: 'subscribed',
              type: 'subscription',
              deviceId: ws.subscribedDeviceId,
              message: `Subscribed to telemetry for device "${ws.subscribedDeviceId}"`,
              timestamp: new Date().toISOString(),
            });
          } else {
            ws.subscribedDeviceId = null;
            this._send(ws, {
              event: 'subscribed',
              type: 'subscription',
              deviceId: '*',
              message: 'Subscribed to all devices telemetry stream',
              timestamp: new Date().toISOString(),
            });
          }
          break;

        case 'unsubscribe':
          ws.subscribedDeviceId = null;
          this._send(ws, {
            event: 'unsubscribed',
            type: 'subscription',
            message: 'Unsubscribed from device-specific stream',
            timestamp: new Date().toISOString(),
          });
          break;

        case 'get_latest':
        case 'snapshot':
          {
            const latest = telemetryService.getLatest(parsed.deviceId);
            this._send(ws, {
              event: 'snapshot',
              type: 'snapshot',
              data: latest,
              timestamp: new Date().toISOString(),
            });
          }
          break;

        default:
          this._send(ws, {
            event: 'ack',
            type: 'ack',
            message: `Received action: ${action}`,
            timestamp: new Date().toISOString(),
          });
          break;
      }
    } catch {
      // Non-JSON message: check if plain "ping"
      if (rawMessage.toString().trim().toLowerCase() === 'ping') {
        this._send(ws, {
          event: 'pong',
          type: 'pong',
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Safely sends JSON payload to a specific WebSocket client.
   * @private
   * @param {WebSocket} ws
   * @param {object} payload
   */
  _send(ws, payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(payload));
      } catch (err) {
        console.error('[WebSocket] Failed to send message:', err.message);
      }
    }
  }

  /**
   * Checks heartbeat status of all connected sockets and closes dead ones.
   * @private
   */
  _checkHeartbeats() {
    for (const ws of this.clients) {
      if (ws.isAlive === false) {
        this.clients.delete(ws);
        ws.terminate();
      } else {
        ws.isAlive = false;
        try {
          ws.ping();
        } catch {
          this.clients.delete(ws);
          ws.terminate();
        }
      }
    }
  }

  /**
   * Binds to telemetryService, ruleEvaluationService, and deviceService events
   * to automatically broadcast real-time events.
   * @private
   */
  _bindDomainEvents() {
    // 1. Live Telemetry Broadcasting
    this._boundTelemetryListener = (record) => {
      this.broadcastTelemetry(record);
    };
    telemetryService.on('telemetry', this._boundTelemetryListener);

    // 2. Real-Time Alert Broadcasting
    this._boundAlertListener = (alertResult) => {
      this.broadcastAlert(alertResult);
    };
    ruleEvaluationService.on('alert', this._boundAlertListener);

    // 3. Device Status Broadcasting
    this._boundDeviceUpdateListener = (deviceRecord) => {
      this.broadcastDeviceStatus(deviceRecord);
    };
    deviceService.on('deviceUpdated', this._boundDeviceUpdateListener);
    deviceService.on('deviceTelemetryUpdated', this._boundDeviceUpdateListener);

    this._boundDeviceStatusListener = (deviceRecord) => {
      this.broadcastDeviceStatus(deviceRecord);
    };
    deviceService.on('deviceCreated', this._boundDeviceStatusListener);
  }

  /**
   * Unbinds domain event listeners.
   * @private
   */
  _unbindDomainEvents() {
    if (this._boundTelemetryListener) {
      telemetryService.off('telemetry', this._boundTelemetryListener);
      this._boundTelemetryListener = null;
    }
    if (this._boundAlertListener) {
      ruleEvaluationService.off('alert', this._boundAlertListener);
      this._boundAlertListener = null;
    }
    if (this._boundDeviceUpdateListener) {
      deviceService.off('deviceUpdated', this._boundDeviceUpdateListener);
      deviceService.off('deviceTelemetryUpdated', this._boundDeviceUpdateListener);
      this._boundDeviceUpdateListener = null;
    }
    if (this._boundDeviceStatusListener) {
      deviceService.off('deviceCreated', this._boundDeviceStatusListener);
      this._boundDeviceStatusListener = null;
    }
  }

  /**
   * Broadcasts a message to all connected clients (with optional device filtering).
   * @param {string} event Event name (e.g. 'telemetry', 'alert', 'device:status')
   * @param {object} data Payload data
   * @param {string} [targetDeviceId] Optional target deviceId for client subscription filtering
   * @returns {number} Number of clients that received the broadcast
   */
  broadcast(event, data, targetDeviceId = null) {
    if (this.clients.size === 0) {
      return 0;
    }

    const payload = JSON.stringify({
      event,
      type: event,
      data,
      deviceId: targetDeviceId || data?.deviceId || null,
      timestamp: data?.timestamp || new Date().toISOString(),
    });

    let sentCount = 0;
    const targetKey = targetDeviceId ? targetDeviceId.toUpperCase().trim() : null;

    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        // If client specifically subscribed to a device, only send matching telemetry
        if (
          targetKey &&
          ws.subscribedDeviceId &&
          ws.subscribedDeviceId !== targetKey
        ) {
          continue;
        }

        try {
          ws.send(payload);
          sentCount += 1;
        } catch (err) {
          console.error('[WebSocket] Broadcast error to client:', err.message);
        }
      }
    }

    this.stats.totalBroadcasts += 1;
    this.emit('broadcast', { event, count: sentCount, data });
    return sentCount;
  }

  /**
   * Broadcasts incoming telemetry record to connected WebSocket clients.
   * @param {object} record
   * @returns {number}
   */
  broadcastTelemetry(record) {
    if (!record) return 0;
    this.stats.totalTelemetryBroadcasts += 1;
    return this.broadcast('telemetry', record, record.deviceId);
  }

  /**
   * Broadcasts generated alert to connected WebSocket clients.
   * @param {object} alertResult
   * @returns {number}
   */
  broadcastAlert(alertResult) {
    if (!alertResult) return 0;
    this.stats.totalAlertBroadcasts += 1;
    return this.broadcast('alert', alertResult, alertResult.deviceId);
  }

  /**
   * Broadcasts device status transition to connected WebSocket clients.
   * @param {object} deviceRecord
   * @returns {number}
   */
  broadcastDeviceStatus(deviceRecord) {
    if (!deviceRecord) return 0;
    this.stats.totalDeviceStatusBroadcasts += 1;
    return this.broadcast('device:status', deviceRecord, deviceRecord.deviceId);
  }

  /**
   * Returns operational statistics of the WebSocket service.
   * @returns {object}
   */
  getStats() {
    return {
      connectedClients: this.clients.size,
      isRunning: Boolean(this.wss),
      path: '/ws',
      stats: { ...this.stats },
    };
  }

  /**
   * Closes WebSocket server, disconnects all clients, and cleans up intervals.
   * @returns {Promise<void>}
   */
  async close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this._unbindDomainEvents();

    // Terminate all remaining client sockets
    for (const ws of this.clients) {
      try {
        ws.terminate();
      } catch {
        // Ignore termination errors during shutdown
      }
    }
    this.clients.clear();

    if (this.wss) {
      await new Promise((resolve) => {
        this.wss.close(() => {
          this.wss = null;
          resolve();
        });
      });
    }

    console.log('[WebSocket] Server closed cleanly.');
  }
}

export const websocketService = new WebSocketService();
export default websocketService;
