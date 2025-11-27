# Web Application Implementation Plan: CLI Connect Feature

## Overview
This document outlines what the web application needs to implement to support the CLI "Connect To Web" functionality. The CLI opens a browser to your web app, and your web app needs to send configuration data back to the CLI.

## Flow Diagram

```
1. User runs CLI command
   ↓
2. CLI starts local HTTP server (random port)
   ↓
3. CLI generates unique token
   ↓
4. CLI opens browser to: http://your-website.com/connect?callback=http://localhost:XXXXX/callback&token=XXXXX&source=cli
   ↓
5. Web app receives GET request with callback URL and token
   ↓
6. User clicks "Connect" button on web app
   ↓
7. Web app sends POST request to callback URL with JSON config
   ↓
8. CLI receives config, saves it, and shows success page
```

## Implementation Steps

### Step 1: Create the `/connect` Route/Page

**Purpose**: Handle the initial GET request when the CLI opens the browser.

**URL Pattern**: `/connect`

**Query Parameters** (provided by CLI):
- `callback` (string): The localhost callback URL, e.g., `http://localhost:54321/callback`
- `token` (string): A unique token for this session (32-byte hex string)
- `source` (string): Always `"cli"` in this case

**What to do**:
1. Extract `callback` and `token` from query parameters
2. Store them in session/localStorage/state (you'll need them later)
3. Display a UI page with a "Connect" button
4. The UI should show that the user is connecting their CLI

**Example URL**:
```
http://your-website.com/connect?callback=http://localhost:54321/callback&token=a1b2c3d4e5f6...&source=cli
```

### Step 2: Create the Connect Button Handler

**Purpose**: When user clicks "Connect", send the configuration to the CLI.

**Action**: POST request to the callback URL

**Endpoint**: Use the `callback` URL from Step 1 (e.g., `http://localhost:54321/callback`)

**Method**: POST

**URL Parameters**: Append the `token` as a query parameter
- Example: `http://localhost:54321/callback?token=a1b2c3d4e5f6...`

**Request Body**: JSON with the following structure:
```json
{
  "id": "wrk_c272700f-eeb0-4f0d-8b42-ad31e481f33c",
  "token": "tk_ra7Ied69ik48CU_RMD3lNIZuU3hjqrxFOYIV1q5nvlFhlziMm4JPIYzf-PVlvAbW",
  "websocket_url": "wss://api.espdaniel1999.workers.dev/ws"
}
```

**Required Fields**:
- `id` (string): Worker/instance ID
- `token` (string): Authentication token
- `websocket_url` (string): WebSocket connection URL

**Headers**:
```
Content-Type: application/json
```

### Step 3: Handle the Response

**Success Response** (200):
- The CLI will return an HTML success page
- You can optionally redirect the user or show a success message
- The CLI will automatically close the connection

**Error Response** (400/500):
- The CLI will return an HTML error page
- Show an error message to the user
- Allow them to try again

## Code Examples

### Frontend Example (React/Next.js)

```typescript
// pages/connect.tsx or components/ConnectPage.tsx

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function ConnectPage() {
  const router = useRouter();
  const { callback, token, source } = router.query;
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!callback || !token) {
      setError('Missing callback URL or token');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Prepare the configuration data
      const config = {
        id: "wrk_c272700f-eeb0-4f0d-8b42-ad31e481f33c", // Get from your backend/context
        token: "tk_ra7Ied69ik48CU_RMD3lNIZuU3hjqrxFOYIV1q5nvlFhlziMm4JPIYzf-PVlvAbW", // Get from your backend/context
        websocket_url: "wss://api.espdaniel1999.workers.dev/ws" // Get from your backend/context
      };

      // Construct the callback URL with token
      const callbackUrl = new URL(callback as string);
      callbackUrl.searchParams.set('token', token as string);

      // Send POST request to CLI callback server
      const response = await fetch(callbackUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        // Success! The CLI will show a success page
        // You can show a success message or redirect
        alert('Successfully connected! You can close this window.');
      } else {
        setError('Failed to connect. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Make sure the CLI is still running.');
      console.error('Connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  if (!callback || !token) {
    return <div>Invalid connection request. Missing parameters.</div>;
  }

  return (
    <div>
      <h1>Connect CLI</h1>
      <p>Click the button below to connect your CLI to this account.</p>
      
      {error && <div style={{ color: 'red' }}>{error}</div>}
      
      <button 
        onClick={handleConnect} 
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>
    </div>
  );
}
```

### Backend API Example (if you need to fetch config from backend)

```typescript
// API route to get user's config
// GET /api/user/config

export async function getUserConfig(userId: string) {
  // Fetch from your database
  return {
    id: "wrk_c272700f-eeb0-4f0d-8b42-ad31e481f33c",
    token: "tk_ra7Ied69ik48CU_RMD3lNIZuU3hjqrxFOYIV1q5nvlFhlziMm4JPIYzf-PVlvAbW",
    websocket_url: "wss://api.espdaniel1999.workers.dev/ws"
  };
}
```

### Vanilla JavaScript Example

```javascript
// Get query parameters from URL
const urlParams = new URLSearchParams(window.location.search);
const callback = urlParams.get('callback');
const token = urlParams.get('token');

async function connect() {
  if (!callback || !token) {
    alert('Missing connection parameters');
    return;
  }

  const config = {
    id: "wrk_c272700f-eeb0-4f0d-8b42-ad31e481f33c",
    token: "tk_ra7Ied69ik48CU_RMD3lNIZuU3hjqrxFOYIV1q5nvlFhlziMm4JPIYzf-PVlvAbW",
    websocket_url: "wss://api.espdaniel1999.workers.dev/ws"
  };

  // Construct callback URL with token
  const callbackUrl = new URL(callback);
  callbackUrl.searchParams.set('token', token);

  try {
    const response = await fetch(callbackUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (response.ok) {
      alert('Successfully connected!');
    } else {
      alert('Connection failed. Please try again.');
    }
  } catch (error) {
    alert('Connection error. Make sure the CLI is running.');
    console.error(error);
  }
}

// Add button click handler
document.getElementById('connect-btn').addEventListener('click', connect);
```

## Important Notes

### Security Considerations

1. **Token Validation**: The CLI validates the token matches. Make sure to use the exact token from the query parameters.

2. **CORS**: The callback is to `localhost`, so CORS shouldn't be an issue, but be aware that:
   - The request is from your web domain to `localhost`
   - Browsers may block this in some cases, but it should work for most modern browsers

3. **HTTPS vs HTTP**: 
   - Your web app should use HTTPS in production
   - The callback URL is always `http://localhost` (not HTTPS)
   - This is expected and safe since it's localhost

### Error Handling

1. **Network Errors**: If the CLI is closed, the request will fail. Show a helpful error message.

2. **Timeout**: The CLI waits up to 5 minutes. Your UI should indicate the connection is pending.

3. **Invalid Token**: If token doesn't match, the CLI will reject it. Make sure to use the exact token from the URL.

### Testing

1. **Local Testing**: 
   - Run your web app locally (e.g., `http://localhost:4321`)
   - Update `EXTERNAL_WEB_URL` in `web-connect.ts` if needed
   - Test the full flow

2. **Production**: 
   - Update `EXTERNAL_WEB_URL` to your production URL
   - Ensure HTTPS is enabled
   - Test from different browsers

## Checklist

- [ ] Create `/connect` route/page that accepts `callback`, `token`, and `source` query parameters
- [ ] Store callback URL and token (session/state)
- [ ] Create UI with "Connect" button
- [ ] Implement button handler that:
  - [ ] Constructs callback URL with token as query parameter
  - [ ] Prepares JSON config with `id`, `token`, `websocket_url`
  - [ ] Sends POST request with `Content-Type: application/json`
  - [ ] Handles success/error responses
- [ ] Get config data (`id`, `token`, `websocket_url`) from your backend/database
- [ ] Add error handling for network failures
- [ ] Add loading states during connection
- [ ] Test with CLI locally
- [ ] Update `EXTERNAL_WEB_URL` in CLI for production
- [ ] Deploy and test in production

## Questions to Answer

1. **Where does the config data come from?**
   - Do you have a backend API that provides `id`, `token`, `websocket_url`?
   - Is it user-specific or account-specific?
   - Do you need to create a new worker/instance when connecting?

2. **Authentication**: 
   - Is the user logged in when they reach `/connect`?
   - Do you need to verify the user's identity before sending config?

3. **Multiple Connections**:
   - Can a user connect multiple CLI instances?
   - Should each connection get unique config or share the same?

4. **WebSocket URL**:
   - Is the `websocket_url` static or dynamic per user/instance?
   - Does it need to be generated or fetched from your backend?

