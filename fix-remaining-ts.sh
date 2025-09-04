#!/bin/bash
# Fix remaining TypeScript errors in student-dashboard

# Fix my-courses page
sed -i 's/lessonProgress?.find(lp =>/lessonProgress?.find((lp: any) =>/g' ./app/student-dashboard/my-courses/page.tsx

echo "Fixed remaining TypeScript errors"
