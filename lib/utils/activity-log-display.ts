type ActivityLogLike = {
  action?: string | null
  entity_id?: string | null
  entity_name?: string | null
  metadata?: Record<string, unknown> | null
}

function getMetadataCourseTitle(metadata?: Record<string, unknown> | null) {
  const courseTitle = metadata?.courseTitle
  return typeof courseTitle === 'string' && courseTitle.trim() !== ''
    ? courseTitle
    : null
}

export function resolveActivityEntityName(
  activity: ActivityLogLike,
  courseTitlesById: Map<string, string>
) {
  if (activity.action !== 'enroll_students') {
    return activity.entity_name ?? null
  }

  const courseTitleFromMetadata = getMetadataCourseTitle(activity.metadata)
  if (courseTitleFromMetadata) {
    return courseTitleFromMetadata
  }

  if (activity.entity_id) {
    const courseTitle = courseTitlesById.get(activity.entity_id)
    if (courseTitle) {
      return courseTitle
    }
  }

  return activity.entity_name ?? null
}
