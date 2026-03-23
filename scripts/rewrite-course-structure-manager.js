const fs = require('fs');

const filePath = 'app/components/CourseStructureManager.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replacements
content = content.replace(/bg-navy-800\/50/g, 'bg-[#faf6ee]');
content = content.replace(/bg-navy-800\/30/g, 'bg-[#1e130c]/5');
content = content.replace(/hover:bg-navy-800\/30/g, 'hover:bg-[#1e130c]/5');
content = content.replace(/border-gold-500\/30/g, 'border-[#1e130c]/15');
content = content.replace(/border-navy-700/g, 'border-[#1e130c]/15');
content = content.replace(/ring-gold-500\/50/g, 'ring-[#8b6d22]/50');
content = content.replace(/text-gold-500/g, 'text-[#8b6d22]');
content = content.replace(/text-gold-400\/50/g, 'text-[#7a6350]/60');
content = content.replace(/hover:text-gold-400/g, 'hover:text-[#1e130c]');
content = content.replace(/hover:text-gold-300/g, 'hover:text-[#8b6d22]');
content = content.replace(/text-gold-400\/70/g, 'text-[#7a6350]/80');
content = content.replace(/text-gold-400/g, 'text-[#7a6350]');
content = content.replace(/text-gold-300\/70/g, 'text-[#7a6350]/80');
content = content.replace(/text-gold-300/g, 'text-[#1e130c]');
content = content.replace(/text-gold-200/g, 'text-[#1e130c]');
content = content.replace(/text-gold/g, 'text-[#1e130c]');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced styles in CourseStructureManager.tsx');
