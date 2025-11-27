import http from 'http';
import { randomBytes } from 'crypto';
import { URL } from 'url';
import { spawn } from 'child_process';
import { saveApiKey } from './config-storage';

// External website URL - change this to your actual website
// For testing, using localhost:4321 (Astro dev server)
const EXTERNAL_WEB_URL = 'http://localhost:4321';

// Success page HTML shown after API key is received
const SUCCESS_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connected - BB-lite</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        p {
            color: #666;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        .success-icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✅</div>
        <h1>Successfully Connected!</h1>
        <p>Your API key has been saved. You can close this window and return to the CLI.</p>
    </div>
</body>
</html>
`;

// Error page HTML shown if something goes wrong
const ERROR_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - BB-lite</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        p {
            color: #666;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        .error-icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">❌</div>
        <h1>Connection Failed</h1>
        <p>There was an error saving your API key. Please try again.</p>
    </div>
</body>
</html>
`;

let serverInstance: http.Server | null = null;
let apiKeyResolver: ((apiKey: string) => void) | null = null;
let apiKeyRejector: ((error: Error) => void) | null = null;

export function getServerInstance(): http.Server | null {
  return serverInstance;
}

export async function startCallbackServer(): Promise<{ url: string; token: string }> {
  return new Promise((resolve, reject) => {
    // Generate a unique token for this session
    const token = randomBytes(32).toString('hex');

    // Create server instance
    serverInstance = http.createServer();

    serverInstance.on('request', (req, res) => {
      if (!req.url) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(ERROR_HTML);
        return;
      }

      const url = new URL(req.url, `http://localhost`);

      // Handle callback from external website
      if (url.pathname === '/callback') {
        const receivedToken = url.searchParams.get('token');
        const apiKey = url.searchParams.get('apiKey');

        // Verify token matches
        if (receivedToken !== token) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(ERROR_HTML);
          if (apiKeyRejector) {
            apiKeyRejector(new Error('Invalid token'));
          }
          return;
        }

        // Validate API key
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(ERROR_HTML);
          if (apiKeyRejector) {
            apiKeyRejector(new Error('Invalid API key'));
          }
          return;
        }

        // Save the API key
        try {
          saveApiKey(apiKey.trim());

          // Show success page
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(SUCCESS_HTML);

          // Resolve the promise with the API key
          if (apiKeyResolver) {
            apiKeyResolver(apiKey.trim());
          }
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(ERROR_HTML);
          if (apiKeyRejector) {
            apiKeyRejector(error as Error);
          }
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    serverInstance.listen(0, 'localhost', () => {
      const address = serverInstance?.address();
      if (address && typeof address === 'object') {
        const port = address.port;
        const callbackUrl = `http://localhost:${port}/callback`;
        resolve({ url: callbackUrl, token });
      } else {
        reject(new Error('Failed to get server address'));
      }
    });

    serverInstance.on('error', reject);
  });
}

export function stopWebConnectServer(): void {
  if (serverInstance) {
    serverInstance.close();
    serverInstance = null;
  }
  apiKeyResolver = null;
  apiKeyRejector = null;
}

export async function connectToWeb(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Start callback server and get token
      const { url: callbackUrl, token } = await startCallbackServer();

      // Set up promise resolvers
      apiKeyResolver = resolve;
      apiKeyRejector = reject;

      // Construct the external URL with callback and token parameters
      const externalUrl = new URL(`${EXTERNAL_WEB_URL}/connect`);
      externalUrl.searchParams.set('callback', callbackUrl);
      externalUrl.searchParams.set('token', token);
      externalUrl.searchParams.set('source', 'cli');

      const finalUrl = externalUrl.toString();

      // Open the external website in the browser using spawn for better URL handling
      // This ensures query parameters are preserved
      const platform = process.platform;
      let command: string;
      let args: string[];

      if (platform === 'darwin') {
        // macOS
        command = 'open';
        args = [finalUrl];
      } else if (platform === 'win32') {
        // Windows
        command = 'cmd';
        args = ['/c', 'start', '', finalUrl];
      } else {
        // Linux and others
        command = 'xdg-open';
        args = [finalUrl];
      }

      const child = spawn(command, args, {
        detached: true,
        stdio: 'ignore'
      });

      // Give the browser a moment to open
      await new Promise((resolve) => setTimeout(resolve, 500));

      child.on('error', (error) => {
        console.error('Failed to open browser:', error);
        reject(new Error(`Failed to open browser: ${error.message}`));
      });

      // Unref to allow the process to exit independently
      child.unref();
    } catch (error) {
      reject(new Error(`Failed to start web connect: ${(error as Error).message}`));
    }
  });
}

