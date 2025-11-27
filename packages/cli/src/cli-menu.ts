import chalk from 'chalk';
import ora from 'ora';
import { input, select } from '@inquirer/prompts';
import { spawn } from 'child_process';
import { join } from 'path';
import { DashboardConfig } from './dashboard/types';
import {
  checkApiAvailability,
  fetchWorkers,
  fetchLogs,
  FetchLogsOptions,
  LogEntry
} from './dashboard/api-client';
import { mergeConfig, formatApiBase } from './dashboard/config';
import { connectToWeb, stopWebConnectServer } from './utils/web-connect';
import { getApiKey } from './utils/config-storage';

const primaryColor = chalk.blue;

// Reset terminal to ensure proper state for @inquirer/prompts
// Blessed may leave terminal in application cursor key mode which causes
// arrow keys to be interpreted incorrectly
function resetTerminal() {
  if (process.stdout.isTTY) {
    // Reset cursor keys to normal mode (not application mode)
    process.stdout.write('\x1b[?1l'); // DECCKM off - cursor keys normal mode
    // Reset keypad to normal mode
    process.stdout.write('\x1b[>1l'); // Reset keypad to normal
    // Show cursor
    process.stdout.write('\x1b[?25h');
    // Reset colors
    process.stdout.write('\x1b[0m');
  }
}

interface MenuState {
  config: DashboardConfig;
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

// Helper function to handle cancellation errors gracefully
function handleCancellationError(error: unknown): never {
  console.log(chalk.gray('\nGoodbye!'));
  process.exit(0);
}

async function showMainMenu(state: MenuState): Promise<void> {
  // Reset terminal before showing menu to ensure proper key handling
  resetTerminal();

  try {
    const choice = await select({
      message: primaryColor.bold('BB-lite CLI Menu'),
      choices: [
        {
          name: 'Dashboard',
          value: 'dashboard',
          description: chalk.gray('View real-time monitoring dashboard')
        },
        {
          name: 'Logs',
          value: 'logs',
          description: chalk.gray('View master server logs')
        },
        {
          name: 'Settings',
          value: 'settings',
          description: chalk.gray('Configure API connection settings')
        },
        {
          name: 'Exit',
          value: 'exit',
          description: chalk.gray('Exit the CLI')
        }
      ]
    });

    switch (choice) {
      case 'dashboard':
        await handleDashboard(state);
        break;
      case 'settings':
        await handleSettings(state);
        break;
      case 'logs':
        await handleLogs(state);
        break;
      case 'exit':
        console.log(chalk.gray('\nGoodbye!'));
        process.exit(0);
    }

    // Return to menu after handling the choice
    await showMainMenu(state);
  } catch (error) {
    // Handle Ctrl-C cancellation gracefully
    if (isCancellationError(error)) {
      handleCancellationError(error);
    }
    // Re-throw other errors
    throw error;
  }
}

async function handleDashboard(state: MenuState): Promise<void> {
  const spinner = ora(chalk.cyan('Connecting to API...')).start();

  const apiReady = await checkApiAvailability(state.config);
  if (!apiReady) {
    spinner.fail(chalk.red(`API unavailable at ${formatApiBase(state.config)}`));
    console.log(chalk.yellow('\nPlease check your API connection or update settings.'));
    return;
  }

  spinner.succeed(chalk.green(`API connected (${formatApiBase(state.config)})`));

  // Run the dashboard in a separate process so that blessed
  // can manage the terminal without interfering with @inquirer/prompts.
  const dashboardEntry = join(__dirname, 'dashboard', 'cli-entry.js');

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [dashboardEntry], {
        stdio: 'inherit',
        env: {
          ...process.env,
          // Pass current dashboard configuration to the child process
          BB_DASH_CONFIG: JSON.stringify(state.config)
        }
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('exit', (code, signal) => {
        // Reset terminal modes after dashboard exits
        // This ensures @inquirer/prompts works correctly
        resetTerminal();

        if (signal === 'SIGINT' || signal === 'SIGTERM' || code === 0) {
          resolve();
        } else {
          reject(new Error(`Dashboard exited with code ${code ?? 'null'}${signal ? ` (signal: ${signal})` : ''}`));
        }
      });
    });
  } catch (error) {
    console.error(chalk.red(`\nDashboard error: ${(error as Error).message}`));
  }
}

async function handleLogs(state: MenuState): Promise<void> {
  try {
    const spinner = ora(chalk.cyan('Checking API connection...')).start();
    const apiReady = await checkApiAvailability(state.config);
    if (!apiReady) {
      spinner.fail(chalk.red(`API unavailable at ${formatApiBase(state.config)}`));
      console.log(chalk.yellow('\nPlease check your API connection or update settings.'));
      return;
    }

    spinner.succeed(chalk.green('API connected'));

    const logAction = await select({
      message: primaryColor.bold('Logs Options'),
      choices: [
        {
          name: 'View Recent Logs',
          value: 'recent',
          description: chalk.gray('View most recent logs (default: 20 entries)')
        },
        {
          name: 'Filter by Level',
          value: 'level',
          description: chalk.gray('Filter logs by level (error, warn, info, debug)')
        },
        {
          name: 'Filter by Engine',
          value: 'engine',
          description: chalk.gray('Filter logs by engine ID')
        },
        {
          name: 'Search by Message',
          value: 'search',
          description: chalk.gray('Search logs by message content')
        },
        {
          name: 'Back to Menu',
          value: 'back',
          description: chalk.gray('Return to main menu')
        }
      ]
    });

    if (logAction === 'back') {
      return;
    }

    const logsOptions: FetchLogsOptions = {
      page: 1,
      limit: 20,
      orderBy: 'createdAt',
      order: 'desc'
    };

    if (logAction === 'level') {
      const level = await select({
        message: primaryColor.bold('Select Log Level'),
        choices: [
          { name: 'Error', value: 'error' },
          { name: 'Warn', value: 'warn' },
          { name: 'Info', value: 'info' },
          { name: 'Debug', value: 'debug' }
        ]
      });
      logsOptions.level = level;
    } else if (logAction === 'engine') {
      const workers = await fetchWorkers(state.config);
      if (workers.length === 0) {
        console.log(chalk.yellow('\nNo engine available.'));
        return;
      }
      const engineChoices = workers.map((worker) => ({
        name: `Engine ${worker.id.substring(0, 8)}...`,
        value: worker.id
      }));
      engineChoices.push({ name: 'Back', value: 'back' });

      const selectedEngine = await select({
        message: primaryColor.bold('Select Engine'),
        choices: engineChoices
      });

      if (selectedEngine === 'back') {
        return;
      }
      logsOptions.workerId = selectedEngine;
    } else if (logAction === 'search') {
      const searchTerm = await input({
        message: primaryColor.bold('Search Message'),
        validate: (value) => (value.trim() === '' ? 'Search term cannot be empty' : true)
      });
      logsOptions.message = searchTerm.trim();
    }

    await paginateLogs(state, logsOptions);
  } catch (error) {
    if (isCancellationError(error)) {
      handleCancellationError(error);
    }
    throw error;
  }
}

async function paginateLogs(state: MenuState, baseOptions: FetchLogsOptions): Promise<void> {
  const options: FetchLogsOptions = { ...baseOptions };

  while (true) {
    const response = await fetchAndDisplayLogs(state, options);

    const navigationChoices = [
      {
        name: 'Back to Menu',
        value: 'back',
        description: chalk.gray('Return to the main menu')
      }
    ];

    if (!response.meta.isLastPage) {
      navigationChoices.unshift({
        name: 'Next page',
        value: 'next',
        description: chalk.gray('View the next batch of logs')
      });
    }

    const navigationAction = await select({
      message: primaryColor.bold('Log navigation'),
      choices: navigationChoices
    });

    if (navigationAction === 'next') {
      options.page = (options.page ?? 1) + 1;
      continue;
    }

    break;
  }
}

async function fetchAndDisplayLogs(state: MenuState, options: FetchLogsOptions) {
  const logsSpinner = ora(chalk.cyan('Fetching logs...')).start();
  try {
    const response = await fetchLogs(state.config, options);
    logsSpinner.succeed(chalk.green(`Fetched ${response.data.length} log entries`));

    if (response.data.length === 0) {
      console.log(chalk.yellow('\nNo logs found matching your criteria.'));
      console.log('');
      return response;
    }

    response.data.forEach(displayLogEntry);
    const limit = options.limit ?? 20;
    const totalPages = Math.max(1, Math.ceil(response.meta.totalCount / limit));
    console.log(chalk.gray(`\nPage ${response.meta.currentPage} of ${totalPages}`));
    console.log(chalk.gray(`Total logs: ${response.meta.totalCount}`));
    console.log('');
    return response;
  } catch (error) {
    logsSpinner.fail(chalk.red(`Failed to fetch logs: ${(error as Error).message}`));
    console.log('');
    throw error;
  }
}

async function handleConnectWeb(): Promise<void> {
  let spinner: ReturnType<typeof ora> | null = null;
  try {
    spinner = ora(chalk.cyan('Starting web connection...')).start();
    // Check if API key already exists
    const existingApiKey = getApiKey();
    const hadApiKeyBefore = !!existingApiKey;

    // Start the connection process - this will open the browser
    const connectPromise = connectToWeb();

    spinner.succeed(chalk.green('Browser opened! Please click the connect button on the website.'));
    console.log(chalk.yellow('\nWaiting for API key from website...'));
    console.log(chalk.gray('Press Ctrl+C to cancel.\n'));

    // Wait for the API key to be received (with timeout)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Timeout waiting for API key'));
      }, 5 * 60 * 1000); // 5 minutes timeout
    });

    try {
      const apiKey = await Promise.race([connectPromise, timeoutPromise]);
      stopWebConnectServer();
      console.log(chalk.green(`\n✅ API key ${hadApiKeyBefore ? 'updated' : 'saved'} successfully!`));
      console.log(chalk.gray(`API Key: ${apiKey.substring(0, 8)}...`));
      console.log('');
    } catch (error) {
      stopWebConnectServer();
      if ((error as Error).message === 'Timeout waiting for API key') {
        console.log(chalk.yellow('\n⏱️  Timeout waiting for API key. You can try again later.'));
      } else {
        throw error;
      }
      console.log('');
    }
  } catch (error) {
    stopWebConnectServer();
    if (isCancellationError(error)) {
      handleCancellationError(error);
    }
    if (spinner) {
      spinner.fail(chalk.red(`Failed to start web connection: ${(error as Error).message}`));
    } else {
      console.error(chalk.red(`Failed to start web connection: ${(error as Error).message}`));
    }
    console.log('');
  }
}

function displayLogEntry(log: LogEntry) {
  const levelColors: Record<string, (text: string) => string> = {
    error: chalk.red,
    warn: chalk.yellow,
    info: chalk.blue,
    debug: chalk.gray
  };

  const levelColor = levelColors[log.level.toLowerCase()] || chalk.white;
  const timestamp = new Date(log.createdAt).toLocaleString();
  const workerInfo = log.workerId ? chalk.gray(` [Worker: ${log.workerId.substring(0, 8)}...]`) : '';

  console.log(
    `${levelColor(`[${log.level.toUpperCase()}]`)} ${chalk.gray(timestamp)}${workerInfo} ${log.message}`
  );
}

async function handleSettings(state: MenuState): Promise<void> {
  try {
    console.log(chalk.cyan('\nCurrent Settings:'));
    console.log(chalk.gray(`  API Host: ${state.config.apiHost}`));
    console.log(chalk.gray(`  API Port: ${state.config.apiPort}`));
    console.log('');

    const action = await select({
      message: primaryColor.bold('Settings'),
      choices: [
        {
          name: 'Change API Host',
          value: 'host',
          description: chalk.gray(`Current: ${state.config.apiHost}`)
        },
        {
          name: 'Change API Port',
          value: 'port',
          description: chalk.gray(`Current: ${state.config.apiPort}`)
        },
        {
          name: 'Test Connection',
          value: 'test',
          description: chalk.gray('Test API connection with current settings')
        },
        {
          name: 'Back to Menu',
          value: 'back',
          description: chalk.gray('Return to main menu')
        }
      ]
    });

    if (action === 'back') {
      return;
    }

    if (action === 'host') {
      const host = await input({
        message: primaryColor.bold('API Host'),
        default: state.config.apiHost,
        validate: (value) => (value.trim() === '' ? 'Host cannot be empty' : true)
      });

      state.config.apiHost = host.trim();
      console.log(chalk.green(`API Host updated to: ${state.config.apiHost}\n`));
    }

    if (action === 'port') {
      const portInput = await input({
        message: primaryColor.bold('API Port'),
        default: state.config.apiPort.toString(),
        validate: (value) => {
          const parsed = Number(value);
          if (Number.isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
            return 'Enter a valid port number';
          }
          return true;
        }
      });

      state.config.apiPort = Number(portInput);
      console.log(chalk.green(`API Port updated to: ${state.config.apiPort}\n`));
    }

    if (action === 'test') {
      const testSpinner = ora(chalk.cyan('Testing API connection...')).start();
      const available = await checkApiAvailability(state.config);

      if (available) {
        testSpinner.succeed(chalk.green(`API connection successful at ${formatApiBase(state.config)}`));
      } else {
        testSpinner.fail(chalk.red(`API connection failed at ${formatApiBase(state.config)}`));
        console.log(chalk.yellow('Please check your settings and ensure the API is running.'));
      }
      console.log('');
    }
  } catch (error) {
    if (isCancellationError(error)) {
      handleCancellationError(error);
    }
    throw error;
  }
}

export async function startCLIMenu(): Promise<void> {
  const initialState: MenuState = {
    config: mergeConfig({})
  };

  await showMainMenu(initialState);
}

