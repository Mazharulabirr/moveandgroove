export type AssessmentMediaEntry = {
  image: string | null
  youtubeSearch: string | null
}

export const ASSESSMENT_MEDIA: Record<string, AssessmentMediaEntry> = {
  'shoulder-back-scratch': { image: null, youtubeSearch: 'back+scratch+test+shoulder+self+assessment' },
  'shoulder-wall-angel': { image: null, youtubeSearch: 'wall+angel+shoulder+mobility+self+test' },
  'hip-single-leg-squat': { image: null, youtubeSearch: 'single+leg+balance+squat+hip+control+self+test' },
  'hip-seated-rotation': { image: null, youtubeSearch: 'seated+hip+rotation+self+test' },
  'spine-seated-rotation': { image: '/movement-tests/seated-rotation.png', youtubeSearch: 'seated+trunk+rotation+self+test' },
  'spine-toe-touch': { image: null, youtubeSearch: 'toe+touch+test+posterior+chain+self+assessment' },
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
