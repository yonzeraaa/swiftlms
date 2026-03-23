import re

with open('app/dashboard/reports/page.tsx', 'r') as f:
    content = f.read()

# Modify loading state
loading_skeleton = r"if \(loading\) \{.*?return \(\s*<div.*?</div>\s*\)\s*\}"
loading_spinner = "if (loading) return <Spinner fullPage size=\"xl\" />"
content = re.sub(loading_skeleton, loading_spinner, content, flags=re.DOTALL)

with open('app/dashboard/reports/page.tsx', 'w') as f:
    f.write(content)
