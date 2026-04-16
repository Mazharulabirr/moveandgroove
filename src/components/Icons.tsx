'use client'

import type { CSSProperties } from 'react'

export type IconName =
  | 'hips'
  | 'shoulders'
  | 'spine'
  | 'general'
  | 'duration'
  | 'recovery'
  | 'screening'
  | 'battery'
  | 'results'
  | 'readiness'
  | 'checkin'
  | 'programs'
  | 'deepSquat'
  | 'hipHinge'
  | 'shoulderPress'
  | 'lunge'
  | 'rotation'
  | 'sport'
  | 'focus'
  | 'balance'
  | 'performance'
  | 'mobility'
  | 'sleep'
  | 'soreness'
  | 'energy'
  | 'stress'
  | 'motivation'
  | 'pain'
  | 'checkbox'
  | 'star'
  | 'golf'
  | 'afl'
  | 'rugby'
  | 'soccer'
  | 'wrestling'
  | 'weightlifting'
  | 'cricket'
  | 'tennis'
  | 'basketball'
  | 'volleyball'
  | 'netball'
  | 'bjj'
  | 'kickboxing'
  | 'muaythai'
  | 'waterpolo'
  | 'highjump'
  | 'hurdles'
  | 'handball'
  | 'padel'

type IconProps = {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
  style?: CSSProperties
}

function Svg({
  children,
  size = 26,
  color = 'var(--silver)',
  strokeWidth = 1.5,
  style,
}: Omit<IconProps, 'name'> & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', ...style }}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function Icon({ name, size = 26, color = 'var(--silver)', strokeWidth = 1.5, style }: IconProps) {
  const shared = { size, color, strokeWidth, style }

  switch (name) {
    case 'hips':
      return <Svg {...shared}><circle cx="8" cy="7" r="2.5" /><path d="M10 8.5l3 2.5-1.2 2.6 2.7 4.4" /><path d="M7.2 9.4l1.6 4.2-3.6 4.9" /><circle cx="14.2" cy="13.2" r="1.8" /></Svg>
    case 'shoulders':
      return <Svg {...shared}><path d="M5 15c1.8-4 4.2-6 7-6s5.2 2 7 6" /><path d="M8 15c0 2.2 1.8 4 4 4s4-1.8 4-4" /><path d="M8 10.5V9a4 4 0 0 1 8 0v1.5" /></Svg>
    case 'spine':
      return <Svg {...shared}><path d="M12 4v16" /><circle cx="12" cy="6" r="1.5" /><circle cx="12" cy="10" r="1.5" /><circle cx="12" cy="14" r="1.5" /><circle cx="12" cy="18" r="1.5" /></Svg>
    case 'general':
      return <Svg {...shared}><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" /></Svg>
    case 'duration':
      return <Svg {...shared}><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></Svg>
    case 'recovery':
      return <Svg {...shared}><path d="M8 7H4V3" /><path d="M4 7a8 8 0 0 1 13.2-2.9" /><path d="M16 17h4v4" /><path d="M20 17A8 8 0 0 1 6.8 19.9" /></Svg>
    case 'screening':
      return <Svg {...shared}><path d="M7 3h8l3 3v15H7z" /><path d="M15 3v4h4" /><path d="M10 11h5" /><path d="M10 15h5" /></Svg>
    case 'battery':
      return <Svg {...shared}><path d="M5 19V9" /><path d="M11 19V5" /><path d="M17 19v-7" /><path d="M3 19h18" /></Svg>
    case 'results':
      return <Svg {...shared}><path d="M4 18l5-5 4 3 7-8" /><path d="M4 5v13h16" /></Svg>
    case 'readiness':
      return <Svg {...shared}><path d="M5 15a7 7 0 0 1 14 0" /><path d="M4 15h16" /><path d="M12 6V3" /><path d="M7 8 5 6" /><path d="M17 8l2-2" /></Svg>
    case 'checkin':
      return <Svg {...shared}><circle cx="12" cy="12" r="8" /><path d="m8.5 12 2.2 2.2L15.5 9.5" /></Svg>
    case 'programs':
      return <Svg {...shared}><rect x="4" y="5" width="16" height="15" rx="1.5" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M4 10h16" /><path d="M8 13h2" /><path d="M12 13h2" /><path d="M16 13h2" /><path d="M8 17h2" /><path d="M12 17h2" /></Svg>
    case 'deepSquat':
      return <Svg {...shared}><circle cx="12" cy="5" r="1.8" /><path d="M12 7.2v4.2l-3.2 2.6" /><path d="M12 11.4l3.6 2.4" /><path d="M8.8 14l-2.8 4" /><path d="M15.6 13.8 18 18" /><path d="M9.4 18h5.2" /></Svg>
    case 'hipHinge':
      return <Svg {...shared}><path d="M6 8a6 6 0 0 1 9-3" /><path d="M15 5h4V1" /><path d="M18 16a6 6 0 0 1-9 3" /><path d="M9 19H5v4" /><path d="M10 8l4 3-2 4" /></Svg>
    case 'shoulderPress':
      return <Svg {...shared}><circle cx="12" cy="6" r="1.8" /><path d="M12 8v5" /><path d="M8 10l-2-3" /><path d="M16 10l2-3" /><path d="M7 7h3" /><path d="M14 7h3" /><path d="M9.5 19 12 13l2.5 6" /></Svg>
    case 'lunge':
      return <Svg {...shared}><circle cx="12" cy="5.5" r="1.7" /><path d="M12 7.2 10 11" /><path d="M10 11 7 13.5" /><path d="M10 11l3.8 1.4" /><path d="M13.8 12.4 17 18" /><path d="M9.2 13.2 7.2 19" /></Svg>
    case 'rotation':
      return <Svg {...shared}><path d="M12 4a8 8 0 0 1 7.2 4.5" /><path d="M19 8V4h-4" /><path d="M12 20a8 8 0 0 1-7.2-4.5" /><path d="M5 16v4h4" /><path d="M13.5 8.5a3.8 3.8 0 0 0-4.8 5.8 3.8 3.8 0 0 0 5.8.1" /></Svg>
    case 'sport':
      return <Svg {...shared}><path d="M5 19 9 5l10 10" /><path d="M11 7 17 13" /><path d="M7 17l4-4" /></Svg>
    case 'focus':
      return <Svg {...shared}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3" /><path d="M12 19v3" /><path d="M2 12h3" /><path d="M19 12h3" /></Svg>
    case 'balance':
      return <Svg {...shared}><path d="M12 4v15" /><path d="M6 7h12" /><path d="m6 7-3 5h6z" /><path d="m18 7-3 5h6z" /><path d="M8 19h8" /></Svg>
    case 'performance':
      return <Svg {...shared}><path d="M8 4h8v4a4 4 0 0 1-8 0z" /><path d="M10 12v3l-2 2h8l-2-2v-3" /><path d="M7 4H5a2 2 0 0 0 0 4h3" /><path d="M17 4h2a2 2 0 0 1 0 4h-3" /></Svg>
    case 'mobility':
      return <Svg {...shared}><circle cx="12" cy="6" r="1.8" /><path d="M12 8v5" /><path d="m12 10 4-2" /><path d="m12 10-4-2" /><path d="m12 13 4 5" /><path d="m12 13-4 5" /></Svg>
    case 'sleep':
      return <Svg {...shared}><path d="M14 4a7 7 0 1 0 6 10 6 6 0 0 1-6-10z" /></Svg>
    case 'soreness':
      return <Svg {...shared}><path d="M12 4c1.6 2.6 4 3.5 4 6.2A4 4 0 0 1 12 14a4 4 0 0 1-4-3.8C8 7.5 10.4 6.6 12 4Z" /><path d="M12 14v6" /></Svg>
    case 'energy':
      return <Svg {...shared}><path d="M13 2 5 13h5l-1 9 8-11h-5l1-9z" /></Svg>
    case 'stress':
      return <Svg {...shared}><path d="M6 18c0-3 2.2-5 6-5s6 2 6 5" /><path d="M8 9a4 4 0 1 1 8 0c0 1.8-1 3-2 4" /><path d="M10 20h4" /></Svg>
    case 'motivation':
      return <Svg {...shared}><path d="M12 3 4 8l8 5 8-5-8-5Z" /><path d="M6 11v4c0 1.8 2.7 3 6 3s6-1.2 6-3v-4" /></Svg>
    case 'pain':
      return <Svg {...shared}><path d="m12 4 7 12H5L12 4Z" /><path d="M12 9v3" /><path d="M12 15h.01" /></Svg>
    case 'checkbox':
      return <Svg {...shared}><rect x="5" y="5" width="14" height="14" rx="2" /><path d="m8.5 12 2.2 2.2 4.8-5" /></Svg>
    case 'star':
      return <Svg {...shared}><path d="m12 4 2.3 4.7 5.2.8-3.8 3.7.9 5.2L12 16l-4.6 2.4.9-5.2L4.5 9.5l5.2-.8Z" /></Svg>
    case 'golf':
      return <Svg {...shared}><path d="M12 3v18" /><path d="m12 4 5 2-5 2" /><path d="M9 21h6" /></Svg>
    case 'afl':
      return <Svg {...shared}><path d="M8 7c2-2 6-2 8 0s2 6 0 8-6 2-8 0-2-6 0-8Z" /><path d="M10 9h4" /><path d="M10 15h4" /></Svg>
    case 'rugby':
      return <Svg {...shared}><path d="M7 9c4-4 6-4 10 0-4 4-6 4-10 0Z" /><path d="M9 8 7 6" /><path d="M15 8l2-2" /><path d="M9 10l-2 2" /><path d="M15 10l2 2" /></Svg>
    case 'soccer':
      return <Svg {...shared}><circle cx="12" cy="12" r="8" /><path d="m12 8 2.3 1.7-.9 2.8h-2.8l-.9-2.8Z" /></Svg>
    case 'wrestling':
      return <Svg {...shared}><circle cx="9" cy="7" r="1.5" /><circle cx="15" cy="7" r="1.5" /><path d="M8 9.5 6 13l2 2" /><path d="M16 9.5 18 13l-2 2" /><path d="M9.5 11.5h5" /></Svg>
    case 'weightlifting':
      return <Svg {...shared}><path d="M4 10v4" /><path d="M7 8v8" /><path d="M9 12h6" /><path d="M17 8v8" /><path d="M20 10v4" /></Svg>
    case 'cricket':
      return <Svg {...shared}><path d="M9 6 16 13" /><path d="M7.5 7.5 5 5" /><path d="M14.5 14.5 18 18" /><circle cx="17.5" cy="7.5" r="2" /></Svg>
    case 'tennis':
      return <Svg {...shared}><ellipse cx="10" cy="10" rx="4" ry="5" /><path d="M13 14l4 4" /><path d="M8 6c1 2 3 4 5 5" /></Svg>
    case 'basketball':
      return <Svg {...shared}><circle cx="12" cy="12" r="8" /><path d="M12 4a12 12 0 0 1 0 16" /><path d="M12 4a12 12 0 0 0 0 16" /><path d="M4 12h16" /></Svg>
    case 'volleyball':
      return <Svg {...shared}><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 6.8 3.8" /><path d="M8 5a8 8 0 0 0 4 7" /><path d="M6 15a8 8 0 0 0 10-2" /></Svg>
    case 'netball':
      return <Svg {...shared}><circle cx="12" cy="12" r="8" /><path d="M7 7h10" /><path d="M7 17h10" /><path d="M7 7v10" /><path d="M17 7v10" /></Svg>
    case 'bjj':
      return <Svg {...shared}><path d="M8 7h8" /><path d="M10 7v10" /><path d="M14 7v10" /><path d="M8 12h8" /><path d="M6 17h12" /></Svg>
    case 'kickboxing':
      return <Svg {...shared}><path d="M7 15c2-3 5-5 9-5" /><path d="M11 9 9 6" /><path d="M16 10l2 2" /><path d="M6 17h6" /></Svg>
    case 'muaythai':
      return <Svg {...shared}><path d="M8 16c3-4 5-6 8-8" /><path d="M11 8 9 5" /><path d="M15 12h4" /><path d="M5 18h7" /></Svg>
    case 'waterpolo':
      return <Svg {...shared}><path d="M4 17c1.8-1.6 3.8-1.6 5.6 0s3.8 1.6 5.6 0 3.8-1.6 5.6 0" /><circle cx="15.5" cy="7.5" r="2.2" /><path d="M9 11c1.5-1.8 3.2-2.7 5-2.7" /><path d="M11 12.5 8.5 15" /></Svg>
    case 'highjump':
      return <Svg {...shared}><path d="M4 18h16" /><path d="M16 6v10" /><path d="M8 8.5h8" /><circle cx="8" cy="7" r="1.5" /><path d="M8 8.5l2.5 3.5" /><path d="M10.5 12 7 16" /></Svg>
    case 'hurdles':
      return <Svg {...shared}><path d="M4 18h16" /><path d="M7 18v-6h5" /><path d="M16 18v-6h4" /><circle cx="9" cy="6.5" r="1.4" /><path d="M9 8l2 3 3-.5" /><path d="M11 11 8 16" /></Svg>
    case 'handball':
      return <Svg {...shared}><circle cx="15.5" cy="6.5" r="2" /><path d="M11 10c2-2.2 3.6-3.2 5.5-3.5" /><path d="M11 10 8 14l2.5 3.5" /><path d="M13 11.5l4 2.5" /></Svg>
    case 'padel':
      return <Svg {...shared}><path d="M9 6a4 4 0 0 1 4 4v4H9a3 3 0 0 1 0-6Z" /><path d="M13 14l4 4" /><circle cx="10.5" cy="10.5" r="0.8" fill="currentColor" stroke="none" /></Svg>
    default:
      return <Svg {...shared}><circle cx="12" cy="12" r="8" /></Svg>
  }
}

type StandaloneIconProps = Omit<IconProps, 'name'>

export function IconHips(props: StandaloneIconProps) { return <Icon name="hips" {...props} /> }
export function IconShoulders(props: StandaloneIconProps) { return <Icon name="shoulders" {...props} /> }
export function IconSpine(props: StandaloneIconProps) { return <Icon name="spine" {...props} /> }
export function IconGeneral(props: StandaloneIconProps) { return <Icon name="general" {...props} /> }
export function IconRoutine(props: StandaloneIconProps) { return <Icon name="duration" {...props} /> }
export function IconRecovery(props: StandaloneIconProps) { return <Icon name="recovery" {...props} /> }
export function IconScreening(props: StandaloneIconProps) { return <Icon name="screening" {...props} /> }
export function IconBattery(props: StandaloneIconProps) { return <Icon name="battery" {...props} /> }
export function IconResults(props: StandaloneIconProps) { return <Icon name="results" {...props} /> }
export function IconReadiness(props: StandaloneIconProps) { return <Icon name="readiness" {...props} /> }
export function IconCheckin(props: StandaloneIconProps) { return <Icon name="checkin" {...props} /> }
export function IconPrograms(props: StandaloneIconProps) { return <Icon name="programs" {...props} /> }
export function IconSquat(props: StandaloneIconProps) { return <Icon name="deepSquat" {...props} /> }
export function IconHinge(props: StandaloneIconProps) { return <Icon name="hipHinge" {...props} /> }
export function IconPress(props: StandaloneIconProps) { return <Icon name="shoulderPress" {...props} /> }
export function IconLunge(props: StandaloneIconProps) { return <Icon name="lunge" {...props} /> }
export function IconRotation(props: StandaloneIconProps) { return <Icon name="rotation" {...props} /> }
export function IconStar(props: StandaloneIconProps) { return <Icon name="star" {...props} /> }
export function IconSleep(props: StandaloneIconProps) { return <Icon name="sleep" {...props} /> }
export function IconSoreness(props: StandaloneIconProps) { return <Icon name="soreness" {...props} /> }
export function IconEnergy(props: StandaloneIconProps) { return <Icon name="energy" {...props} /> }
export function IconStress(props: StandaloneIconProps) { return <Icon name="stress" {...props} /> }
export function IconMotivation(props: StandaloneIconProps) { return <Icon name="motivation" {...props} /> }
export function IconPain(props: StandaloneIconProps) { return <Icon name="pain" {...props} /> }
export function IconCheckbox(props: StandaloneIconProps) { return <Icon name="checkbox" {...props} /> }
export function IconFocus(props: StandaloneIconProps) { return <Icon name="focus" {...props} /> }
export function IconBalance(props: StandaloneIconProps) { return <Icon name="balance" {...props} /> }
export function IconPerformance(props: StandaloneIconProps) { return <Icon name="performance" {...props} /> }
