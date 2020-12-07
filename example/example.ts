// Imports
import type { ILogData } from "../lib/types.ts";
import { sprintf } from "../lib/deps.ts";
import {
	dim,
	bold,
	underline,
	red,
	blue,
	cyan,
	green,
	yellow,
	magenta,
} from "https://deno.land/std@0.79.0/fmt/colors.ts";
import Powerlog from "../lib/Powerlog.ts";
import StdTransport from "../lib/StdTransport.ts";
import FileTransport from "../lib/FileTransport.ts";
import TcpTransport from "../lib/TcpTransport.ts";

// An array of colors ordered by the log levels order.
const colors = [dim, blue, cyan, yellow, green, (str: string) => bold(red(str))];

// The log levels that can be used.
enum LogLevels {
	debug,
	info,
	alert,
	warn,
	success,
	critical
}

// Formatting help.
const _n = (n: number | string) => n.toString().padStart(2, "0");
const _c = (n: number | string) => magenta(_n(n));
const _d = dim("/");
const _t = dim(":");

// A formatter that doesn't use colors.
const noColorFormatter = (data: ILogData) =>
	`[${_n(data.timestamp.getDate())}/${_n(data.timestamp.getMonth() + 1)}/${data.timestamp.getFullYear()} ${_n(data.timestamp.getHours())}:${_n(data.timestamp.getMinutes())}:${_n(data.timestamp.getSeconds())}] ` +
	`(${data.name}) ${LogLevels[data.level]} ${sprintf(data.message, ...data.arguments)}`;

// A formatter that does use colors.
const colorFormatter = (data: ILogData) =>
	`[${_c(data.timestamp.getDate())}${_d}${_c(data.timestamp.getMonth() + 1)}${_d}${_c(data.timestamp.getFullYear())} ${_c(data.timestamp.getHours())}${_t}${_c(data.timestamp.getMinutes())}${_t}${_c(data.timestamp.getSeconds())}] ` +
	`(${bold(data.name)}) ${underline(colors[data.level](LogLevels[data.level].padEnd(8, " ")))} ${sprintf(data.message, ...data.arguments)}`;

// Create a new logger.
const myLogger = Powerlog.get<typeof LogLevels>({
	levels: LogLevels,
	name: "myLogger",
	formatter: noColorFormatter
});

// Create and use transports.
await myLogger.use(
	// A stdout transport.
	new StdTransport({
		levels: LogLevels,
		formatter: colorFormatter
	})
		// Disable 'critical' and 'debug' log levels.
		.disable(LogLevels.critical, LogLevels.debug),

	// A stderr transport.
	new StdTransport({
		levels: LogLevels,
		formatter: colorFormatter,
		std: "err",
		enabled: [LogLevels.critical]
	}),

	// Create a file transport.
	new FileTransport({
		levels: LogLevels,
		filename: "myLogs.log"
	}),

	// Tcp Transport
	new TcpTransport({
		levels: LogLevels,
		port: 8080,
		hostname: "0.0.0.0",
		transport: "tcp",
		close: true,
		formatter: colorFormatter
	})
);

// Log some stuff.
myLogger
	.debug("Hello %s", "World")
	.info("Hello %s", "World")
	.alert("Hello %s", "World")
	.warn("Hello %s", "World")
	.success("Hello %s", "World")
	.critical("Hello %s", "World");
