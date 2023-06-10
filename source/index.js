const WebSocketDriver = require('./WebSocketDriver');

// Load the configuration from config.json
const config = require('./config.json');

// Create an instance of WebSocketDriver
const driver = new WebSocketDriver(config);

// Start the WebSocket driver
driver.start()
  .then(() => {
    driver.log('WebSocket driver is running', 'info');
  })
  .catch((error) => {
    driver.log(`Failed to start WebSocket driver: ${error.message}`, 'error');
  });
