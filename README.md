# Powerlog

<!-- spell-checker:ignore () PowerLog Deno dprint sprintf -->

> A logger for Deno that sends your logs wherever you want them.

## Getting Started

First,

You need to import the module into your project.

```ts
import { PowerLog } from 'https://deno.land/x/powerlog/mod.ts';
```

Second,

You should import any built-in transports you want to use.

```ts
import {
	ConsoleTransport, // For writing to stdout or stderr.
	DiscordWebhookTransport, // For sending discord webhook messages.
	FileTransport, // For appending to a file.
	TcpTransport, // For sending logs over a tcp connection or unix sock.
	WriterTransport, // For writing to an async writer (an object that has .write).
} from 'https://deno.land/x/powerlog/mod.ts';
```

Third,

You need a log levels enumerable.

```ts
enum MyLogLevel {
	debug,
	info,
	success,
	alert,
	warn,
	critical,
}
```

Fourth,

You need to create a new powerlog instance.

```ts
const myLogger = Powerlog.get({ levels: MyLogLevel, name: 'My Logger' });
```

Fifth,

You can now also create the transports you wish to use.

```ts
const myStdoutTransport = new ConsoleTransport({ levels: MyLogLevel });
```

```ts
const myFileTransport = new FileTransport({ levels: MyLogLevel, filename: 'my.log' });
```

Sixth,

Add the transports to your logger.

```ts
await myLogger.use(myStdoutTransport, myFileTransport);
```

Seventh,

You can now use any of the properties in `MyLogLevel` as logging methods.

```ts
myLogger.debug('Hello World');
```

Lastly but not least,

When you're done with the logger always remember to dispose of its transports.

```ts
await myLogger.dispose();
```

## Formatting

When creating transports you will have the ability to add formatting to your messages, however, not all transports have that ability. The `WriterTransport` object does not have formatting capabilities. It does however have methods `<WriterTransport>.dataToByteArray` and `<WriterTransport>.dataToString`. You can extend the `WriterTransport` and modify those.

### Default Formatting

The default formatting applies to `FormatTransportBase`, `FileTransport`, `ConsoleTransport` and `TcpTransport`.

You can, with either of these constructors, add a formatting property which is a function that returns either a `string` or a `Uint8Array`, it can be both synchronous and asynchronous.

**Example**:

<!-- dprint-ignore-start -->

```ts
const transport = new ConsoleTransport({
  formatter: (data) =>
    `[${data.timestamp.toJSON()}] (${data.name}) ${MyLogLevel[data.level]} ${sprintf(data.message, ...data.arguments)}`
  });
```

<!-- dprint-ignore-stop -->

You can also change the formatter later on with the use `<FormatTransportBase>.format(formatter)`.

**Example**:

```ts
transport.format((data) => `${MyLogLevel[data.level]} ${sprintf(data.message, ...data.arguments)}`);
```

You can also apply a default format on the powerlog instance the same way as above. When adding transports with no formatters to a powerlog instance with a default formatter the powerlog instance will try to apply the default formatter onto the transports on initialization.

**Example**:

<!-- dprint-ignore-start -->

```ts
const myLogger = new Powerlog({
  levels: MyLogLevel,
  name: 'My Logger',
  formatter: (data) =>
    `[${data.timestamp.toJSON()}] (${data.name}) ${MyLogLevel[data.level]} ${sprintf(data.message, ...data.arguments)}`
  });
```

<!-- dprint-ignore-stop -->

You can then also later change the default formatter by using `<Powerlog>.format(formatter)`.

**Note** that this will not replace the previous default formatters applied to the already existing transports. It will only be applied to new transports.

**Example**:

```ts
myLogger.format((data) => `${MyLogLevel[data.level]} ${sprintf(data.message, ...data.arguments)}`);
```

### Discord Formatting

The discord transport uses its own formatter specification. The formatter function is expected to return a discord message object.

```ts
import type { IDiscordMessage } from 'https://deno.land/x/powerlog/mod.ts';
import { DiscordWebhookTransport } from 'https://deno.land/x/powerlog/mod.ts';
```

**Example**:

<!-- dprint-ignore-start -->

```ts
const myDiscordWebhookTransport = new DiscordWebhookTransport({
  levels: MyLogLevel,
  url: 'webhook url',
  formatter: (data) => ({
    content: null,
    embeds: [{
      title: MyLogLevel[data.level],
      description: sprintf(data.message, ...data.arguments),
      timestamp: data.timestamp.toJSON()
      }]
    })
  });
```
<!-- dprint-ignore-stop -->

Again, this can later be changed using `<DiscordWebhookTransport>.format(formatter)`.
