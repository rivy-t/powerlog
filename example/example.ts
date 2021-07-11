// Imports
import {
	bgBrightRed,
	blue,
	bold,
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
import { sprintf } from '../lib/deps.ts';
import FileTransport from '../lib/FileTransport.ts';
import Powerlog from '../lib/Powerlog.ts';
import StdTransport from '../lib/StdTransport.ts';
import TcpTransport from '../lib/TcpTransport.ts';
import type { ILogData } from '../lib/types.ts';

// An array of colors ordered by the log levels order.
const colors = [
	yellow,
	yellow,
	cyan,
	brightCyan,
	magenta,
	red,
	(str: string) => bgBrightRed(brightWhite(str)),
];
const LevelNames = ['trac', 'dbug', 'info', 'note', 'WARN', 'ERR!', 'CRIT'];
// The log levels that can be used.
enum LogLevels {
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
	`(${data.name}) ${LevelNames[data.level]} ${sprintf(data.message, ...data.arguments)}`;

// A formatter that does use colors.
const colorFormatter = (data: ILogData) =>
	`[${_c(data.timestamp.getDate())}${_d}${_c(data.timestamp.getMonth() + 1)}${_d}${
		_c(data.timestamp.getFullYear())
	} ${_c(data.timestamp.getHours())}${_t}${_c(data.timestamp.getMinutes())}${_t}${
		_c(data.timestamp.getSeconds())
	}] ` +
	`(${bold(data.name)}) ${colors[data.level](LevelNames[data.level])} ${
		sprintf(
			data.message,
			...data.arguments,
		)
	}`;

// Create a new logger.
const myLogger = Powerlog.get<typeof LogLevels>({
	levels: LogLevels,
	name: 'myLogger',
	formatter: noColorFormatter,
});

const TcpConnection = await (async () => {
	try {
		return await Deno.connect({ port: 8080, /* hostname: '127.0.0.1', */ transport: 'tcp' });
	} catch {
		console.warn('Unable to connect to "http://127.0.0.1:8080"');
		return undefined;
	}
})();

// Create and use transports.
await myLogger.use(
	// // A stdout transport.
	// new StdTransport({ levels: defaultLogLevels, formatter: colorFormatter }) // Disable 'critical' and 'debug' log levels.
	// 	.disable(defaultLogLevels.critical, defaultLogLevels.debug),
	// A stderr transport.
	new StdTransport({
		levels: defaultLogLevels,
		formatter: colorFormatter,
		std: 'err',
		// enabled: [defaultLogLevels.critical],
	}),
	// Create a file transport.
	new FileTransport({ levels: defaultLogLevels, filename: 'myLogs.log' }),
);

if (TcpConnection) {
	await myLogger.use(
		new WriterTransport({
			levels: defaultLogLevels,
			stream: TcpConnection,
			close: true,
			formatter: colorFormatter,
		}),
	);
}

// Log some stuff.
myLogger
	.trace('Hello %s', 'World')
	.debug('Hello %s', 'World')
	.info('Hello %s', 'World')
	.notice('Hello %s', 'World')
	.warn('Hello %s', 'World')
	.error('Hello %s', 'World')
	.critical('Hello %s', 'World');
