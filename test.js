const { rainbowify: rbfy } = require('./lib/gif');
const fs = require('fs');

const wat = ['wat.png', 'w2.gif'];
const venmo = ['venmo-icon.png', 'v2.gif'];
const catmoji = ['catmoji.jpg', 'c2.gif'];
const catpeace = ['catpeace.gif', 'cpeace2.gif'];
const pusheen = ['pusheen.jpg', 'p2.gif'];

const allSets = [wat, venmo, catmoji, catpeace, pusheen];

allSets.forEach(([INPUT, OUTPUT]) => {

    const input = fs.readFileSync(INPUT);

    console.time('custom_method');
    const res = rbfy(input, 5);
    console.timeEnd('custom_method');

    fs.writeFileSync(OUTPUT, Buffer.from(res));
});
