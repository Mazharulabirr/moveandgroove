type RoutineBackgroundInput = {
  sport?: string | null
  areas?: string[] | null
}

type RoutineBackgroundMatch = {
  image: string
  position?: string
}

const DEFAULT_ROUTINE_BACKGROUND: RoutineBackgroundMatch = {
  image: '/athlete-backgrounds/athletix-foam-roll.jpg',
  position: 'center 18%',
}

const SPORT_BACKGROUND_MAP: Record<string, RoutineBackgroundMatch> = {
  afl: { image: '/athlete-backgrounds/auth-login.avif', position: 'center 18%' },
  rugby: { image: '/athlete-backgrounds/rugby-team.jpg', position: 'center 18%' },
  soccer: { image: '/athlete-backgrounds/rugby-team.jpg', position: 'center 18%' },
  netball: { image: '/athlete-backgrounds/rugby-team.jpg', position: 'center 18%' },
  basketball: { image: '/athlete-backgrounds/auth-login.avif', position: 'center 18%' },
  volleyball: { image: '/athlete-backgrounds/auth-login.avif', position: 'center 18%' },
  cricket: { image: '/athlete-backgrounds/cricket-mobility.jpg', position: 'center 14%' },
  golf: { image: '/athlete-backgrounds/athletix-foam-roll.jpg', position: 'center 18%' },
  tennis: { image: '/athlete-backgrounds/athletix-foam-roll.jpg', position: 'center 18%' },
  padel: { image: '/athlete-backgrounds/athletix-foam-roll.jpg', position: 'center 18%' },
  wrestling: { image: '/athlete-backgrounds/bjj-training.jpg', position: 'center 16%' },
  bjj: { image: '/athlete-backgrounds/bjj-training.jpg', position: 'center 16%' },
  weightlifting: { image: '/athlete-backgrounds/athletix-foam-roll.jpg', position: 'center 18%' },
  kickboxing: { image: '/athlete-backgrounds/muaythai-fight.jpg', position: 'center 18%' },
  muaythai: { image: '/athlete-backgrounds/muaythai-fight.jpg', position: 'center 18%' },
  waterpolo: { image: '/athlete-backgrounds/athletix-foam-roll.jpg', position: 'center 18%' },
  highjump: { image: '/athlete-backgrounds/auth-login.avif', position: 'center 18%' },
  hurdles: { image: '/athlete-backgrounds/auth-login.avif', position: 'center 18%' },
  handball: { image: '/athlete-backgrounds/auth-login.avif', position: 'center 18%' },
}

const AREA_BACKGROUND_MAP: Record<string, RoutineBackgroundMatch> = {
  shoulders: { image: '/athlete-backgrounds/cricket-mobility.jpg', position: 'center 14%' },
  shoulder: { image: '/athlete-backgrounds/cricket-mobility.jpg', position: 'center 14%' },
  hips: { image: '/athlete-backgrounds/athletix-foam-roll.jpg', position: 'center 18%' },
  hip: { image: '/athlete-backgrounds/athletix-foam-roll.jpg', position: 'center 18%' },
  spine: { image: '/athlete-backgrounds/cricket-mobility.jpg', position: 'center 14%' },
  thoracic: { image: '/athlete-backgrounds/cricket-mobility.jpg', position: 'center 14%' },
  lumbar: { image: '/athlete-backgrounds/cricket-mobility.jpg', position: 'center 14%' },
  fullbody: DEFAULT_ROUTINE_BACKGROUND,
  'full body': DEFAULT_ROUTINE_BACKGROUND,
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function pickRoutineBackground({ sport, areas }: RoutineBackgroundInput): RoutineBackgroundMatch {
  if (sport) {
    const sportMatch = SPORT_BACKGROUND_MAP[normalizeKey(sport)]
    if (sportMatch) {
      return sportMatch
    }
  }

  for (const area of areas || []) {
    const areaMatch = AREA_BACKGROUND_MAP[normalizeKey(area)]
    if (areaMatch) {
      return areaMatch
    }
  }

  return DEFAULT_ROUTINE_BACKGROUND
}
