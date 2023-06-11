# API WebSocket Bridge

API WebSocket Bridge is a Node.js application designed to be run in a Docker container. It constantly refreshes an API at a set interval and distributes WebSocket (WSS) events to connected clients.

## Prerequisites

Before running the API WebSocket Bridge, make sure you have the following:

- Docker installed on your machine.

Certainly! Here's the updated 'Getting Started' section with the reference to the 'Configuration' section:

## Getting Started

To run the API WebSocket Bridge in a Docker container, follow these steps:

1. Clone this repository to your local machine.
2. Navigate to the project directory.

```bash
cd websocket-driver
```

3. Configure the API WebSocket Bridge by editing the `config.json` file located in the `config` directory. Refer to the 'Configuration' section below for details on how to customize the configuration based on your requirements and the API you are working with.

4. Build the Docker image.

```bash
docker build -t websocket-driver .
```

5. Run the Docker container, exposing the necessary port and providing the required volume mounts.

```bash
docker run -d -p 8080:8080 --name websocket-container \
  -v /path/to/cert/fullchain.pem:/app/cert/fullchain.pem \
  -v /path/to/cert/privkey.pem:/app/cert/privkey.pem \
  -v /path/to/config:/app/config \
  websocket-driver
```

Make sure to replace `/path/to/cert` with the path to your SSL certificate and key files, and `/path/to/config` with the path to your `config.json` file.


## Configuration

The WebSocketDriver application relies on a configuration file (`config.json`) to specify various settings. Below is an example configuration that corresponds to the example response from Salty Bet's API:

```json
{
  "certPath": "/app/cert/fullchain.pem",
  "keyPath": "/app/cert/privkey.pem",
  "port": 8080,
  "updateInterval": 5000,
  "apiUrl": "https://www.saltybet.com/state.json",
  
  "events": {
    "teamNamesChange": {
      "emitEvent": "teamNamesChange",
      "params": ["p1name", "p2name"] 
    },
    "betAmountChange": {
      "emitEvent": "betAmountChange",
      "params": ["p1total", "p2total"]
    },
    "statusChange": {
      "emitEvent": "statusChange",
      "params": ["status"]
    },
    "alertChange": {
      "emitEvent": "alertChange",
      "params": ["alert"]
    },
    "remainingChange": {
      "emitEvent": "remainingChange",
      "params": ["remaining"]
    }
  }
}
```

- `"certPath"` and `"keyPath"` specify the file paths for the SSL certificate and private key respectively.
- `"port"` defines the port number on which the WebSocket server will run.
- `"updateInterval"` determines the interval (in milliseconds) at which the API will be checked for updates.
- `"apiUrl"` specifies the URL of the API that provides the match information. In this case, it is Salty Bet's API endpoint (`https://www.saltybet.com/state.json`).
- `"events"` contains a mapping of event types to their corresponding configuration.

The example response from Salty Bet's API:

```json
{
  "p1name": "Upset chieshen",
  "p2name": "Brunestud arcueid",
  "p1total": "0",
  "p2total": "0",
  "status": "open",
  "alert": "",
  "x": 0,
  "remaining": "78 more matches until the next tournament!"
}
```

The configuration defines five events with their respective `emitEvent` names and associated parameters. These events allow you to subscribe to specific changes in the API response:

- `teamNamesChange`: Triggers when the names of the players change (`"p1name"` or `"p2name"`).
- `betAmountChange`: Triggers when the total bet amounts change (`"p1total"` or `"p2total"`).
- `statusChange`: Triggers when the match status changes (`"status"`).
- `alertChange`: Triggers when there is an alert or message change (`"alert"`).
- `remainingChange`: Triggers when the number of matches remaining changes (`"remaining"`).

These events provide flexibility in handling specific updates and allow you to emit WebSocket events accordingly.

Please make sure to modify the configuration file (`config.json`) according to your requirements and the API you are working with.

## Development

To set up the project for development, follow these steps:

1. Clone this repository to your local machine.
2. Navigate to the project directory.

```bash
cd websocket-driver
```

3. Install the required dependencies.

```bash
npm install
```

4. Start the API WebSocket Bridge.

```bash
npm start
```

The API WebSocket Bridge will now be running on your local machine.

## License

This project is licensed under the [Apache 2.0](LICENSE).

## Acknowledgements

This project makes use of the following packages:

- [axios](https://www.npmjs.com/package/axios) v1.4.0
- [events](https://www.npmjs.com/package/events) v3.3.0

We would like to express our gratitude to the authors and maintainers of these packages for their valuable contributions to the open-source community.