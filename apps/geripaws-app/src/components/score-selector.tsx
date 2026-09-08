import { ChoiceChips } from '@/components/choice-chips';

const SCORE_OPTIONS = Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) }));

type Props = {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
};

export function ScoreSelector({ label, value, onChange }: Props) {
  return (
    <ChoiceChips
      label={label}
      options={SCORE_OPTIONS}
      value={value !== undefined ? String(value) : undefined}
      onChange={(v) => v !== undefined && onChange(Number(v))}
    />
  );
}
