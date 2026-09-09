import Svg, { Circle, Path, Rect } from 'react-native-svg';

export interface PackIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function PawAvatarIcon({ size = 22, color = '#000', strokeWidth = 1.6 }: PackIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 13c-3 0-5.5 2.4-5.5 5.2 0 1 .8 1.4 1.7 1.1 1.2-.4 2.4-.6 3.8-.6s2.6.2 3.8.6c.9.3 1.7-.1 1.7-1.1C17.5 15.4 15 13 12 13z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Circle cx="6.5" cy="9" r="1.6" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="10.3" cy="6.3" r="1.6" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="13.7" cy="6.3" r="1.6" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="17.5" cy="9" r="1.6" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function WalkIcon({ size = 18, color = '#000', strokeWidth = 1.8 }: PackIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 18l4-9 3 5 2-3 3 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="18" cy="7" r="2" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function WaterIcon({ size = 18, color = '#000', strokeWidth = 1.8 }: PackIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3c3 4 5 6.6 5 9.5a5 5 0 0 1-10 0C7 9.6 9 7 12 3z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function FoodIcon({ size = 18, color = '#000', strokeWidth = 1.8 }: PackIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 10a7 7 0 0 1 14 0v4H5v-4z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M9 20h6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function WeightIcon({ size = 18, color = '#000', strokeWidth = 1.8 }: PackIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="14" width="16" height="6" rx="2" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M8 14v-1a4 4 0 0 1 8 0v1" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckIcon({ size = 18, color = '#000', strokeWidth = 2 }: PackIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 12.5l5 5 10-11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function AlertIcon({ size = 18, color = '#000', strokeWidth = 1.8 }: PackIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4.5l8.5 14.5H3.5L12 4.5z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 10.5v3.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx="12" cy="17" r="0.9" fill={color} />
    </Svg>
  );
}
