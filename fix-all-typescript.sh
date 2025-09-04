#!/bin/bash

# Script para corrigir todos os erros de TypeScript "implicitly has an 'any' type"

echo "Fixing ALL TypeScript 'any' type errors..."

# Reports page
sed -i "s/profiles?.filter(p =>/profiles?.filter((p: any) =>/g" app/dashboard/reports/page.tsx
sed -i "s/students.filter(s =>/students.filter((s: any) =>/g" app/dashboard/reports/page.tsx
sed -i "s/enrollments?.filter(e =>/enrollments?.filter((e: any) =>/g" app/dashboard/reports/page.tsx
sed -i "s/enrollments?.map(e =>/enrollments?.map((e: any) =>/g" app/dashboard/reports/page.tsx
sed -i "s/courses?.find(c =>/courses?.find((c: any) =>/g" app/dashboard/reports/page.tsx
sed -i "s/students.map(student =>/students.map((student: any) =>/g" app/dashboard/reports/page.tsx
sed -i "s/forEach(enrollment =>/forEach((enrollment: any) =>/g" app/dashboard/reports/page.tsx

# Settings pages
sed -i "s/onAuthStateChange((event, session)/onAuthStateChange((event: any, session: any)/g" app/dashboard/settings/page.tsx
sed -i "s/onAuthStateChange((event, session)/onAuthStateChange((event: any, session: any)/g" app/student-dashboard/settings/page.tsx

# Structure page
sed -i "s/subjects?.filter(s =>/subjects?.filter((s: any) =>/g" app/dashboard/structure/page.tsx
sed -i "s/modules?.find(m =>/modules?.find((m: any) =>/g" app/dashboard/structure/page.tsx
sed -i "s/lessonContent?.forEach(content =>/lessonContent?.forEach((content: any) =>/g" app/dashboard/structure/page.tsx

# Student dashboard pages
sed -i "s/enrollments?.filter(e =>/enrollments?.filter((e: any) =>/g" app/student-dashboard/page.tsx
sed -i "s/enrollments?.map(enrollment =>/enrollments?.map((enrollment: any) =>/g" app/student-dashboard/certificates/page.tsx
sed -i "s/certificates?.find(cert =>/certificates?.find((cert: any) =>/g" app/student-dashboard/certificates/page.tsx
sed -i "s/lessonsWithProgress.forEach(lesson =>/lessonsWithProgress.forEach((lesson: any) =>/g" app/student-dashboard/course/\[id\]/page.tsx
sed -i "s/enrollments?.map(e =>/enrollments?.map((e: any) =>/g" app/student-dashboard/my-courses/page.tsx

# Tests page
sed -i "s/tests?.map(test =>/tests?.map((test: any) =>/g" app/dashboard/tests/page.tsx
sed -i "s/attempts?.filter(a =>/attempts?.filter((a: any) =>/g" app/dashboard/tests/page.tsx

# Users page
sed -i "s/users.map(user =>/users.map((user: any) =>/g" app/dashboard/users/page.tsx
sed -i "s/enrollments?.filter(enrollment =>/enrollments?.filter((enrollment: any) =>/g" app/dashboard/users/page.tsx

# Subjects page
sed -i "s/subjects?.filter(subject =>/subjects?.filter((subject: any) =>/g" app/dashboard/subjects/page.tsx
sed -i "s/modules?.filter(ms =>/modules?.filter((ms: any) =>/g" app/dashboard/subjects/page.tsx

echo "TypeScript fixes applied to all files!"