import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAssetTypes } from "@/hooks/useAssetTypes";

interface AssetTypeSelectorProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  allowClear?: boolean;
}

export function AssetTypeSelector({ value, onChange, placeholder = "Select type...", allowClear = false }: AssetTypeSelectorProps) {
  const { data: types } = useAssetTypes();

  return (
    <Select value={value || ""} onValueChange={(v) => onChange(v === "__clear__" ? undefined : v)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowClear && <SelectItem value="__clear__">All Types</SelectItem>}
        {types?.map(t => (
          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
