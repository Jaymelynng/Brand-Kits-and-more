import { useAssetChannels } from "@/hooks/useAssetChannels";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ChannelCheckboxesProps {
  selected: string[];
  onChange: (channelIds: string[]) => void;
}

export function ChannelCheckboxes({ selected, onChange }: ChannelCheckboxesProps) {
  const { data: channels } = useAssetChannels();

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter(c => c !== id)
        : [...selected, id]
    );
  };

  return (
    <div className="flex flex-wrap gap-3">
      {channels?.map(ch => (
        <div key={ch.id} className="flex items-center gap-1.5">
          <Checkbox
            id={`channel-${ch.id}`}
            checked={selected.includes(ch.id)}
            onCheckedChange={() => toggle(ch.id)}
          />
          <Label htmlFor={`channel-${ch.id}`} className="text-sm cursor-pointer">
            {ch.name}
          </Label>
        </div>
      ))}
    </div>
  );
}
