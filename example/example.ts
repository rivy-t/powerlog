// spell-checker:ignore () sprintf trac dbug Deno

import {
	bgBrightRed,
	blue,
	bold,
	brightBlue,
	brightCyan,
	brightMagenta,
	brightRed,
	brightWhite,
	brightYellow,
	cyan,
	dim,
	inverse,
	magenta,
	red,
	underline,
	yellow,
} from 'https://deno.land/std@0.79.0/fmt/colors.ts';
import ConsoleTransport from '../lib/transport/ConsoleTransport.ts';
import FileTransport from '../lib/transport/FileTransport.ts';
import TcpTransport from '../lib/transport/TcpTransport.ts';
import WriterTransport from '../lib/transport/WriterTransport.ts';
import { sprintf } from '../lib/deps.ts';
import { PowerLog } from '../lib/Log.ts';
import type { ILogData } from '../lib/types.ts';

// An array of colors ordered by the log levels order.
const defaultLogLevelColors = [
	yellow,
	yellow,
	brightBlue,
	cyan,
	magenta,
	red,
	(s: string) => bgBrightRed(brightWhite(s)),
];
const defaultLogLevelLabels = ['trac', 'dbug', 'info', 'Note', 'WARN', 'ERR!', 'CRIT'];
// The log levels that can be used.
enum defaultLogLevel {
	trace,
	debug,
	info,
	notice,
	warn,
	error,
	critical,
}

// Formatting help.
const _n = (n: number | string) => n.toString().padStart(2, '0');
const _c = (n: number | string) => magenta(_n(n));
const _d = dim('/');
const _t = dim(':');

// A formatter that doesn't use colors.
const noColorFormatter = (data: ILogData) =>
	`[${_n(data.timestamp.getDate())}/${
		_n(data.timestamp.getMonth() + 1)
	}/${data.timestamp.getFullYear()} ${_n(data.timestamp.getHours())}:${
		_n(data.timestamp.getMinutes())
	}:${_n(data.timestamp.getSeconds())}] ` +
	`(${data.name}) ${defaultLogLevelLabels[data.level]} ${
		sprintf(
			data.message,
			...data.arguments,
		)
	}`;

// A formatter that does use colors.
const colorFormatter = (data: ILogData) =>
	`[${_c(data.timestamp.getDate())}${_d}${_c(data.timestamp.getMonth() + 1)}${_d}${
		_c(data.timestamp.getFullYear())
	} ${_c(data.timestamp.getHours())}${_t}${_c(data.timestamp.getMinutes())}${_t}${
		_c(data.timestamp.getSeconds())
	}] ` +
	`(${bold(data.name)}) ${defaultLogLevelColors[data.level](defaultLogLevelLabels[data.level])} ${
		sprintf(data.message, ...data.arguments)
	}`;

// Create a new logger.
const myLogger = PowerLog.get<typeof defaultLogLevel>({
	levels: defaultLogLevel,
	name: 'myLogger',
	formatter: noColorFormatter,
});

myLogger.suspend();

const TcpConnection = await (async () => {
	try {
		const timeout = new Promise((_resolve, reject) => {
			setTimeout(reject, 250);
		});
		return await Promise.race([
			timeout,
			Deno.connect({ port: 8080, /* hostname: '127.0.0.1', */ transport: 'tcp' }),
		]) as any as (Deno.Writer & Deno.Closer) | undefined;
	} catch {
		myLogger.warn('Unable to connect to "http://127.0.0.1:8080"');
		return undefined;
	}
})();

// Create and use transports.
await myLogger.use(
	// // A stdout transport.
	// new ConsoleTransport({ levels: defaultLogLevel, formatter: colorFormatter }) // Disable 'critical' and 'debug' log levels.
	// 	.disable(defaultLogLevel.critical, defaultLogLevel.debug),
	// A stderr transport.
	new ConsoleTransport({
		levels: defaultLogLevel,
		formatter: colorFormatter,
		std: 'err',
		// enabled: [defaultLogLevel.critical],
	}),
	// Create a file transport.
	new FileTransport({ levels: defaultLogLevel, filename: 'myLogs.log' }),
);

if (TcpConnection) {
	await myLogger.use(
		new WriterTransport({
			levels: defaultLogLevel,
			stream: TcpConnection,
			close: true,
			formatter: colorFormatter,
		}),
	);
}

myLogger.resume();

// Log some stuff.
myLogger
	.log('info', 'log/info Hello')
	.trace('Hello %s', 'World')
	.debug('Hello %s', 'World')
	.info('Hello %s', 'World')
	.notice('Hello %s', 'World')
	.warn('Hello %s', 'World')
	.error('Hello %s', 'World')
	.critical('Hello %s', 'World');
