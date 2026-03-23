import re

with open('app/dashboard/reports/page.tsx', 'r') as f:
    content = f.read()

# Data Summary replacement
summary_replacement = """
      {/* ── Resumo de Dados ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

        {/* Top Courses */}
        <div className="flex flex-col">
          <h2
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '2rem',
              fontWeight: 600,
              color: INK,
              marginBottom: '2rem',
              borderLeft: `4px solid ${ACCENT}`,
              paddingLeft: '1.5rem'
            }}
          >
            {t('reports.top5Courses')}
          </h2>
          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: MUTED, marginBottom: '2.5rem', paddingLeft: '2rem' }}>
            {t('reports.byEnrollments')}
          </p>

          <div className="space-y-0">
            {reportData?.topCourses.length ? reportData.topCourses.map((course, idx) => (
              <div
                key={idx}
                className="py-5 transition-colors hover:bg-[#1e130c]/[0.02] px-2 flex justify-between items-center"
                style={{ borderBottom: `1px dashed ${BORDER}` }}
              >
                <div className="flex items-center gap-4">
                  <span style={{ fontFamily: 'var(--font-lora)', fontSize: '1.05rem', color: INK, fontWeight: 700 }}>{idx + 1}.</span>
                  <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.25rem', color: INK, fontWeight: 600 }}>{course.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={16} color={MUTED} />
                  <span style={{ fontFamily: 'var(--font-lora)', fontSize: '1rem', color: INK, fontWeight: 600 }}>
                    {formatCompactNumber(course.enrollments)}
                  </span>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center border border-dashed border-[#1e130c]/10">
                <p style={{ fontFamily: 'var(--font-lora)', fontStyle: 'italic', color: MUTED }}>
                  {t('reports.noCoursesInPeriod')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Courses by Category */}
        <div className="flex flex-col">
          <h2
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '2rem',
              fontWeight: 600,
              color: INK,
              marginBottom: '2rem',
              borderLeft: `4px solid ${ACCENT}`,
              paddingLeft: '1.5rem'
            }}
          >
            {t('reports.coursesByCategory')}
          </h2>

          <div className="space-y-6 mt-2">
            {reportData?.coursesPerCategory.length ? reportData.coursesPerCategory.map((cat, idx) => {
              const percentage = Math.round((cat.count / (reportData?.totalCourses || 1)) * 100)
              return (
                <div key={idx} className="relative group">
                  <div className="flex justify-between items-baseline mb-3">
                    <span style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', color: INK, fontWeight: 600 }}>
                      {cat.category}
                    </span>
                    <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: MUTED, fontStyle: 'italic', flexShrink: 0 }}>
                      {cat.count} / {percentage}%
                    </span>
                  </div>

                  {/* Régua de Graduação */}
                  <div className="relative w-full h-[4px]" style={{ backgroundColor: 'rgba(30,19,12,0.05)' }}>
                    <div
                      className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: ACCENT,
                        boxShadow: '0 0 10px rgba(139,109,34,0.2)'
                      }}
                    />
                  </div>
                </div>
              )
            }) : (
              <div className="py-20 text-center border border-dashed border-[#1e130c]/10">
                <p style={{ fontFamily: 'var(--font-lora)', fontStyle: 'italic', color: MUTED }}>
                  {t('reports.noCategoriesFound')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
"""

summary_pattern = r'\{\/\*\s*Data Summary\s*\*\/\}.*?(?=\{\/\*\s*Modal de Seleção)'
content = re.sub(summary_pattern, summary_replacement, content, flags=re.DOTALL)

with open('app/dashboard/reports/page.tsx', 'w') as f:
    f.write(content)
