// spell-checker:ignore () sprintf trac dbug Deno

import * as PowerLog from '../lib/Log.ts';

import ConsoleTransport from '../lib/transport/ConsoleTransport.ts';
import FileTransport from '../lib/transport/FileTransport.ts';
import WriterTransport from '../lib/transport/WriterTransport.ts';

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
	// new ConsoleTransport({
	// 	levels: PowerLog.LogLevels.$default,
	// 	formatter: PowerLog.colorFormatter,
	// 	std: 'err',
	// 	// enabled: [defaultLogLevel.critical],
	// }),
	// Create a file transport.
	new FileTransport({ levels: PowerLog.LogLevels.$default, filename: 'myLogs.log' }),
);

if (TcpConnection) {
	await logger.use(
		new WriterTransport({
			levels: PowerLog
				.LogLevels
				.$default,
			stream: TcpConnection,
			close: true,
			formatter: PowerLog.colorFormatter,
		}),
	);
}

logger.resume();

// Log some stuff.
logger
	.log('notice', 'log/notice "Hello"')
	.trace('o = %j', { _: 1 })
	.log('trace', 'log/trace', { _: 1 })
	.debug('debug/Hello %s', 'World')
	.info('info/Hello %s', 'World')
	.notice('notice/Hello %s', 'World')
	.warn('warn/Hello %s', 'World')
	.error('error/Hello %s', 'World')
	.critical('critical/Hello %s', 'World');
