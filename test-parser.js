const fs = require('fs');
const cheerio = require('cheerio');

// Read debug HTML
const html = fs.readFileSync('debug.html', 'utf-8');
const $ = cheerio.load(html);

console.log('Searching for expand macros...\n');

// Find expand macros
const expandMacros = $('ac\\:structured-macro[ac\\:name="expand"]').toArray();
console.log(`Found ${expandMacros.length} expand macros\n`);

expandMacros.slice(0, 2).forEach((macro, idx) => {
  console.log(`\n=== EXPAND MACRO ${idx + 1} ===`);
  const text = $(macro).text();
  console.log('Length:', text.length);
  
  if (text.includes('Response Structure:')) {
    console.log('\n✅ Contains Response Structure!');
    console.log('\nFirst 600 chars:');
    console.log(text.substring(0, 600));
  } else {
    console.log('No Response Structure found');
  }
});
