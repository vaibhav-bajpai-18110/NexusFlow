import { EventEmitter } from 'node:events';
import { Duplex, Readable } from 'node:stream';

class MockSocket extends Duplex {
  constructor() {
    super();
    this.remoteAddress = '127.0.0.1';
  }
  _read() {
    this.push(null);
  }
  _write(_chunk, _encoding, callback) {
    callback();
  }
}

/**
 * Lightweight in-memory HTTP client for Express applications.
 * Executes requests completely in-memory without binding TCP ports or network sockets.
 */
export function createTestClient(app) {
  return async function request(pathAndQuery, options = {}) {
    const { method = 'GET', headers = {}, body = null } = options;

    return new Promise((resolve, reject) => {
      let bodyString = null;
      if (body !== null && body !== undefined) {
        bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      }

      let sent = false;
      const req = new Readable({
        read() {
          if (!sent) {
            sent = true;
            if (bodyString !== null) {
              this.push(Buffer.from(bodyString, 'utf8'));
            }
          }
          this.push(null);
        },
      });

      const parsedUrl = new URL(pathAndQuery, 'http://localhost');
      req.url = parsedUrl.pathname + parsedUrl.search;
      req.originalUrl = req.url;
      req.method = method.toUpperCase();
      req.headers = {
        host: 'localhost',
        ...Object.fromEntries(
          Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
        ),
      };

      if (bodyString !== null && !req.headers['content-type']) {
        req.headers['content-type'] = 'application/json';
      }
      if (bodyString !== null && !req.headers['content-length']) {
        req.headers['content-length'] = Buffer.byteLength(bodyString).toString();
      }

      req.socket = new MockSocket();
      req.connection = req.socket;

      const chunks = [];
      const resHeaders = {};
      const resEvents = new EventEmitter();

      const res = {
        statusCode: 200,
        headersSent: false,
        locals: {},
        setHeader(name, value) {
          resHeaders[name.toLowerCase()] = value;
          return this;
        },
        getHeader(name) {
          return resHeaders[name.toLowerCase()];
        },
        removeHeader(name) {
          delete resHeaders[name.toLowerCase()];
          return this;
        },
        set(name, value) {
          return this.setHeader(name, value);
        },
        status(code) {
          this.statusCode = code;
          return this;
        },
        write(chunk) {
          if (chunk) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          return true;
        },
        end(chunk) {
          this.headersSent = true;
          if (chunk) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          resEvents.emit('finish');

          const rawText = Buffer.concat(chunks).toString('utf8');
          resolve({
            status: this.statusCode,
            statusCode: this.statusCode,
            headers: resHeaders,
            text: async () => rawText,
            json: async () => JSON.parse(rawText),
          });
        },
        on(event, listener) {
          resEvents.on(event, listener);
          return this;
        },
        once(event, listener) {
          resEvents.once(event, listener);
          return this;
        },
        emit(event, ...args) {
          return resEvents.emit(event, ...args);
        },
      };

      try {
        app.handle(req, res, (err) => {
          if (err) reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  };
}
