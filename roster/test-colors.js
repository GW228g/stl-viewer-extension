// Run with: node roster/test-colors.js
const assert = require('assert');
const { detectColor, groupByColor, nameKey } = require('./colors.js');

const cases = [
  // [file name, expected color, expected certain]
  ['red_dragon.stl',        'red',    true],
  ['Red Dragon.STL',        'red',    true],
  ['PurpleRobot.stl',       'purple', true],
  ['grey_tank.stl',         'gray',   true],
  ['black and white panda.stl', 'white', false],   // two colors: last wins, flagged
  ['d1p2 john fitz kennedy project #3 Orange.stl', 'orange', true],
  ['Mighty Sango Red Dragon.stl', 'red', false],    // buried mid-name: flagged
  ['john brown project.stl', 'brown', false],       // surname: flagged
  ['Brown Bear v2.stl',     'brown',  true],
  ['Bleu Vase.stl',         'blue',   false],
  ['gren frog.stl',         'green',  false],
  ['yelow duck.stl',        'yellow', false],
  ['Orang cat.stl',         'orange', false],
  ['pruple_whale.stl',      'purple', false],
  ['wite_ghost.stl',        'white',  false],
  ['pinc heart.stl',        'pink',   false],
  ['pnk heart.stl',         null],  // 3 letters is too ambiguous to guess
  ['reddragon.stl',         'red',    false],
  ['Mighty Sango.stl',      null],
  ['crown.stl',             null],
  ['block tower.stl',       null],
  ['team logo.stl',         null],
  ['',                      null],
];

for (const [file, color, certain] of cases) {
  const got = detectColor(file);
  assert.strictEqual(got.color, color, `${file}: expected ${color}, got ${got.color}`);
  if (color) assert.strictEqual(got.certain, certain, `${file}: certain flag`);
}

const { groups, notSubmitted, others } = groupByColor(
  [
    { name: 'B', files: ['red_cat.stl'] },
    { name: 'A', files: ['red_dog.stl', 'mystery.stl'] },
    { name: 'C', files: [] },
    { name: 'D', files: [], others: [{ name: 'Funky Design', isLink: true }] },
    { name: 'E Zed', files: ['blue_x.stl'], status: 'Assigned' },
  ],
  { 'A|mystery.stl': 'blue' }
);
assert.deepStrictEqual(groups.map(g => g.color), ['red', 'blue']);
assert.strictEqual(groups[1].items.find(i => i.file === 'blue_x.stl').pending, true);
assert.deepStrictEqual(groups[0].items.map(i => i.name), ['A', 'B']);
assert.deepStrictEqual(notSubmitted, ['C']);
assert.deepStrictEqual(others.map(o => o.name), ['D']);
assert.strictEqual(nameKey('Ann Lee', 'last'), 'lee ann');
assert.strictEqual(nameKey('Lee, Ann', 'last'), 'lee ann');
assert.strictEqual(nameKey('Ann Lee', 'first'), 'ann lee');

console.log('all color tests passed');
