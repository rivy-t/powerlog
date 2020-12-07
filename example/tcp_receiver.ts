const listener = Deno.listen({
	port: 8080,
	hostname: "0.0.0.0"
});

const LF = new Uint8Array([10]);

async function handleSock(conn: Deno.Conn) {
	for await (const data of Deno.iter(conn)) {
		Deno.stdout.writeSync(data);
		Deno.stdout.writeSync(LF);
	}
}

console.log(listener.addr);

for await (const sock of listener)
	handleSock(sock);

export { };
