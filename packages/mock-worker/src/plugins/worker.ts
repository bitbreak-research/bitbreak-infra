import fp from "fastify-plugin";
import WebSocket from "ws";
import fs from "fs";
import path from "path";

type MetricsPayload = {
  memory: number;
  cpu: number;
  rate: number;
};

export default fp((fastify, options: {}, done) => {

  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const bitbreakConfigPath = path.join(homeDir, ".bitbreak", "config.json");
  const workerConfig = JSON.parse(fs.readFileSync(bitbreakConfigPath, "utf8")) as WorkerConfig;

  const websocketUrl = workerConfig.websocket_url;
  const workerId = workerConfig.id;
  let currentToken = workerConfig.token;

  let ws: WebSocket | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let authenticated = false;

  const logger = fastify.log.child({ plugin: "websocket" });

  function updateBitbreakConfigToken(newToken: string) {
    try {
      const raw = fs.readFileSync(bitbreakConfigPath, "utf8");
      const config = JSON.parse(raw) as {
        id: string;
        token: string;
        websocket_url: string;
      };

      const updated = {
        ...config,
        token: newToken,
      };

      fs.writeFileSync(
        bitbreakConfigPath,
        JSON.stringify(updated, null, 2),
        "utf8"
      );
      logger.info(
        { configPath: bitbreakConfigPath },
        "Updated ~/.bitbreak/config.json with new token"
      );
    } catch (err) {
      logger.error(
        {
          err,
          configPath: bitbreakConfigPath,
        },
        "Failed to update ~/.bitbreak/config.json"
      );
    }
  }

  function connect() {
    logger.info(
      { websocketUrl, workerId },
      "Connecting to WebSocket server..."
    );

    ws = new WebSocket(websocketUrl);

    ws.on("open", () => {
      logger.info("WebSocket connected, sending auth message");

      const authMessage = {
        type: "auth",
        worker_id: workerId,
        token: currentToken,
      };

      ws?.send(JSON.stringify(authMessage));
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        logger.debug({ message }, "Received WebSocket message");

        if (message.type === "auth_ok") {
          authenticated = true;
          logger.info(
            {
              worker_id: message.worker_id,
              name: message.name,
              token_expires_at: message.token_expires_at,
            },
            "Authentication successful"
          );

          return;
        }

        if (message.type === "auth_error") {
          authenticated = false;
          logger.error(
            {
              code: message.code,
              message: message.message,
            },
            "Authentication error from WebSocket server"
          );

          ws?.close();
          return;
        }

        if (message.type === "metrics_ack") {
          logger.debug("Metrics acknowledged by server");
          return;
        }

        if (message.type === "metrics_error") {
          logger.error(
            {
              code: message.code,
              message: message.message,
            },
            "Metrics error from server"
          );
          return;
        }

        if (message.type === "token_renewal") {
          const newToken: string = message.new_token;
          const expiresAt: string = message.expires_at;

          logger.info(
            { expires_at: expiresAt },
            "Token renewal received from server"
          );

          // Update in-memory token for future reconnects
          currentToken = newToken;

          // Persist new token to ~/.bitbreak/config.json
          updateBitbreakConfigToken(newToken);

          // Acknowledge renewal back to server
          ws?.send(
            JSON.stringify({
              type: "token_renewal_ack",
              success: true,
            })
          );

          return;
        }
      } catch (err) {
        logger.error({ err }, "Failed to parse WebSocket message");
      }
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WebSocket error");
    });

    ws.on("close", (code, reason) => {
      logger.warn(
        {
          code,
          reason: reason?.toString() || "",
        },
        "WebSocket connection closed"
      );

      authenticated = false;
      ws = null;

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      // Attempt reconnect
      reconnectTimeout = setTimeout(() => {
        connect();
      }, 5000);
    });
  }

  // Expose a helper on fastify to send metrics over the WebSocket
  fastify.decorate(
    "sendWorkerMetrics",
    async (payload: MetricsPayload): Promise<void> => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket is not connected");
      }

      if (!authenticated) {
        throw new Error("WebSocket is not authenticated");
      }

      const message = {
        type: "metrics",
        memory: payload.memory,
        cpu: payload.cpu,
        rate: payload.rate,
      };

      logger.debug({ message }, "Sending metrics over WebSocket");
      ws.send(JSON.stringify(message));
    }
  );

  // Start the WebSocket connection when plugin is registered
  connect();

  // Clean up on server shutdown
  fastify.addHook("onClose", (_instance, doneHook) => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    doneHook();
  });

  done();
});


declare module "fastify" {
  interface FastifyInstance {
    sendWorkerMetrics: (payload: MetricsPayload) => Promise<void>;
  }
}