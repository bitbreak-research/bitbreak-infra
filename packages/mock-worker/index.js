#!/usr/bin/env node

import WebSocket from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG_FILE = join(__dirname, 'config.json');
const DEFAULT_SERVER_URL = process.env.SERVER_URL || 'ws://localhost:8787/ws';
const DEFAULT_WORK_INTERVAL = parseInt(process.env.WORK_INTERVAL || '5000', 10); // 5 seconds
const DEFAULT_METRICS_INTERVAL = parseInt(process.env.METRICS_INTERVAL || '30000', 10); // 30 seconds

// Load configuration
let config = {};
if (existsSync(CONFIG_FILE)) {
  try {
    config = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  } catch (error) {
    console.error('Error reading config file:', error.message);
    process.exit(1);
  }
}

const serverUrl = config.server_url || DEFAULT_SERVER_URL;
const workerId = config.worker_id || process.env.WORKER_ID;
const token = config.token || process.env.TOKEN;

if (!workerId || !token) {
  console.error('Error: worker_id and token are required');
  console.error('Set them via:');
  console.error('  - config.json file with { "worker_id": "...", "token": "...", "server_url": "..." }');
  console.error('  - Environment variables: WORKER_ID, TOKEN, SERVER_URL');
  process.exit(1);
}

// Worker state
let ws = null;
let authenticated = false;
let reconnectTimeout = null;
let metricsInterval = null;
let workInterval = null;
let tasksCompleted = 0;
let startTime = Date.now();

// Simulate system metrics
function getSystemMetrics() {
  // Simulate memory usage (4-8 GB)
  const memory = Math.floor(4000 + Math.random() * 4000);
  
  // Simulate CPU usage (20-80%)
  const cpu = Math.floor(20 + Math.random() * 60);
  
  // Calculate rate based on tasks completed
  const elapsedMinutes = (Date.now() - startTime) / 60000;
  const rate = elapsedMinutes > 0 ? Math.floor(tasksCompleted / elapsedMinutes) : 0;
  
  return { memory, cpu, rate };
}

// Send metrics to server
function sendMetrics() {
  if (!ws || ws.readyState !== WebSocket.OPEN || !authenticated) {
    return;
  }

  const metrics = getSystemMetrics();
  const message = {
    type: 'metrics',
    memory: metrics.memory,
    cpu: metrics.cpu,
    rate: metrics.rate
  };

  console.log(`[${new Date().toISOString()}] Sending metrics:`, message);
  ws.send(JSON.stringify(message));
}

// Perform expensive work (simulate task processing)
async function doWork() {
  if (!authenticated) {
    return;
  }

  const workDuration = DEFAULT_WORK_INTERVAL;
  console.log(`[${new Date().toISOString()}] Starting work (${workDuration}ms)...`);
  
  // Simulate expensive work by sleeping
  await new Promise(resolve => setTimeout(resolve, workDuration));
  
  tasksCompleted++;
  console.log(`[${new Date().toISOString()}] Work completed. Total tasks: ${tasksCompleted}`);
}

// Connect to WebSocket
function connect() {
  console.log(`[${new Date().toISOString()}] Connecting to ${serverUrl}...`);
  
  ws = new WebSocket(serverUrl);

  ws.on('open', () => {
    console.log(`[${new Date().toISOString()}] WebSocket connected`);
    
    // Send authentication immediately
    const authMessage = {
      type: 'auth',
      worker_id: workerId,
      token: token
    };
    
    console.log(`[${new Date().toISOString()}] Sending authentication...`);
    ws.send(JSON.stringify(authMessage));
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`[${new Date().toISOString()}] Received:`, message);

      if (message.type === 'auth_ok') {
        authenticated = true;
        console.log(`[${new Date().toISOString()}] Authentication successful!`);
        console.log(`  Worker ID: ${message.worker_id}`);
        console.log(`  Name: ${message.name}`);
        console.log(`  Token expires at: ${message.token_expires_at}`);
        
        // Send first metrics immediately after auth
        setTimeout(() => {
          sendMetrics();
        }, 1000);
        
        // Start periodic metrics reporting
        metricsInterval = setInterval(() => {
          sendMetrics();
        }, DEFAULT_METRICS_INTERVAL);
        
        // Start periodic work
        workInterval = setInterval(() => {
          doWork();
        }, DEFAULT_WORK_INTERVAL);
        
      } else if (message.type === 'auth_error') {
        console.error(`[${new Date().toISOString()}] Authentication failed:`, message.message);
        console.error(`  Code: ${message.code}`);
        authenticated = false;
        ws.close();
        
      } else if (message.type === 'metrics_ack') {
        console.log(`[${new Date().toISOString()}] Metrics acknowledged`);
        
      } else if (message.type === 'metrics_error') {
        console.error(`[${new Date().toISOString()}] Metrics error:`, message.message);
        console.error(`  Code: ${message.code}`);
        
      } else if (message.type === 'token_renewal') {
        console.log(`[${new Date().toISOString()}] Token renewal received`);
        console.log(`  New token expires at: ${message.expires_at}`);
        
        // Update config with new token
        config.token = message.new_token;
        config.server_url = serverUrl;
        config.worker_id = workerId;
        writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log(`  Updated config.json with new token`);
        
        // Acknowledge renewal
        ws.send(JSON.stringify({
          type: 'token_renewal_ack',
          success: true
        }));
        
      } else if (message.type === 'revoked') {
        console.error(`[${new Date().toISOString()}] Worker has been revoked:`, message.reason);
        authenticated = false;
        ws.close();
        process.exit(1);
        
      } else if (message.type === 'error') {
        console.error(`[${new Date().toISOString()}] Error:`, message.message);
        console.error(`  Code: ${message.code}`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error parsing message:`, error.message);
    }
  });

  ws.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] WebSocket error:`, error.message);
  });

  ws.on('close', (code, reason) => {
    console.log(`[${new Date().toISOString()}] WebSocket closed (code: ${code}, reason: ${reason || 'none'})`);
    authenticated = false;
    
    // Clear intervals
    if (metricsInterval) {
      clearInterval(metricsInterval);
      metricsInterval = null;
    }
    if (workInterval) {
      clearInterval(workInterval);
      workInterval = null;
    }
    
    // Reconnect after 5 seconds
    if (code !== 1000) { // Don't reconnect on normal closure
      console.log(`[${new Date().toISOString()}] Reconnecting in 5 seconds...`);
      reconnectTimeout = setTimeout(() => {
        connect();
      }, 5000);
    }
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n[${new Date().toISOString()}] Shutting down...`);
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  if (metricsInterval) {
    clearInterval(metricsInterval);
  }
  if (workInterval) {
    clearInterval(workInterval);
  }
  if (ws) {
    ws.close();
  }
  
  process.exit(0);
});

// Start connection
console.log(`[${new Date().toISOString()}] Mock Worker Starting`);
console.log(`  Worker ID: ${workerId}`);
console.log(`  Server URL: ${serverUrl}`);
console.log(`  Work Interval: ${DEFAULT_WORK_INTERVAL}ms`);
console.log(`  Metrics Interval: ${DEFAULT_METRICS_INTERVAL}ms`);
console.log('');

connect();

