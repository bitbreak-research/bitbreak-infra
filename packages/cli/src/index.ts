#!/usr/bin/env node

// Declare __dirname for TypeScript (available in CommonJS runtime)
declare const __dirname: string;

import chalk from 'chalk';
import ora from 'ora';
import { select } from '@inquirer/prompts';
import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { startDashboard } from './dashboard';
import { checkApiAvailability, fetchRecipientAddresses, createRecipientAddress } from './dashboard/api-client';
import { mergeConfig } from './dashboard/config';
import { input } from '@inquirer/prompts';
import { realpathSync } from 'fs';

// Primary brand color
const primaryColor = chalk.blue;

/**
 * Get the directory where the CLI script is located (resolving symlinks)
 * This works by finding where the actual CLI package is located, not where it's run from
 */
function getCliScriptDir(): string {
  // In CommonJS (which this project uses), __dirname is available
  // __dirname points to the dist/ directory where index.js is located
  // We need to resolve any symlinks to get the actual package location
  try {
    // __dirname is available in CommonJS runtime (declared at top of file)
    const dir = __dirname || dirname(process.argv[1]);
    // Resolve symlinks to get the actual directory (important when linked via pnpm)
    return realpathSync(dir);
  } catch {
    // Fallback: use process.argv[1] and resolve it
    const scriptPath = process.argv[1];
    if (scriptPath) {
      try {
        return dirname(realpathSync(scriptPath));
      } catch {
        return dirname(scriptPath);
      }
    }
    return process.cwd();
  }
}

/**
 * Find the monorepo root directory by looking for pnpm-workspace.yaml or root package.json
 * Starts from the CLI script location (the actual package directory), ensuring we find
 * the repo regardless of where the command is run from
 */
function findMonorepoRoot(): string {
  // Start from the CLI script directory (where the linked package is)
  // This ensures we find the repo regardless of where the command is run from
  const scriptDir = getCliScriptDir();
  
  // Debug output (only in DEBUG mode)
  if (process.env.DEBUG) {
    console.log(`[DEBUG] CLI script directory: ${scriptDir}`);
    console.log(`[DEBUG] Current working directory: ${process.cwd()}`);
  }
  
  let currentDir = scriptDir;
  const root = resolve('/');

  // Walk up from the script directory to find the monorepo root
  // The script is in packages/cli/dist/, so we need to go up 3 levels to get to repo root
  while (currentDir !== root) {
    if (
      existsSync(join(currentDir, 'pnpm-workspace.yaml')) ||
      (existsSync(join(currentDir, 'package.json')) &&
        existsSync(join(currentDir, 'packages')))
    ) {
      return currentDir;
    }
    currentDir = resolve(currentDir, '..');
  }

  // If not found from script dir, try from current working directory as fallback
  currentDir = process.cwd();
  while (currentDir !== root) {
    if (
      existsSync(join(currentDir, 'pnpm-workspace.yaml')) ||
      (existsSync(join(currentDir, 'package.json')) &&
        existsSync(join(currentDir, 'packages')))
    ) {
      return currentDir;
    }
    currentDir = resolve(currentDir, '..');
  }

  // Fallback to current directory if root not found
  return process.cwd();
}

async function showGreeting() {
  const spinner = ora({
    text: primaryColor('Welcome to BB-lite'),
    spinner: 'dots',
  }).start();

  // Simulate a cool loading animation
  await new Promise((resolve) => setTimeout(resolve, 1000));

  spinner.succeed(primaryColor.bold('Welcome to BB-lite!'));

  // Show a cool ASCII art or animated text
  const welcomeText = `
${primaryColor.bold('╔═══════════════════════════════════════╗')}
${primaryColor.bold('║')}   ${chalk.bold.white('BB-lite CLI')}   ${primaryColor.bold('║')}
${primaryColor.bold('╚═══════════════════════════════════════╝')}
  `;

  console.log(welcomeText);
}

async function askStartTerminal() {
  const answer = await select({
    message: primaryColor.bold('BB-lite Terminal'),
    theme: {
      style: {
        answer: (text: string) => primaryColor.bold(text),
        highlight: (text: string) => primaryColor.bold(text),
      },
    },
    choices: [
      {
        name: 'Start Terminal',
        value: 'start',
        description: chalk.gray('Build and start BB-lite services with dashboard'),
      },
    ],
  });

  return answer;
}

function executeCommand(command: string, cwd: string, silent: boolean = true): void {
  try {
    if (silent) {
      execSync(command, { stdio: 'ignore', cwd });
    } else {
      execSync(command, { stdio: 'inherit', cwd });
    }
  } catch (error) {
    throw new Error(`Failed to execute command: ${command}`);
  }
}

function directoryExists(path: string): boolean {
  return existsSync(path);
}

async function ensureDependenciesInstalled(rootDir: string): Promise<void> {
  if (!directoryExists(join(rootDir, 'node_modules'))) {
    const spinner = ora({
      text: primaryColor('Installing dependencies...'),
      spinner: 'dots'
    }).start();

    try {
      executeCommand('pnpm install', rootDir, true);
      spinner.succeed(primaryColor('Dependencies installed!'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to install dependencies'));
      throw error;
    }
  } else {
    console.log(chalk.gray('Dependencies already installed. Skipping installation...'));
  }
}

async function startWithUI() {
  const rootDir = findMonorepoRoot();

  await ensureDependenciesInstalled(rootDir);

  // Check if build outputs exist
  const buildOutputsExist =
    directoryExists(join(rootDir, 'packages/btc-node/dist')) ||
    directoryExists(join(rootDir, 'packages/master/prisma/client')) ||
    directoryExists(join(rootDir, 'packages/ui/.next')) ||
    directoryExists(join(rootDir, 'packages/worker/dist'));

  if (!buildOutputsExist) {
    const spinner = ora({
      text: primaryColor('Cleaning...'),
      spinner: 'dots',
    }).start();

    try {
      executeCommand('pnpm clean', rootDir, true);
      spinner.succeed(primaryColor('Clean completed!'));

      const buildSpinner = ora({
        text: primaryColor('Building...'),
        spinner: 'dots',
      }).start();

      executeCommand('pnpm build', rootDir, true);
      buildSpinner.succeed(primaryColor('Build completed!'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to clean/build'));
      throw error;
    }
  } else {
    console.log(chalk.gray('Build outputs already exist. Skipping clean and build...'));
  }

  // Start services
  console.log(primaryColor.bold('\nStarting services...'));
  console.log('');
  console.log(primaryColor('Services available at:'));
  console.log(`   Backend API:     ${chalk.cyan('http://localhost:3000')}`);
  console.log(`   API Docs:        ${chalk.cyan('http://localhost:3000/docs')}`);
  console.log(`   UI:              ${chalk.cyan('http://localhost:3001')}`);
  console.log('');

  // Start services (this will run in the foreground)
  // Use spawn for long-running process to properly handle signals (Ctrl-C)
  const startProcess = spawn('pnpm', ['start'], {
    cwd: rootDir,
    stdio: 'ignore',
    shell: false,
  });

  let isExiting = false;

  // Handle SIGINT (Ctrl-C) - exit immediately
  const handleExit = (signal: string) => {
    if (isExiting) {
      return; // Prevent multiple exit attempts
    }
    isExiting = true;

    console.log(chalk.yellow('\n\nStopping services...'));

    // Kill the spawned process
    if (startProcess && !startProcess.killed) {
      startProcess.kill(signal as NodeJS.Signals);
    }

    // Exit immediately after a short delay to allow cleanup
    setTimeout(() => {
      process.exit(0);
    }, 500);
  };

  // Forward SIGINT (Ctrl-C) to exit handler
  process.on('SIGINT', () => {
    handleExit('SIGINT');
  });

  // Forward SIGTERM to exit handler
  process.on('SIGTERM', () => {
    handleExit('SIGTERM');
  });

  // Wait for the process to exit naturally
  startProcess.on('exit', (code, signal) => {
    if (!isExiting) {
      if (signal === 'SIGINT' || signal === 'SIGTERM') {
        console.log(chalk.yellow('\n\nServices stopped.'));
        process.exit(0);
      } else if (code !== null && code !== 0) {
        console.error(chalk.red(`\n\nServices exited with code ${code}`));
        process.exit(code);
      } else {
        process.exit(0);
      }
    }
  });

  startProcess.on('error', (error) => {
    console.error(chalk.red('\n\nFailed to start services:'), error);
    process.exit(1);
  });
}

function startCliBackgroundServices(rootDir: string): () => void {
  const childProcesses: ReturnType<typeof spawn>[] = [];

  // Debug: Show which directory services will start from
  console.log(chalk.gray(`\nMonorepo root: ${rootDir}`));

  const spawnService = (name: string, args: string[]) => {
    console.log(chalk.gray(`  Starting ${name}: pnpm ${args.join(' ')} (cwd: ${rootDir})`));
    
    const child = spawn('pnpm', args, {
      cwd: rootDir,
      stdio: 'pipe', // Capture output for debugging
      shell: true,  // Use shell to ensure pnpm is found via PATH
      env: { ...process.env }  // Pass current environment
    });

    // Capture stdout for debugging
    child.stdout?.on('data', (data) => {
      const output = data.toString().trim();
      if (output && process.env.DEBUG) {
        console.log(chalk.gray(`[${name}] ${output}`));
      }
    });

    // Capture stderr for debugging startup issues
    child.stderr?.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.error(chalk.red(`[${name}] ${output}`));
      }
    });

    child.on('error', (error) => {
      console.error(chalk.red(`\nFailed to start ${name}:`), error);
    });

    child.on('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        console.error(chalk.red(`\n${name} exited with code ${code}`));
      } else if (signal) {
        console.warn(chalk.yellow(`\n${name} stopped (signal: ${signal})`));
      }
    });

    childProcesses.push(child);
  };

  console.log(primaryColor.bold('\nStarting background services...'));
  spawnService('Backend API', ['--filter', '@bb/master', 'start']);
  spawnService('BTC node', ['--filter', '@bb/btc-node', 'start']);
  console.log(chalk.gray('\nBackground services launching:'));
  console.log(`  Backend API: ${chalk.cyan('http://localhost:3000')}`);
  console.log(`  BTC node:    ${chalk.cyan('Running (check /btc-node-progress)')}`);
  console.log('');

  let stopped = false;
  return () => {
    if (stopped) {
      return;
    }
    stopped = true;
    childProcesses.forEach((proc) => {
      if (proc && !proc.killed) {
        proc.kill('SIGTERM');
      }
    });
    console.log(chalk.gray('\nBackground services stopped.'));
  };
}

// Helper function to check if an error is a cancellation/exit error
function isCancellationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const errorName = 'name' in error ? (error as { name: string }).name : '';
  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    'isCanceled' in error ||
    errorName === 'ExitPromptError' ||
    errorMessage.includes('User force closed') ||
    errorMessage.includes('cancelled')
  );
}


async function startFullyCLI() {
  const rootDir = findMonorepoRoot();
  
  // Always show resolved monorepo root for debugging
  console.log(chalk.cyan(`\n📁 Monorepo root: ${rootDir}`));
  
  // Verify the directory exists and has the expected structure
  if (!existsSync(rootDir)) {
    console.error(chalk.red(`\n❌ Error: Monorepo root directory does not exist: ${rootDir}`));
    process.exit(1);
  }
  
  if (!existsSync(join(rootDir, 'packages/master'))) {
    console.error(chalk.red(`\n❌ Error: packages/master not found in ${rootDir}`));
    console.error(chalk.yellow('The CLI may be linked to a non-existent or incorrect directory.'));
    console.error(chalk.yellow('Try relinking: cd <repo-path>/packages/cli && pnpm run link'));
    process.exit(1);
  }
  
  // Check if services are built
  const masterDistExists = existsSync(join(rootDir, 'packages/master/node_modules/.prisma'));
  const btcNodeDistExists = existsSync(join(rootDir, 'packages/btc-node/dist'));
  
  if (!masterDistExists || !btcNodeDistExists) {
    console.log(chalk.yellow('\n⚠️  Build artifacts not found. Building project...'));
    try {
      execSync('pnpm build', { cwd: rootDir, stdio: 'inherit' });
      console.log(chalk.green('✓ Build completed'));
    } catch (error) {
      console.error(chalk.red('❌ Build failed'));
      process.exit(1);
    }
  }

  let cleanupServices: (() => void) | null = null;
  let isStopping = false;

  const handleSigInt = () => {
    if (isStopping) {
      return;
    }
    isStopping = true;
    cleanupServices?.();
    console.log(chalk.gray('\n\nGoodbye!'));
    process.exit(0);
  };

  process.once('exit', () => {
    cleanupServices?.();
  });

  process.on('SIGINT', handleSigInt);

  try {
    cleanupServices = startCliBackgroundServices(rootDir);
    
    // Wait for services to start (5 seconds)
    console.log(chalk.gray('\n⏳ Waiting for services to start...'));
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check for recipient addresses before starting dashboard
    const config = mergeConfig({});
    console.log(chalk.gray(`🔍 Checking API availability at http://${config.apiHost}:${config.apiPort}...`));
    const apiReady = await checkApiAvailability(config);
    
    if (!apiReady) {
      console.error(chalk.red(`\n❌ API is not reachable at http://${config.apiHost}:${config.apiPort}`));
      console.error(chalk.yellow('Possible causes:'));
      console.error(chalk.yellow('  - Services failed to start (check for errors above)'));
      console.error(chalk.yellow('  - Port 3000 is already in use'));
      console.error(chalk.yellow('  - Missing .env file in packages/master/'));
      console.error(chalk.yellow(`\nMonorepo root: ${rootDir}`));
      cleanupServices?.();
      process.exit(1);
    }
    
    console.log(chalk.green('✓ API is ready'));
    
    // API is ready, check for recipient addresses
    const recipientSpinner = ora({
      text: primaryColor('Checking recipient addresses...'),
      spinner: 'dots',
    }).start();
    
    const recipientsResponse = await fetchRecipientAddresses(config);
    recipientSpinner.stop();
    
    if (!recipientsResponse || recipientsResponse.meta.totalCount === 0) {
      console.log(chalk.yellow('\n⚠️  No recipient address found.'));
      console.log(chalk.gray('A recipient address is required to receive funds from compromised wallets.\n'));
      
      const recipientAddress = await input({
        message: primaryColor.bold('Enter recipient Bitcoin address'),
        validate: (value) => {
          const trimmed = value.trim();
          if (!trimmed) {
            return 'Recipient address cannot be empty';
          }
          // Basic Bitcoin address validation
          // Legacy addresses (P2PKH): start with 1, 26-35 chars
          // P2SH addresses: start with 3, 26-35 chars
          // Bech32 addresses: start with bc1 (mainnet) or tb1 (testnet), 14-74 chars
          // Taproot addresses: start with bc1p (mainnet) or tb1p (testnet), 62 chars
          const legacyRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
          const bech32Regex = /^(bc1|tb1)[a-z0-9]{13,72}$/;
          const taprootRegex = /^(bc1p|tb1p)[a-z0-9]{58}$/;
          
          if (!legacyRegex.test(trimmed) && !bech32Regex.test(trimmed) && !taprootRegex.test(trimmed)) {
            return 'Please enter a valid Bitcoin address (starts with 1, 3, bc1, or tb1)';
          }
          return true;
        }
      });
      
      const createSpinner = ora({
        text: primaryColor('Creating recipient address...'),
        spinner: 'dots',
      }).start();
      
      const created = await createRecipientAddress(config, recipientAddress.trim(), true);
      
      if (created) {
        createSpinner.succeed(chalk.green(`Recipient address created: ${created.address.substring(0, 16)}...`));
      } else {
        createSpinner.fail(chalk.red('Failed to create recipient address'));
        console.log(chalk.yellow('\nYou can set up a recipient address later via the API or dashboard.'));
      }
      console.log('');
    }
    
    await startDashboard();
  } catch (error) {
    if (isCancellationError(error)) {
      console.log(chalk.gray('\nGoodbye!'));
      process.exit(0);
    } else {
      console.error(chalk.red('\nAn error occurred:'), error);
      cleanupServices?.();
      process.exit(1);
    }
  } finally {
    cleanupServices?.();
    process.removeListener('SIGINT', handleSigInt);
  }
}

async function main() {
  // Set up graceful Ctrl-C handling at the top level
  const handleSigInt = () => {
    console.log(chalk.gray('\n\nGoodbye!'));
    process.exit(0);
  };

  process.on('SIGINT', handleSigInt);

  try {
    // Show greeting
    await showGreeting();

    // Ask for start terminal
    const startMode = await askStartTerminal();

    // Handle the selected mode
    if (startMode === 'start') {
      await startFullyCLI();
    }
  } catch (error) {
    if (isCancellationError(error)) {
      console.log(chalk.gray('\nGoodbye!'));
      process.exit(0);
    } else {
      console.error(chalk.red('\nAn error occurred:'), error);
      process.exit(1);
    }
  } finally {
    process.removeListener('SIGINT', handleSigInt);
  }
}

main();
