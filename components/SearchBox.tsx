import AppSearchField from './ui/AppSearchField';

type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  preview?: string;
  className?: string;
};

/**
 * Backward-compatible wrapper around the canonical AppSearchField.
 *
 * Keep this shim so any legacy imports of components/SearchBox continue to work,
 * while all search rendering is owned by one UI primitive.
 */
export default function SearchBox({ value, onChange, preview, className }: SearchBoxProps) {
  return (
    <AppSearchField
      value={value}
      onChange={onChange}
      placeholder={preview || 'جستجو...'}
      className={className}
      size="lg"
      clearable
    />
  );
}
