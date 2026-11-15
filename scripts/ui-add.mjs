// Dev helper: node scripts/ui-add.mjs '{"key":["zh","en"],...}'  — merges keys into data/ui.json
import { readFileSync, writeFileSync } from 'node:fs'
const p = new URL('../data/ui.json', import.meta.url)
const ui = JSON.parse(readFileSync(p, 'utf8'))
for (const [k, [zh, en]] of Object.entries(JSON.parse(process.argv[2]))) ui[k] = { zh, en }
writeFileSync(p, JSON.stringify(ui, null, 2) + '\n')
console.log(Object.keys(ui).length, 'keys')
