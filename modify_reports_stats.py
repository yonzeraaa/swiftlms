import re

with open('app/dashboard/reports/page.tsx', 'r') as f:
    content = f.read()

# Quick Stats replacement
stats_replacement = """
      {/* ── Métricas de Registro ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-12 mb-20 px-4">
        {[
          { label: t('reports.enrollments'), value: reportData?.totalEnrollments || 0, sub: t('reports.inPeriod') },
          { label: t('reports.completionRate'), value: `${reportData?.averageCompletionRate || 0}%`, sub: t('reports.overallAverage') },
          { label: t('reports.activeStudents'), value: reportData?.activeStudents || 0, sub: t('dashboard.total') },
          { label: t('courses.title'), value: reportData?.totalCourses || 0, sub: t('reports.available') },
        ].map((stat, idx) => (
          <div key={idx} className="flex flex-col items-center text-center relative">
            <span
              style={{
                fontFamily: 'var(--font-lora)',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: MUTED,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                marginBottom: '1.25rem'
              }}
            >
              {stat.label}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: '3.5rem',
                fontWeight: 700,
                color: INK,
                lineHeight: 1,
                marginBottom: '1rem'
              }}
            >
              {stat.value}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-lora)',
                fontSize: '0.9rem',
                fontStyle: 'italic',
                color: ACCENT,
              }}
            >
              {stat.sub}
            </span>

            {idx !== 3 && (
              <div className="hidden md:block absolute right-[-2rem] top-[15%] bottom-[15%] w-px opacity-20" style={{ backgroundColor: INK }} />
            )}
          </div>
        ))}
      </div>

      <ClassicRule style={{ width: '100%', marginBottom: '4rem', color: INK, opacity: 0.3 }} />
"""

stats_pattern = r'\{\/\*\s*Quick Stats\s*\*\/\}.*?(?=\{\/\*\s*Available Reports\s*\*\/\})'
content = re.sub(stats_pattern, stats_replacement, content, flags=re.DOTALL)

with open('app/dashboard/reports/page.tsx', 'w') as f:
    f.write(content)
