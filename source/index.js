const WebSocketBridge = require('./bridge');

// Load the configuration from config.json
const config = require('/app/config/config.json');

// Create an instance of WebSocketDriver
const driver = new WebSocketBridge(config);

// Start the WebSocket Bridge
driver.start()
  .then(() => {
    driver.log('WebSocket Bridge is running', 'info');
  })
  .catch((error) => {
    driver.log(`Failed to start WebSocket Bridge: ${error.message}`, 'error');
  });
