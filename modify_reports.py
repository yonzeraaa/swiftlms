import re

with open('app/dashboard/reports/page.tsx', 'r') as f:
    content = f.read()

print("Original length:", len(content))
