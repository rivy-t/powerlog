// Imports
import { sprintf } from '../lib/deps.ts';
import DiscordWebhookTransport from '../lib/DiscordWebhookTransport.ts';
import Powerlog from '../lib/Powerlog.ts';

enum LogLevels {
	debug,
	info,
	alert,
	warn,
	success,
	critical,
}

const colors = [undefined, 0x42A5F5, 0x26A69A, 0xFFA726, 0x66BB6A, 0xEF5350];

const logger = Powerlog.get({ levels: LogLevels, name: 'discord' });

const _capitalizeName = (str: string) =>
	str.substring(0, 1).toUpperCase() + str.substring(1, str.length);

await logger.use(
	new DiscordWebhookTransport({
		levels: LogLevels,
		url: 'webhook url',
		formatter: (data) => ({
			content: null,
			embeds: [{
				color: colors[data.level],
				title: _capitalizeName(LogLevels[data.level]),
				description: sprintf(data.message, ...data.arguments),
				timestamp: data
					.timestamp
					.toJSON(),
			}],
		}),
	}),
);

logger.onerror.subscribe(console.log);

// Log some stuff.
logger
	.debug('Hello %s', 'World')
	.info('Hello %s', 'World')
	.alert('Hello %s', 'World')
	.warn('Hello %s', 'World')
	.success('Hello %s', 'World')
	.critical('Hello %s', 'World');
