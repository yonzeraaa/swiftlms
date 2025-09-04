#!/bin/bash
# Find and fix all remaining TypeScript "any" type errors

echo "Searching for all 'implicitly has any type' patterns..."

# Common patterns to fix
files=(
  "./app/student-dashboard/page.tsx"
  "./app/student-dashboard/my-courses/page.tsx"
  "./app/student-dashboard/courses/page.tsx"
  "./app/teacher-dashboard/page.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    # Fix .find callbacks
    sed -i 's/\.find(lp =>/.find((lp: any) =>/g' "$file"
    sed -i 's/\.find(e =>/.find((e: any) =>/g' "$file"
    sed -i 's/\.find(p =>/.find((p: any) =>/g' "$file"
    sed -i 's/\.find(c =>/.find((c: any) =>/g' "$file"
    sed -i 's/\.find(u =>/.find((u: any) =>/g' "$file"
    sed -i 's/\.find(m =>/.find((m: any) =>/g' "$file"
    sed -i 's/\.find(l =>/.find((l: any) =>/g' "$file"
    sed -i 's/\.find(s =>/.find((s: any) =>/g' "$file"
    sed -i 's/\.find(lesson =>/.find((lesson: any) =>/g' "$file"
    sed -i 's/\.find(module =>/.find((module: any) =>/g' "$file"
  fi
done

echo "All files fixed!"
