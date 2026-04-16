export type AssessmentMediaEntry = {
  image: string | null
  youtubeSearch: string | null
}

export const ASSESSMENT_MEDIA: Record<string, AssessmentMediaEntry> = {
  activity_level: { image: null, youtubeSearch: null },
  pain_presence: { image: null, youtubeSearch: null },
  hip_flexion: {
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=700&q=80&fit=crop',
    youtubeSearch: 'knee+to+chest+hip+flexion+mobility+self+test',
  },
  hip_rotation: {
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=700&q=80&fit=crop',
    youtubeSearch: 'hip+internal+external+rotation+mobility+self+test+seated',
  },
  hip_stiffness: {
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=700&q=80&fit=crop',
    youtubeSearch: 'morning+hip+stiffness+mobility+assessment',
  },
  shoulder_overhead: {
    image: 'https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?w=700&q=80&fit=crop',
    youtubeSearch: 'shoulder+overhead+mobility+wall+test+assessment',
  },
  shoulder_rotation: {
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=700&q=80&fit=crop',
    youtubeSearch: 'apley+scratch+test+shoulder+rotation+mobility',
  },
  shoulder_stability: {
    image: 'https://images.unsplash.com/photo-1616803689943-5601631c7fec?w=700&q=80&fit=crop',
    youtubeSearch: 'shoulder+stability+rotator+cuff+self+assessment',
  },
  thoracic_rotation: {
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80&fit=crop',
    youtubeSearch: 'thoracic+spine+rotation+mobility+seated+test',
  },
  lumbar_flexion: {
    image: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=700&q=80&fit=crop',
    youtubeSearch: 'toe+touch+test+lumbar+flexibility+assessment',
  },
  spine_pain: {
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=700&q=80&fit=crop',
    youtubeSearch: null,
  },
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

