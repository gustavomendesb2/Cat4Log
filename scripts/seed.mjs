import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// Minimal .env.local loader (no extra deps)
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const NAMES = [
  'Bulbasaur','Ivysaur','Venusaur','Charmander','Charmeleon','Charizard','Squirtle','Wartortle',
  'Blastoise','Caterpie','Metapod','Butterfree','Weedle','Kakuna','Beedrill','Pidgey','Pidgeotto',
  'Pidgeot','Rattata','Raticate','Spearow','Fearow','Ekans','Arbok','Pikachu','Raichu','Sandshrew',
  'Sandslash','Nidoran♀','Nidorina','Nidoqueen','Nidoran♂','Nidorino','Nidoking','Clefairy','Clefable',
  'Vulpix','Ninetales','Jigglypuff','Wigglytuff','Zubat','Golbat','Oddish','Gloom','Vileplume','Paras',
  'Parasect','Venonat','Venomoth','Diglett','Dugtrio','Meowth','Persian','Psyduck','Golduck','Mankey',
  'Primeape','Growlithe','Arcanine','Poliwag','Poliwhirl','Poliwrath','Abra','Kadabra','Alakazam',
  'Machop','Machoke','Machamp','Bellsprout','Weepinbell','Victreebel','Tentacool','Tentacruel','Geodude',
  'Graveler','Golem','Ponyta','Rapidash','Slowpoke','Slowbro','Magnemite','Magneton',"Farfetch'd",
  'Doduo','Dodrio','Seel','Dewgong','Grimer','Muk','Shellder','Cloyster','Gastly','Haunter','Gengar',
  'Onix','Drowzee','Hypno','Krabby','Kingler','Voltorb','Electrode','Exeggcute','Exeggutor','Cubone',
  'Marowak','Hitmonlee','Hitmonchan','Lickitung','Koffing','Weezing','Rhyhorn','Rhydon','Chansey',
  'Tangela','Kangaskhan','Horsea','Seadra','Goldeen','Seaking','Staryu','Starmie','Mr. Mime','Scyther',
  'Jynx','Electabuzz','Magmar','Pinsir','Tauros','Magikarp','Gyarados','Lapras','Ditto','Eevee',
  'Vaporeon','Jolteon','Flareon','Porygon','Omanyte','Omastar','Kabuto','Kabutops','Aerodactyl',
  'Snorlax','Articuno','Zapdos','Moltres','Dratini','Dragonair','Dragonite','Mewtwo','Mew',
]

const { data: col, error: colErr } = await supabase
  .from('collections').select('id').eq('slug', 'pokemon').single()
if (colErr) throw colErr

const { count } = await supabase
  .from('cards').select('id', { count: 'exact', head: true }).eq('collection_id', col.id)
if (count && count > 0) { console.log(`Pokémon already seeded (${count} cards). Skipping.`); process.exit(0) }

const rows = NAMES.map((name, i) => ({
  collection_id: col.id,
  number: String(i + 1).padStart(3, '0'),
  name,
  aspect_ratio: '9:16',
  sort_order: i,
}))

const { error } = await supabase.from('cards').insert(rows)
if (error) throw error
console.log(`Seeded ${rows.length} Pokémon.`)
