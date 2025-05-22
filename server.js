const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const MIME_TYPES = {
	"html": "text/html",
	"js": "application/javascript",
	"css": "text/css",
	"svg": "image/svg+xml",
};

// --------------------------------------------------------------------

async function handleEndpointStatic(req, res) {
	const filePath = req.url === "/" ? "/index.html" : req.url;
	const fullPath = path.join(PUBLIC_DIR, filePath);

	try {
		const data = await fs.readFile(fullPath);
		const ext = path.extname(fullPath).slice(1);
		const mime = MIME_TYPES[ext] || "text/plain";
		res.writeHead(200, { "Content-Type": mime });
		res.end(data);
	} catch (err) {
		res.writeHead(404);
		res.end("404 Not Found");
	}
}

function handleEndpointTrains(req, res) {
	const data = JSON.stringify([
		{ id: "train1", x: 100, y: 150 },
		{ id: "train2", x: 300, y: 200 },
	]);
	res.writeHead(200, { "Content-Type": "application/json" });
	res.end(data);
}

// --------------------------------------------------------------------

const server = http.createServer((req, res) => {
	console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
	
	if (req.url === "/api/trains") {
		handleEndpointTrains(req, res);
	} else {
		handleEndpointStatic(req, res);
	}
});

server.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
