// spell-checker:ignore () sprintf trac dbug Deno

import * as PowerLog from '../lib/Log.ts';

import ConsoleTransport from '../lib/ConsoleTransport.ts';
import FileTransport from '../lib/FileTransport.ts';
import WriterTransport from '../lib/WriterTransport.ts';

const { logger } = PowerLog;
logger.suspend();

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
		logger.warn('Unable to connect to "http://127.0.0.1:8080"');
		return undefined;
	}
})();

// Create and use transports.
await logger.use(
	// // A stdout transport.
	// new ConsoleTransport({ levels: defaultLogLevel, formatter: colorFormatter }) // Disable 'critical' and 'debug' log levels.
	// 	.disable(defaultLogLevel.critical, defaultLogLevel.debug),
	// A stderr transport.
	new ConsoleTransport({
		levels: PowerLog.defaultLogLevel,
		formatter: PowerLog.colorFormatter,
		std: 'err',
		// enabled: [defaultLogLevel.critical],
	}),
	// Create a file transport.
	new FileTransport({ levels: PowerLog.defaultLogLevel, filename: 'myLogs.log' }),
);

if (TcpConnection) {
	await logger.use(
		new WriterTransport({
			levels: PowerLog.defaultLogLevel,
			stream: TcpConnection,
			close: true,
			formatter: PowerLog.colorFormatter,
		}),
	);
}

logger.resume();

// Log some stuff.
logger
	.log('info', 'log/info Hello')
	// .trace({ TcpConnection })
	.debug('Hello %s', 'World')
	.info('Hello %s', 'World')
	.notice('Hello %s', 'World')
	.warn('Hello %s', 'World')
	.error('Hello %s', 'World')
	.critical('Hello %s', 'World');
