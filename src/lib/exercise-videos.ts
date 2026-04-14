export type ExerciseVideoEntry = {
  slug: string
  title: string
  youtubeVideoId: string
  aliases: string[]
  area?: string
}

export const EXERCISE_VIDEO_LIBRARY: ExerciseVideoEntry[] = [
  // Add your unlisted YouTube video ids here as they are uploaded.
  // Example:
  // {
  //   slug: 'shoulder-cars',
  //   title: 'Shoulder CARS',
  //   youtubeVideoId: 'abc123XYZ',
  //   aliases: ['shoulder cars', 'controlled articular rotations shoulder'],
  //   area: 'shoulders',
  // },
]

function normalizeExerciseName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function getExerciseVideo(exerciseName: string) {
  const normalized = normalizeExerciseName(exerciseName)

  return EXERCISE_VIDEO_LIBRARY.find((entry) => {
    if (normalizeExerciseName(entry.title) === normalized) {
      return true
    }

    if (normalizeExerciseName(entry.slug.replace(/-/g, ' ')) === normalized) {
      return true
    }

    return entry.aliases.some((alias) => normalizeExerciseName(alias) === normalized)
  }) || null
}

export function getExerciseVideoEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
}

export function getExerciseVideoWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`
}
