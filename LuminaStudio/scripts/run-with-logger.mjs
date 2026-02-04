import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArguments(argv) {
	const args = argv.slice(2);
	let scriptName = undefined;
	let commandAndArgs = [];
	let sawDoubleDash = false;
	for (let i = 0; i < args.length; i += 1) {
		const token = args[i];
		if (token === '--') {
			sawDoubleDash = true;
			commandAndArgs = args.slice(i + 1);
			break;
		}
		if (token.startsWith('--name=')) {
			scriptName = token.slice('--name='.length);
			continue;
		}
		if (token === '--name') {
			const next = args[i + 1];
			if (typeof next === 'string') {
				scriptName = next;
				i += 1;
				continue;
			}
		}
	}
	if (!sawDoubleDash) {
		commandAndArgs = args;
	}
	return { scriptName, commandAndArgs };
}

function resolveScriptName(explicitName) {
	const fromEnv = process.env.npm_lifecycle_event;
	const raw = explicitName || fromEnv || 'unknown';
	return sanitizeForPath(raw);
}

function sanitizeForPath(name) {
	return String(name)
		.replace(/\s+/g, '-')
		.replace(/[^a-zA-Z0-9._-]/g, '_')
		.slice(0, 100) || 'unknown';
}

function ensureDirectoryExists(dirPath) {
	try {
		fs.mkdirSync(dirPath, { recursive: true });
	} catch (error) {
		console.error('[logger] Failed to create directory:', dirPath, error);
		process.exit(1);
	}
}

function getLogFilePath(baseDir, scriptName) {
	const perScriptDir = path.join(baseDir, scriptName);
	ensureDirectoryExists(perScriptDir);
	// 使用东八区时间格式：YYYY-MM-DD_HH-mm-ss
	const now = new Date();
	const timestamp = now.toLocaleString('zh-CN', { 
		timeZone: 'Asia/Shanghai',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	}).replace(/\//g, '-').replace(/\s/g, '_').replace(/:/g, '-');
	return path.join(perScriptDir, `${timestamp}.log`);
}

function removeAnsiSequences(input) {
	if (typeof input !== 'string') return input;
	// Broad ANSI escape sequence matcher (colors, cursor moves, etc.)
	const ansiRegex = /[\u001B\u009B][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
	return input.replace(ansiRegex, '');
}

function removeZeroWidthChars(input) {
	if (typeof input !== 'string') return input;
	return input.replace(/[\u200B-\u200D\uFEFF]/g, '');
}

function normalizeNewlinesToLF(input) {
	if (typeof input !== 'string') return input;
	return input.replace(/\r\n?|\n/g, '\n');
}

function stripBom(input) {
	if (typeof input !== 'string') return input;
	return input.replace(/^\uFEFF/, '');
}

function cleanForFile(input) {
	let output = input;
	output = stripBom(output);
	output = removeAnsiSequences(output);
	output = removeZeroWidthChars(output);
	output = normalizeNewlinesToLF(output);
	return output;
}

function start() {
	const { scriptName: explicitName, commandAndArgs } = parseArguments(process.argv);
	const scriptName = resolveScriptName(explicitName);
	if (!Array.isArray(commandAndArgs) || commandAndArgs.length === 0) {
		console.error('[logger] No command specified. Usage: node scripts/run-with-logger.mjs --name <name> -- <command> [args...]');
		process.exit(1);
	}

	const baseLogDir = path.resolve(__dirname, '..', '.log');
	ensureDirectoryExists(baseLogDir);
	const logFilePath = getLogFilePath(baseLogDir, scriptName);

	let fileStream;
	try {
		fileStream = fs.createWriteStream(logFilePath, { flags: 'a', encoding: 'utf8' });
	} catch (error) {
		console.error('[logger] Failed to open log file:', logFilePath, error);
		process.exit(1);
	}

	const command = commandAndArgs[0];
	const cmdArgs = commandAndArgs.slice(1);

	const child = spawn(command, cmdArgs, {
		shell: true,
		env: process.env,
		windowsHide: false,
	});

	const forward = (chunk, toStd) => {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
		// Forward original to console for best developer UX (preserve colors)
		toStd.write(buffer);
		// Cleaned content for file
		const asString = buffer.toString('utf8');
		const cleaned = cleanForFile(asString);
		fileStream.write(cleaned);
	};

	child.stdout?.on('data', (d) => forward(d, process.stdout));
	child.stderr?.on('data', (d) => forward(d, process.stderr));

	child.on('error', (error) => {
		const message = `[logger] Failed to start command: ${command} ${cmdArgs.join(' ')}\n${String(error && error.stack || error)}`;
		console.error(message);
		try { fileStream.write(cleanForFile(`${message}\n`)); } catch {}
	});

	const terminate = (signal) => {
		if (!child.killed) {
			try { child.kill(signal); } catch {}
		}
	};

	process.on('SIGINT', () => terminate('SIGINT'));
	process.on('SIGTERM', () => terminate('SIGTERM'));
	process.on('SIGHUP', () => terminate('SIGHUP'));

	child.on('close', (code, signal) => {
		const endLine = `\n[logger] process finished: code=${code ?? 'null'} signal=${signal ?? 'null'}\n`;
		try { fileStream.write(cleanForFile(endLine)); } catch {}
		fileStream.end(() => {
			// Give a tiny grace time to flush underlying fd, then exit
			setTimeout(() => {
				if (typeof code === 'number') {
					process.exit(code);
				} else {
					// If no code (killed by signal), use non-zero to indicate abnormal termination
					process.exit(1);
				}
			}, 5);
		});
	});
}

start();
