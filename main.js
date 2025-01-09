const fs = require('fs');
const path = require('path');
const { createCanvas, registerFont, loadImage } = require('canvas');
const { World, renderWorld } = require('./src/World.js');
const { loadTextures } = require('./src/textures.js');
const config = require('./config.json')
const http = require('http');

let textures;
registerFont('cache/fonts/century_gothic_bold.ttf', { family: 'sf_century' });

async function preloadTextures() {
    console.log(`Loading Textures...`);
    textures = await loadTextures();
    console.log(`Textures loaded successfully.`);
}
preloadTextures();

const server = http.createServer((req, res) => {
    console.log(`Connection Request from: ${req.connection.remoteAddress.substring(7)} URL: ${req.url} Method: ${req.method}`);
    if (req.url.startsWith('/results/')) {
        const filename = req.url.substring(8);

        const filePath = path.join(__dirname, 'results', filename);

        if (fs.existsSync(filePath) && path.extname(filePath).toLowerCase() === '.png') {
            res.writeHead(200, { 'Content-Type': 'image/png' });

            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404');
        }
    }
    else if (req.url.startsWith('/render/')) {
        const filename = req.url.substring(8).toUpperCase();
        console.log(filename)
        const filePath = path.join(`${config.world_path}`, `${filename}_.json`);

        if (fs.existsSync(filePath)) {
            res.writeHead(200);
            let responseSent = false;

            renderWorldImage(filename, () => {
                if (!responseSent) {
                    responseSent = true;
                    res.end(`http://${config.server_ip}/results/${filename}.png`);
                }
            });
        }
        else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('World file not found');
        }
    }
    else {
        res.writeHead(200);
        res.end('Hello World');
    }
});

async function renderWorldImage(name, callback) {
    if (!textures) {
        console.log("Waiting for textures to load...");
        setTimeout(() => renderWorldImage(name, callback), 1000);
        return;
    }

    const startTime = Date.now();

    const canvas = createCanvas(3200, 1920);
    const ctx = canvas.getContext('2d');

    loadImage('cache/borders/valentines.png').then((img) => {
        ctx.drawImage(img, 0, 0, 3200, 1920);
    });

    const world = World.LoadWorld(name);
    await renderWorld(ctx, textures, world);
    
    const filePath = path.join(__dirname, 'results', `${world.name}.png`)

    const out = fs.createWriteStream(filePath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => {
        const endTime = Date.now();
        const renderingTime = endTime - startTime;
        callback();
    });
}

server.listen(80, () => {
    console.log(`Server running at http:/${config.server_ip}:80/`);
});