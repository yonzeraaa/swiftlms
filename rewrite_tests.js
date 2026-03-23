const fs = require('fs');

const path = 'app/dashboard/tests/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add import
const importToAdd = "import { ClassicRule, CornerBracket } from '../../components/ui/RenaissanceSvgs'\n";
content = content.replace(
  "import { Chip } from '../../components/Badge'",
  "import { Chip } from '../../components/Badge'\n" + importToAdd
);

// We need to replace everything from "  if (loading) {" to the end of the file.
const splitIndex = content.indexOf("  if (loading) {");
if (splitIndex !== -1) {
  content = content.substring(0, splitIndex);
}

const newReturn = fs.readFileSync('new_return.tsx', 'utf8');

// The written file has some trailing prompt text, let's remove it.
const cleanReturn = newReturn.split("The following is an ephemeral message")[0];

content = content + cleanReturn;
fs.writeFileSync(path, content, 'utf8');
