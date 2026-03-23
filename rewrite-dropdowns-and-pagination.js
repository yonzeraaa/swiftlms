const fs = require('fs');

const files = [
  'app/dashboard/courses/page.tsx',
  'app/dashboard/modules/page.tsx',
  'app/dashboard/subjects/page.tsx',
  'app/dashboard/lessons/page.tsx',
  'app/dashboard/tests/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Update dropdownPosition state
  content = content.replace(
    /const \[dropdownPosition, setDropdownPosition\] = useState<{.*?top.*?left.*?}.*?>\(null\)/g,
    'const [dropdownPosition, setDropdownPosition] = useState<{ top?: number, bottom?: number, left: number, isUp?: boolean } | null>(null)'
  );

  // 2. Update MoreVertical onClick handler
  // The exact signature varies. We want to replace the rect calculation and setDropdownPosition.
  // Pattern:
  // const rect = e.currentTarget.getBoundingClientRect()
  // setDropdownPosition({ top: rect.bottom, left: rect.right - 240 })
  content = content.replace(
    /const rect = e\.currentTarget\.getBoundingClientRect\(\)\s*setDropdownPosition\(\{\s*top:\s*rect\.bottom,\s*left:\s*rect\.right\s*-\s*240\s*\}\)/g,
    `const rect = e.currentTarget.getBoundingClientRect()
                        const isUp = window.innerHeight - rect.bottom < 250
                        setDropdownPosition({ 
                          top: isUp ? undefined : rect.bottom, 
                          bottom: isUp ? window.innerHeight - rect.top : undefined,
                          left: rect.right - 240,
                          isUp
                        })`
  );

  // 3. Update Dropdown Portal style and arrow
  // style={{ top: `${dropdownPosition.top + 8}px`, left: `${dropdownPosition.left}px` }}
  // <div className="absolute -top-2 right-4 w-4 h-4 bg-[#faf6ee] border-l border-t border-[#1e130c]/20 rotate-45" />
  content = content.replace(
    /style=\{\{ top: `\$\{dropdownPosition\.top \+ 8\}px`, left: `\$\{dropdownPosition\.left\}px` \}\}/g,
    "style={{ top: dropdownPosition.top ? `${dropdownPosition.top + 8}px` : undefined, bottom: dropdownPosition.bottom ? `${dropdownPosition.bottom + 8}px` : undefined, left: `${dropdownPosition.left}px` }}"
  );

  content = content.replace(
    /<div className="absolute -top-2 right-4 w-4 h-4 bg-\[#faf6ee\] border-l border-t border-\[#1e130c\]\/20 rotate-45" \/>/g,
    '<div className={`absolute ${dropdownPosition.isUp ? "-bottom-2 border-b border-r" : "-top-2 border-l border-t"} right-4 w-4 h-4 bg-[#faf6ee] border-[#1e130c]/20 rotate-45`} />'
  );

  fs.writeFileSync(file, content);
  console.log(`Updated dropdown in ${file}`);
});
