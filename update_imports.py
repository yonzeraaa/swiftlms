import re

with open('app/dashboard/reports/page.tsx', 'r') as f:
    content = f.read()

# Add ClassicRule and CornerBracket
if 'from \'../../components/ui/RenaissanceSvgs\'' not in content:
    content = re.sub(
        r'import \{ Database \} from \'@/lib/database\.types\'',
        "import { Database } from '@/lib/database.types'\nimport { ClassicRule, CornerBracket } from '../../components/ui/RenaissanceSvgs'",
        content
    )

# Add INK, ACCENT, MUTED, PARCH, BORDER constants
constants = """
const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'
"""

if 'const INK = ' not in content:
    content = re.sub(
        r'type ExcelTemplate = [^\n]+\n',
        lambda m: m.group(0) + constants + '\n',
        content
    )

with open('app/dashboard/reports/page.tsx', 'w') as f:
    f.write(content)

print("Imports and constants added.")
