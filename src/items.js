const items = require('../items.json');
const locks = [202, 204, 206, 242, 1796, 2408, 2950, 4428, 4802, 4994, 5260, 5814, 5980, 7188, 8470, 9640, 10410, 11550, 11586, 11902, 12654, 13200, 13636];

async function GetItem(ItemID) {
    if (ItemID > items.m_item_count) ItemID = 0;
    const item = items.m_items.find(item => item.m_id === ItemID);
    return item;
}

async function GetDefaultTexture(ItemID) {
    let m_default_texture_x = 0;
    let m_default_texture_y = 0;
    const item = await GetItem(ItemID);

    switch(item.m_spread_type) {
        case 2:
        case 5: {
            m_default_texture_x = item.m_texture_x + 4;
            m_default_texture_y = item.m_texture_y + 1;
            break;
        }
        case 3:
        case 7: {
            m_default_texture_x = item.m_texture_x + 3;
            m_default_texture_y = item.m_texture_y;
            break;
        }
        default: {
            m_default_texture_x = item.m_texture_x;
            m_default_texture_y = item.m_texture_y;
            break;
        }
    }
    return { m_default_texture_x, m_default_texture_y };
}

module.exports = { GetItem, GetDefaultTexture, items, locks };
