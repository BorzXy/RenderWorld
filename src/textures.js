const { loadImage, createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const { locks } = require('./items.js')

async function loadTexturesFromFolder(folderPath) {
    const textures = {};
    const files = await fs.promises.readdir(folderPath, { withFileTypes: true });

    for (const file of files) {
        const filePath = path.join(folderPath, file.name);

        if (file.isDirectory()) {
            const subTextures = await loadTexturesFromFolder(filePath);
            Object.assign(textures, subTextures);
        } else if (file.isFile() && file.name.endsWith('.png')) {
            const name = path.basename(file.name, '.png');
            const image = await loadImage(filePath);
            textures[name] = image;
        }
    }

    return textures;
}

async function loadTextures() {
    const textures = await loadTexturesFromFolder('cache');
    console.log(`Loaded ${Object.keys(textures).length} textures`);
    return textures;
}

async function GetLut8Bit() {
    let lut_8bit = [];
    for (let i = 0; i < 256; i++) {
        switch (i) {
            case 2: lut_8bit.push(11); break;
            case 8: lut_8bit.push(30); break;
            case 10: lut_8bit.push(44); break;
            case 11: lut_8bit.push(8); break;
            case 16: lut_8bit.push(29); break;
            case 18: lut_8bit.push(43); break;
            case 22: lut_8bit.push(7); break;
            case 24: lut_8bit.push(28); break;
            case 26: lut_8bit.push(42); break;
            case 27: lut_8bit.push(41); break;
            case 30: lut_8bit.push(40); break;
            case 31: lut_8bit.push(2); break;
            case 64: lut_8bit.push(10); break;
            case 66: lut_8bit.push(9); break;
            case 72: lut_8bit.push(46); break;
            case 74: lut_8bit.push(36); break;
            case 75: lut_8bit.push(35); break;
            case 80: lut_8bit.push(45); break;
            case 82: lut_8bit.push(33); break;
            case 86: lut_8bit.push(32); break;
            case 88: lut_8bit.push(39); break;
            case 90: lut_8bit.push(27); break;
            case 91: lut_8bit.push(23); break;
            case 94: lut_8bit.push(24); break;
            case 95: lut_8bit.push(18); break;
            case 104: lut_8bit.push(6); break;
            case 106: lut_8bit.push(34); break;
            case 107: lut_8bit.push(4); break;
            case 120: lut_8bit.push(38); break;
            case 122: lut_8bit.push(25); break;
            case 123: lut_8bit.push(20); break;
            case 126: lut_8bit.push(21); break;
            case 127: lut_8bit.push(16); break;
            case 208: lut_8bit.push(5); break;
            case 210: lut_8bit.push(31); break;
            case 214: lut_8bit.push(3); break;
            case 216: lut_8bit.push(37); break;
            case 218: lut_8bit.push(26); break;
            case 219: lut_8bit.push(22); break;
            case 222: lut_8bit.push(19); break;
            case 223: lut_8bit.push(15); break;
            case 248: lut_8bit.push(1); break;
            case 250: lut_8bit.push(17); break;
            case 251: lut_8bit.push(14); break;
            case 254: lut_8bit.push(13); break;
            case 0: lut_8bit.push(12); break;
            default: lut_8bit.push(0); break; // Set default value for elements not explicitly defined
        }
    }
    return lut_8bit;
}

async function GetLut4Bit() {
    let lut_4bit = [12, 11, 15, 8, 14, 7, 13, 2, 10, 9, 6, 4, 5, 3, 1, 0];
    return lut_4bit;
}

async function GetFlagOffset(world, index, flag) {
    const lut_8bit = await GetLut8Bit();

    let offset_x = 0;
    let offset_y = 0;

    const offsets = [-101, -100, -99, -1, 1, 99, 100, 101];
    const left = [0, 3, 5];
    const right = [2, 4, 6];
    let bit = 0;

    for (let i = 0; i < offsets.length; i++) {
        const offset = offsets[i];
        const neighborIndex = index + offset;
        const withinBounds = neighborIndex >= 0 && neighborIndex < 6000;
        const x = index % 100;
        const isEdge = (left.includes(i) && x === 0) || (right.includes(i) && x === 99);
        const isMatchingNeighbor = withinBounds && (world.blocks[neighborIndex].flags & flag);

        if (isEdge || isMatchingNeighbor) {
            bit |= 1 << i;
        }
    }

    if (!(bit & 8) || !(bit & 2)) bit &= ~1;
    if (!(bit & 16) || !(bit & 2)) bit &= ~4;
    if (!(bit & 8) || !(bit & 64)) bit &= ~32;
    if (!(bit & 16) || !(bit & 64)) bit &= ~128;

    offset_x = lut_8bit[bit] % 8;
    offset_y = Math.floor(lut_8bit[bit] / 8);

    return { offset_x, offset_y };
}

async function GetOffset(world, item_id, index, spread_type, background = false) {
    const lut_8bit = await GetLut8Bit();
    const lut_4bit = await GetLut4Bit();

    let offset_x = 0;
    let offset_y = 0;

    if (spread_type === 2) {
        const offsets = [-101, -100, -99, -1.0, 1.0, 99.0, 100, 101];
        const left = [0, 3, 5];
        const right = [2, 4, 6];
        let bit = 0;

        for (let i = 0; i < offsets.length; i++) {
            const offset = offsets[i];
            const neighborIndex = index + offset;
            const withinBounds = neighborIndex >= 0 && neighborIndex < 6000;
            const x = index % 100;
            const isEdge = (left.includes(i) && x === 0) || (right.includes(i) && x === 99);
            const isMatchingNeighbor = withinBounds && ((background ? world.blocks[neighborIndex]?.background : world.blocks[neighborIndex]?.foreground) === item_id);

            if (isEdge || isMatchingNeighbor) {
                bit |= 1 << i;
            }
        }

        if (!(bit & 8) || !(bit & 2)) bit &= ~1;
        if (!(bit & 16) || !(bit & 2)) bit &= ~4;
        if (!(bit & 8) || !(bit & 64)) bit &= ~32;
        if (!(bit & 16) || !(bit & 64)) bit &= ~128;

        offset_x = lut_8bit[bit] % 8;
        offset_y = Math.floor(lut_8bit[bit] / 8);
    } else if (spread_type === 3) {
        const offsets = [-1.0, 1.0];
        offset_x = 3;

        for (let i = 0; i < offsets.length; i++) {
            const offset = offsets[i];
            const neighborIndex = index + offset;
            const withinBounds = neighborIndex >= 0 && neighborIndex < 6000;
            const x = index % 100;
            const isEdge = (offsets.includes(i) && x === 0) || (offsets.includes(i) && x === 99);
            const isMatchingNeighbor = withinBounds && ((background ? world.blocks[neighborIndex]?.background : world.blocks[neighborIndex]?.foreground) === item_id);

            offset_x = isEdge ? (isMatchingNeighbor ? 1 : 0) : (isMatchingNeighbor ? 2 : offset_x);
        }
    } else if (spread_type === 4) {
        const offsets = [-1, -100, 1, 100];
        offset_x = 4;

        for (let i = 0; i < offsets.length; i++) {
            const offset = offsets[i];
            const neighborIndex = index + offset;
            const withinBounds = neighborIndex >= 0 && neighborIndex < 6000;
            const x = index % 100;
            const isEdge = (offset === -1 && x === 0) || (offset === 1 && x === 99);
            const isMatchingNeighbor = withinBounds && ((background ? world.blocks[neighborIndex]?.background : world.blocks[neighborIndex]?.foreground) === item_id);

            if (isEdge || isMatchingNeighbor) offset_x = i;
        }
    } else if (spread_type === 5) {
        const offsets = [-100, -1, 1, 100];
        let bit = 0;

        for (let i = 0; i < offsets.length; i++) {
            const offset = offsets[i];
            const neighborIndex = index + offset;
            const withinBounds = neighborIndex >= 0 && neighborIndex < 6000;
            const x = index % 100;
            const isEdge = (i === 1 && x === 0) || (i === 2 && x === 99);
            const isMatchingNeighbor = withinBounds && ((background ? world.blocks[neighborIndex]?.background : world.blocks[neighborIndex]?.foreground) === item_id);

            if (isEdge || isMatchingNeighbor) {
                bit |= 1 << i;
            }
        }

        offset_x = lut_4bit[bit] % 8;
        offset_y = Math.floor(lut_4bit[bit] / 8);
    } else if (spread_type === 6) {
        offset_x = 0;
        offset_y = 0;
    } else if (spread_type === 7) {
        const offsets = [100, -100];
        offset_x = 3;

        for (let i = 0; i < offsets.length; i++) {
            const offset = offsets[i];
            const neighborIndex = index + offset;
            const withinBounds = neighborIndex >= 0 && neighborIndex < 6000;
            const isMatchingNeighbor = withinBounds && ((background ? world.blocks[neighborIndex]?.background : world.blocks[neighborIndex]?.foreground) === item_id);

            if (isMatchingNeighbor) {
                offset_x = i === 0 ? 2 : i === 1 ? 0 : offset_x;
            }
        }
    } else if (spread_type === 9) {
        const offsets = [1, -1, 100, -100];
        offset_x = 3;

        for (let i = 0; i < offsets.length; i++) {
            const offset = offsets[i];
            const neighborIndex = index + offset;
            const withinBounds = neighborIndex >= 0 && neighborIndex < 6000;
            const x = index % 100;
            const isEdge = (offset === -1 && x === 0) || (offset === 1 && x === 99);
            const isMatchingNeighbor = withinBounds && ((background ? world.blocks[neighborIndex]?.background : world.blocks[neighborIndex]?.foreground) === item_id);

            if (isEdge || isMatchingNeighbor) {
                offset_x = i;
            }
        }
    }

    if (!background && locks.includes(world.blocks[index]?.foreground)) {
        offset_x = 2;
    }

    return { offset_x, offset_y };
}


module.exports = { loadTextures, GetLut8Bit, GetLut4Bit, GetOffset, GetFlagOffset };
