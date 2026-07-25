const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

const WORKSPACE_PATH = path.join(__dirname, 'workspaces');

// --- API: File Management ---
app.get('/api/files', async (req, res) => {
    const files = await fs.readdir(WORKSPACE_PATH);
    res.json(files);
});

app.post('/api/save', async (req, res) => {
    const { filename, content } = req.body;
    await fs.writeFile(path.join(WORKSPACE_PATH, filename), content);
    res.json({ success: true });
});

// --- Terminal Logic ---
io.on('connection', (socket) => {
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cwd: WORKSPACE_PATH,
        env: process.env
    });

    ptyProcess.on('data', (data) => socket.emit('terminal-output', data));
    socket.on('terminal-input', (data) => ptyProcess.write(data));
});

server.listen(3000, () => {
    if (!fs.existsSync(WORKSPACE_PATH)) fs.mkdirSync(WORKSPACE_PATH);
    console.log('AlphaPlatform running on http://localhost:3000');
});
