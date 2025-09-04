#!/bin/bash

# Script para corrigir erros de TypeScript "implicitly has an 'any' type"

echo "Fixing TypeScript 'any' type errors..."

# Dashboard page
sed -i "s/profiles?.filter(p =>/profiles?.filter((p: any) =>/g" app/dashboard/page.tsx

# Student dashboard pages
sed -i "s/enrollments?.filter(e =>/enrollments?.filter((e: any) =>/g" app/student-dashboard/page.tsx
sed -i "s/enrollments?.map(enrollment =>/enrollments?.map((enrollment: any) =>/g" app/student-dashboard/certificates/page.tsx
sed -i "s/certificates?.find(cert =>/certificates?.find((cert: any) =>/g" app/student-dashboard/certificates/page.tsx

# Reports
sed -i "s/\.map(student =>/.map((student: any) =>/g" app/dashboard/reports/page.tsx
sed -i "s/\.forEach(enrollment =>/.forEach((enrollment: any) =>/g" app/dashboard/reports/page.tsx
sed -i "s/\.filter(s =>/.filter((s: any) =>/g" app/dashboard/reports/page.tsx
sed -i "s/\.find(e =>/.find((e: any) =>/g" app/dashboard/reports/page.tsx

# Settings
sed -i "s/onAuthStateChange((event, session)/onAuthStateChange((event: any, session: any)/g" app/dashboard/settings/page.tsx
sed -i "s/onAuthStateChange((event)/onAuthStateChange((event: any)/g" app/student-dashboard/settings/page.tsx

# Structure
sed -i "s/subjects?.filter(s =>/subjects?.filter((s: any) =>/g" app/dashboard/structure/page.tsx
sed -i "s/modules?.find(m =>/modules?.find((m: any) =>/g" app/dashboard/structure/page.tsx

# Tests
sed -i "s/tests?.map(test =>/tests?.map((test: any) =>/g" app/dashboard/tests/page.tsx
sed -i "s/attempts?.filter(a =>/attempts?.filter((a: any) =>/g" app/dashboard/tests/page.tsx

# Users
sed -i "s/users.map(user =>/users.map((user: any) =>/g" app/dashboard/users/page.tsx
sed -i "s/enrollments?.filter(e =>/enrollments?.filter((e: any) =>/g" app/dashboard/users/page.tsx

echo "TypeScript fixes applied!"