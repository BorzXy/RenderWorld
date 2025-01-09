const { createCanvas, loadImage } = require('canvas');
const { GetItem, items, GetDefaultTexture } = require('./items.js');
const { GetOffset, GetFlagOffset } = require('./textures.js');
const config = require('../config.json')
const path = require("path");

class World {
    constructor() {
        this.name = "";
        this.weather = 0;
        this.blocks = [];
        this.objects = [];
    }

    static GenerateWorld(name, size) {
        const world = new World();
        world.name = name;
        let randomDelta = Math.floor(Math.random() * ((6000 / (6000 / 100)) - 4) + 2);
        for (let index = 0; index < size; index++) {
            let block = new Block();

            if (index >= 3800 && index < 5400 && !(Math.floor(Math.random() * 50)))
                block.foreground = 10;
            else if (index >= 3700 && index < 5400) {
                if (index > 5000) {
                    block.foreground = (Math.floor(Math.random() * 8) < 3) ? 4 : 2;
                }
                else {
                    block.foreground = 2;
                }
            }
            else if (index >= 5400) {
                block.foreground = 8;
            }
            if (index == 3600 + randomDelta)
                block.foreground = 6;
            if (index == 3700 + randomDelta)
                block.foreground = 8;
            if (index >= 3700)
                block.background = 14;

            world.blocks.push(block);
        }

        return world;
    }

    static LoadWorld(name) {
        const world = new World();
        const Rworld = require(`../${config.world_path}/${name}_.json`);
        world.name = name;
        world.weather = Rworld.weather;
        Rworld.blocks.forEach(block => {
            let nBlock = new Block();
            if (block === null) {
                nBlock.foreground = 0;
                nBlock.background = 0;
            }
            else {
                nBlock.foreground = block.f !== undefined ? block.f >= items.m_item_count ? 0 : block.f : 0;
                nBlock.background = block.b !== undefined ? block.b >= items.m_item_count ? 0 : block.b : 0;
                nBlock.flags = block.fl !== undefined ? block.fl : 0;
            }
            world.blocks.push(nBlock);
        })
        Rworld.drop.forEach(object => {
            let drop = {}
            if (object.i != 0) {
                drop.uid = object.u;
                drop.itemid = object.i;
                drop.count = object.c;
                drop.x = object.x;
                drop.y = object.y;
            }
            world.objects.push(drop);
        });        
        return world;
    }
}

class Block {
    constructor() {
        this.foreground = 0;
        this.background = 0;
        this.flags = 0;
    }
}

async function renderWorld(ctx, textures, world) {
    const weatherImage = textures[world.weather.toString()];
    ctx.drawImage(weatherImage, 0, 0, 3200, 1920);

    const layers = ['background', 'shadow', 'foreground'];
    for (const layer of layers) {
        for (let index = 0; index < world.blocks.length; index++) {
            const block = world.blocks[index];
            const item_id = layer === 'background' ? block.background : block.foreground;

            const item = await GetItem(item_id);
            const sprite = textures[item.m_texture];
            const x = (index % 100) * 32;
            const y = Math.floor(index / 100) * 32;

            let offset;
            if (layer === 'background' || layer === 'foreground') {
                offset = await GetOffset(world, item.m_id, index, item.m_spread_type, layer === 'background');
            } else {
                offset = { offset_x: 0, offset_y: 0 };
            }
            const { offset_x, offset_y } = offset;

            if (layer == 'background') {
                try {
                    ctx.drawImage(sprite, (item.m_texture_x + offset_x) * 32, (item.m_texture_y + offset_y) * 32, 32, 32, x, y, 32, 32)
                } catch (error) {
                    console.log(error.message + "||" + sprite);
                }
            }
            else if (layer == 'shadow') {
                {
                    const tempCanvas = createCanvas(32, 32);
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    if (block.flags & 0x00200000) {
                        tempCtx.save();
                        tempCtx.scale(-1, 1);
                        tempCtx.drawImage(sprite, (item.m_texture_x + offset_x) * 32, (item.m_texture_y + offset_y) * 32, 32, 32, -32, 0, 32, 32);
                        tempCtx.restore();
                    } else {
                        tempCtx.drawImage(sprite, (item.m_texture_x + offset_x) * 32, (item.m_texture_y + offset_y) * 32, 32, 32, 0, 0, 32, 32);
                    }

                    tempCtx.globalCompositeOperation = 'source-in';
                    tempCtx.fillStyle = 'rgba(0, 0 ,0, 0.56)';
                    tempCtx.fillRect(0, 0, 32, 32);
                    ctx.drawImage(tempCanvas, x - 4, y + 4);
                }
                {
                    if (world.objects.length > index) {
                        const tempCanvas = createCanvas(32, 32);
                        const tempCtx = tempCanvas.getContext('2d');
                        ctx.imageSmoothingEnabled = false;
                        const object = world.objects[index];

                        const item = await GetItem(object.itemid);
                        const sprite = textures[item.m_texture];
                        const x = object.x - 4;
                        const y = object.y + 4;

                        if (item.m_id % 2 == 0) {
                            let sprite_offset_x = 0;
                            let sprite_offset_y = 0;
                            const m_default_texture_x = (await GetDefaultTexture(item.m_id)).m_default_texture_x;
                            const m_default_texture_y = (await GetDefaultTexture(item.m_id)).m_default_texture_y;
                            if (item.m_id == 112) {
                                if (object.count == 5)
                                    sprite_offset_x = 1;
                                else if (object.count == 10)
                                    sprite_offset_x = 2;
                                else if (object.count == 50)
                                    sprite_offset_x = 3;
                                else if (object.count == 100)
                                    sprite_offset_x = 4;
                            }

                            tempCtx.imageSmoothingEnabled = false;
                            tempCtx.drawImage(sprite, (m_default_texture_x + sprite_offset_x) * 32, (m_default_texture_y + sprite_offset_y) * 32, 32, 32, 0, 0, 19, 19);
                            tempCtx.globalCompositeOperation = 'source-in';
                            tempCtx.fillStyle = 'rgba(0, 0, 0, 0.56)';
                            tempCtx.fillRect(0, 0, 19, 19);
                            ctx.drawImage(tempCanvas, x, y);

                            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

                            if (item.m_id != 112) {
                                tempCtx.drawImage(textures["pickup_box"], 0, 0, 20, 20, 0, 0, 20, 20);
                                tempCtx.globalCompositeOperation = 'source-in';
                                tempCtx.fillStyle = 'rgba(0, 0, 0, 0.56)';
                                tempCtx.fillRect(0, 0, 20, 20);
                            }
                            ctx.drawImage(tempCanvas, x, y);
                        }
                        else {
                            let sprite_offset_x = item.m_seed_base;
                            let sprite_offset_y = 0;

                            const tempCanvas = createCanvas(16, 16);
                            const tempCtx = tempCanvas.getContext('2d');
                            tempCtx.drawImage(textures["seed"], (sprite_offset_x) * 16, (sprite_offset_y) * 16, 16, 16, 0, 0, 16, 16);
                            tempCtx.globalCompositeOperation = 'source-in';
                            tempCtx.fillStyle = 'rgba(0, 0, 0, 0.56)';
                            tempCtx.fillRect(0, 0, 16, 16);
                            ctx.drawImage(tempCanvas, x, y);
                        }
                    }
                }
            }
            else if (layer == 'foreground') {
                {
                    if (item.m_id === 2590) {
                        var time = new Date().getTime() * 0.5 + x + y;
                        var red = Math.sin(time * 0.0012) * 127 + 128;
                        var green = Math.sin(time * 0.0012 + 2) * 127 + 128;
                        var blue = Math.sin(time * 0.0012 + 4) * 127 + 128;
                        const color = {
                            "red": red,
                            "green": green,
                            "blue": blue
                        };
                        const blendedSprite = blendColor(sprite, (item.m_texture_x + offset_x) * 32, (item.m_texture_y + offset_y) * 32, 32, 32, 32, 32, color);
                        ctx.drawImage(blendedSprite, x, y);
                    }
                    else {
                        if (block.flags) {
                            const tempCanvas = createCanvas(32, 32);
                            const tempCtx = tempCanvas.getContext('2d');

                            var red = (block.flags & 0x20000000 ? 255 : 0);
                            var green = (block.flags & 0x40000000 ? 255 : 0);
                            var blue = (block.flags & 0x80000000 ? 255 : 0);

                            let color = {
                                "red": red,
                                "green": green,
                                "blue": blue
                            };
                            if ((red + green + blue) == 0)
                                color = {
                                    "red": 255,
                                    "green": 255,
                                    "blue": 255
                                };
                            const blendedSprite = blendColor(sprite, (item.m_texture_x + offset_x) * 32, (item.m_texture_y + offset_y) * 32, 32, 32, 32, 32, color);

                            if (block.flags & 0x00200000) {
                                tempCtx.save();
                                tempCtx.scale(-1, 1);
                                tempCtx.drawImage(blendedSprite, -32, 0);
                                tempCtx.restore();
                            }
                            else
                                tempCtx.drawImage(blendedSprite, 0, 0);

                            ctx.drawImage(tempCanvas, x, y);
                        }
                        else {
                            ctx.drawImage(sprite, (item.m_texture_x + offset_x) * 32, (item.m_texture_y + offset_y) * 32, 32, 32, x, y, 32, 32);
                        }
                    }
                }
                {
                    if (world.objects.length > index) {
                        const tempCanvas = createCanvas(32, 32);
                        const tempCtx = tempCanvas.getContext('2d');
                        ctx.imageSmoothingEnabled = false;
                        const object = world.objects[index];

                        const item = await GetItem(object.itemid);
                        const sprite = textures[item.m_texture];
                        const x = object.x;
                        const y = object.y;

                        if (!sprite) {
                            console.log(`Texture not found for item: ${item.m_texture}`);
                            return;
                        }

                        if (item.m_id % 2 == 0) {
                            let sprite_offset_x = 0;
                            let sprite_offset_y = 0;
                            const m_default_texture_x = (await GetDefaultTexture(item.m_id)).m_default_texture_x;
                            const m_default_texture_y = (await GetDefaultTexture(item.m_id)).m_default_texture_y;
                            if (item.m_id == 112) {
                                if (object.count == 5)
                                    sprite_offset_x = 1;
                                else if (object.count == 10)
                                    sprite_offset_x = 2;
                                else if (object.count == 50)
                                    sprite_offset_x = 3;
                                else if (object.count == 100)
                                    sprite_offset_x = 4;
                            }

                            ctx.drawImage(sprite, (m_default_texture_x + sprite_offset_x) * 32, (m_default_texture_y + sprite_offset_y) * 32, 32, 32, x, y, 19, 19);
                            if (object.count > 1 && item.m_id != 112) {
                                ctx.drawImage(textures["pickup_box"], 0, 0, 20, 20, x, y, 20, 20);
                                ctx.font = '10px sf_century';
                                ctx.fillStyle = 'rgb(255, 255, 255)';
                                ctx.fillText(`${object.count}`, x + 18 - ctx.measureText(`${object.count}`).width, y + 18);
                            }
                        }
                        else {
                            let sprite_offset_x = item.m_seed_base;
                            let sprite_offset_y = 0;

                            if (item.m_id % 2 == 1) {
                                sprite_offset_x = item.m_seed_base;
                                sprite_offset_y = 0;
                                const seed_base_color = {
                                    red: (item.m_seed_color >> 8) & 0xFF,
                                    green: (item.m_seed_color >> 16) & 0xFF,
                                    blue: (item.m_seed_color >> 24) & 0xFF
                                };

                                const blendedCanvas = blendColor(textures["seed"], (sprite_offset_x) * 16, (sprite_offset_y) * 16, 16, 16, 16, 16, seed_base_color);

                                ctx.drawImage(blendedCanvas, x, y);
                            }

                            if (item.m_id % 2 == 1) {
                                sprite_offset_x = item.m_seed_overlay;
                                sprite_offset_y = 1;
                                const seed_overlay_color = {
                                    red: (item.m_seed_overlay_color >> 8) & 0xFF,
                                    green: (item.m_seed_overlay_color >> 16) & 0xFF,
                                    blue: (item.m_seed_overlay_color >> 24) & 0xFF
                                };

                                const blendedCanvas = blendColor(textures["seed"], (sprite_offset_x) * 16, (sprite_offset_y) * 16, 16, 16, 16, 16, seed_overlay_color);
                                ctx.drawImage(blendedCanvas, x, y);
                            }
                        }
                    }
                }
                {
                    if (block.flags) {
                        if (block.flags & 0x04000000) {
                            const waterCanvas = createCanvas(32, 32);
                            const wCtx = waterCanvas.getContext('2d');

                            let { offset_x, offset_y } = await GetFlagOffset(world, index, 0x04000000);

                            wCtx.drawImage(textures["water"], offset_x * 32, offset_y * 32, 32, 32, 0, 0, 32, 32);

                            const imageData = wCtx.getImageData(0, 0, 32, 32);
                            for (let i = 0; i < imageData.data.length; i += 4) {
                                const alpha = imageData.data[i + 3];
                                if (alpha > 0) {
                                    imageData.data[i + 3] = 145;
                                }
                            }
                            wCtx.putImageData(imageData, 0, 0);

                            ctx.drawImage(waterCanvas, x, y);
                        }
                        if (block.flags & 0x10000000) {
                            const fireCanvas = createCanvas(32, 32);
                            const fCtx = fireCanvas.getContext('2d');

                            let { offset_x, offset_y } = await GetFlagOffset(world, index, 0x10000000);

                            fCtx.drawImage(textures["fire"], offset_x * 32, offset_y * 32, 32, 32, 0, 0, 32, 32);

                            const imageData = fCtx.getImageData(0, 0, 32, 32);
                            for (let i = 0; i < imageData.data.length; i += 4) {
                                const alpha = imageData.data[i + 3];
                                if (alpha > 0) {
                                    imageData.data[i + 3] = 145;
                                }
                            }
                            fCtx.putImageData(imageData, 0, 0);

                            ctx.drawImage(fireCanvas, x, y);
                        }
                    }
                }
            }
        }
    }

    loadImage('cache/borders/valentines.png').then((img) => {
        ctx.drawImage(img, 0, 0, 3200, 1920);
    });

    ctx.font = '55px sf_century';
    const totalWidth = ctx.measureText(`Visit "${world.name}" in ${config.server_name}`).width;
    const xStart = 2929 - totalWidth;
    const xWorldName = xStart + ctx.measureText('Visit ').width;
    const xIn = xWorldName + ctx.measureText(`"${world.name}" `).width;

    ctx.fillStyle = 'rgb(255, 144, 243)';
    ctx.fillText('Visit ', xStart, 1826);

    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillText(`"${world.name}" `, xWorldName, 1826);

    ctx.fillStyle = 'rgb(255, 144, 243)';
    ctx.fillText('in ', xIn, 1826);

    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillText(config.server_name, xIn + ctx.measureText('in ').width, 1826);

    function blendColor(sprite, sx, sy, sw, sh, dw, dh, color) {
        const tempCanvas = createCanvas(dw, dh);
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.drawImage(sprite, sx, sy, sw, sh, 0, 0, dw, dh);
        const imageData = tempCtx.getImageData(0, 0, dw, dh);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const alpha = imageData.data[i + 3];
            if (alpha > 0) {
                imageData.data[i] = (imageData.data[i] * (color.red == -1 ? 255 : color.red)) / 255;
                imageData.data[i + 1] = (imageData.data[i + 1] * (color.green == -1 ? 255 : color.green)) / 255;
                imageData.data[i + 2] = (imageData.data[i + 2] * (color.blue == -1 ? 255 : color.blue)) / 255;
            }
        }
        tempCtx.putImageData(imageData, 0, 0);
        return tempCanvas
    }
}

module.exports = { World, renderWorld };