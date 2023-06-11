const WebSocket = require('ws');
const EventEmitter = require('events');
const axios = require('axios');
const https = require('https');
const fs = require('fs');

/**
 * WebSocketDriver class for managing a WebSocket server and API updates.
 */
class WebSocketDriver {
  /**
   * Creates an instance of WebSocketDriver.
   * @param {Object} config - Configuration object for WebSocketDriver.
   */
  constructor(config) {
    /**
     * Configuration object for WebSocketDriver.
     * @type {Object}
     */
    this.config = config;
    this.wss = null;
    this.eventEmitter = new EventEmitter();
    this.intervalId = null;
    this.previousData = {};
    this.validateConfig();
  }

  /**
   * Starts the WebSocket server and API update interval.
   * @returns {Promise<void>} - A promise that resolves when the server is started.
   */
  async start() {
    await this.checkSSLFilesExist();
    await this.checkAPIUpdates();
    this.startWebSocketServer();
    this.startAPIUpdateInterval();
  }

  /**
   * Checks if the SSL certificate and key files exist and are readable.
   * @returns {Promise<void>} - A promise that resolves if the files exist and are readable, otherwise rejects with an error.
   * @throws {Error} - SSL certificate or key file not found or not readable.
   */
  async checkSSLFilesExist() {
    try {
      await Promise.all([
        fs.promises.access(this.config.certPath, fs.constants.R_OK),
        fs.promises.access(this.config.keyPath, fs.constants.R_OK)
      ]);
    } catch (error) {
      throw new Error('SSL certificate or key file not found or not readable');
    }
  }

  /**
   * Checks for API updates and sets the initial data.
   * @returns {Promise<void>} - A promise that resolves when the API data is fetched and set.
   * @throws {Error} - Failed to fetch API data.
   */
  async checkAPIUpdates() {
    try {
      const response = await axios.get(this.config.apiUrl);
      this.previousData = response.data;
    } catch (error) {
      throw new Error(`Failed to fetch API data: ${error.message}`);
    }
  }

  /**
   * Starts the WebSocket server with SSL configuration.
   */
  startWebSocketServer() {
    const serverConfig = {
      cert: fs.readFileSync(this.config.certPath),
      key: fs.readFileSync(this.config.keyPath),
    };
    const server = https.createServer(serverConfig);
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', this.handleConnection.bind(this));

    server.listen(this.config.port, () => {
      this.log(`WebSocket server is running on port ${this.config.port}`, 'info');
    });

    server.on('error', (error) => {
      this.log(`Server error: ${error.message}`, 'error');
    });
  }

  /**
   * Handles a new WebSocket connection.
   * @param {WebSocket} ws - The WebSocket instance representing the connection.
   */
  handleConnection(ws) {
    this.log('New WebSocket client connected', 'info');
    ws.send(JSON.stringify({ type: 'dataUpdate', data: this.previousData }));

    ws.on('message', (message) => {
      let data;
      try {
        data = JSON.parse(message);
      } catch (error) {
        this.log('Invalid JSON message received', 'error');
        return;
      }

      switch (data.type) {
        case 'subscribe':
          this.handleSubscription(ws, data.event);
          break;
        default:
          this.log(`Unknown message type: ${data.type}`, 'warn');
      }
    });
  }

  /**
   * Starts the API update interval.
   */
  startAPIUpdateInterval() {
    this.intervalId = setInterval(async () => {
      try {
        const response = await axios.get(this.config.apiUrl);
        const newData = response.data;
        const updatedEvents = this.getUpdatedEvents(newData);
        updatedEvents.forEach((event) => {
          const eventData = this.getEventData(event, newData);
          this.eventEmitter.emit(event.emitEvent, eventData);
        });
        this.previousData = newData;
      } catch (error) {
        this.log(`Error updating API data: ${error.message}`, 'error');
      }
    }, this.config.updateInterval);
  }

  /**
   * Gets the events that have updated data compared to the previous data.
   * @param {Object} newData - The new API data.
   * @returns {Array} - An array of event configurations that have updated data.
   */
  getUpdatedEvents(newData) {
    return Object.entries(this.config.events)
      .filter(([event, config]) => {
        const { params } = config;
        return params.some((param) => newData[param] !== this.previousData[param]);
      })
      .map(([event]) => this.config.events[event]);
  }

  /**
   * Gets the event data for a specific event from the API data.
   * @param {Object} event - The event configuration.
   * @param {Object} data - The API data.
   * @returns {Object} - The event data.
   */
  getEventData(event, data) {
    const eventData = {};
    const { params } = event;
    params.forEach((param) => {
      const nestedParamValue = param.split('.').reduce((obj, key) => obj && obj[key], data);
      this.setNestedProperty(eventData, param, nestedParamValue);
    });
    return eventData;
  }

  /**
   * Sets a nested property value in an object.
   * @param {Object} obj - The object to set the property value on.
   * @param {string} path - The dot-separated path of the property.
   * @param {*} value - The value to set.
   */
  setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let currentObj = obj;

    for (const key of keys) {
      currentObj[key] = currentObj[key] || {};
      currentObj = currentObj[key];
    }

    currentObj[lastKey] = value;
  }

  /**
   * Handles a subscription request from a WebSocket client.
   * @param {WebSocket} ws - The WebSocket instance representing the connection.
   * @param {string} event - The event type to subscribe to.
   */
  handleSubscription(ws, event) {
    if (event === 'all') {
      for (const eventConfig of Object.values(this.config.events)) {
        this.eventEmitter.on(eventConfig.emitEvent, (eventData) => {
          ws.send(JSON.stringify({ type: eventConfig.emitEvent, ...eventData }));
        });
      }
      this.log('Client subscribed to all events', 'info');
    } else {
      const eventConfig = this.config.events[event];
      if (!eventConfig) {
        this.log(`Unknown event type: ${event}`, 'warn');
        return;
      }
      this.eventEmitter.on(eventConfig.emitEvent, (eventData) => {
        ws.send(JSON.stringify({ type: eventConfig.emitEvent, ...eventData }));
      });
      this.log(`Client subscribed to event: ${event}`, 'info');
    }
  }

  /**
   * Stops the WebSocket server and API update interval.
   */
  stop() {
    clearInterval(this.intervalId);
    this.wss.close();
    this.log('WebSocket server stopped', 'info');
  }

  /**
   * Validates the configuration object.
   * @throws {Error} - If the configuration object is invalid or missing required properties.
   */
  validateConfig() {
    const { certPath, keyPath, port, updateInterval, apiUrl, events } = this.config;

    if (!certPath || typeof certPath !== 'string') {
      throw new Error('Invalid or missing certificate path in the configuration');
    }

    if (!keyPath || typeof keyPath !== 'string') {
      throw new Error('Invalid or missing key path in the configuration');
    }

    if (!port || typeof port !== 'number') {
      throw new Error('Invalid or missing port in the configuration');
    }

    if (!updateInterval || typeof updateInterval !== 'number' || updateInterval <= 0) {
      throw new Error('Invalid or missing update interval in the configuration');
    }

    if (!apiUrl || typeof apiUrl !== 'string') {
      throw new Error('Invalid or missing API URL in the configuration');
    }

    if (!events || typeof events !== 'object' || Array.isArray(events)) {
      throw new Error('Invalid or missing events configuration in the configuration');
    }
  }

  /**
   * Logs a message with the specified log level.
   * @param {string} message - The message to log.
   * @param {string} [level='info'] - The log level (info, warn, error).
   */
  log(message, level = 'info') {
    const logLevel = level.toLowerCase();
    const timestamp = new Date().toISOString();

    switch (logLevel) {
      case 'info':
        console.log(`[${timestamp}] INFO: ${message}`);
        break;
      case 'warn':
        console.log(`[${timestamp}] WARN: ${message}`);
        break;
      case 'error':
        console.error(`[${timestamp}] ERROR: ${message}`);
        break;
      default:
        console.log(`[${timestamp}] ${message}`);
    }
  }
}

module.exports = WebSocketDriver;