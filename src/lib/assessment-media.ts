export type AssessmentMediaEntry = {
  image: string | null
  youtubeSearch: string | null
}

export const ASSESSMENT_MEDIA: Record<string, AssessmentMediaEntry> = {
  'shoulder-back-scratch': { image: '/movement-tests/shoulder-back-scratch.webp', youtubeSearch: 'back+scratch+test+shoulder+self+assessment' },
  'shoulder-wall-angel': { image: '/movement-tests/shoulder-wall-angel.jpg', youtubeSearch: 'wall+angel+shoulder+mobility+self+test' },
  'hip-single-leg-squat': { image: '/movement-tests/hip-single-leg-squat.jpg', youtubeSearch: 'single+leg+balance+squat+hip+control+self+test' },
  'hip-seated-rotation': { image: '/movement-tests/hip-seated-rotation.jpg', youtubeSearch: 'seated+hip+rotation+self+test' },
  'spine-seated-rotation': { image: '/movement-tests/spine-quadruped-t-rotation.jpg', youtubeSearch: 'quadruped+t+rotation+thoracic+self+test' },
  'spine-toe-touch': { image: '/movement-tests/spine-toe-touch.webp', youtubeSearch: 'toe+touch+test+posterior+chain+self+assessment' },
  deep_squat: {
    image: '/movement-tests/deep-squat.jpg',
    youtubeSearch: 'deep+squat+FMS+movement+screen+how+to+score',
  },
  hip_hinge: {
    image: '/movement-tests/hip-hinge.jpg',
    youtubeSearch: 'hip+hinge+movement+screen+assessment+how+to',
  },
  single_leg_balance: {
    image: null,
    youtubeSearch: 'single leg balance test athlete movement screen',
  },
  lunge: {
    image: '/movement-tests/inline-lunge.jpg',
    youtubeSearch: 'inline+lunge+FMS+movement+screen+assessment',
  },
  push_up_control: {
    image: null,
    youtubeSearch: 'push up control movement screen scapular core assessment',
  },
}

export function getAssessmentMedia(id: string) {
  return ASSESSMENT_MEDIA[id] || { image: null, youtubeSearch: null }
}
