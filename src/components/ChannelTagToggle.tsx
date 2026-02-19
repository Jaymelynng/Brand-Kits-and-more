import { useAssetChannels, useAssetChannelTags, useToggleChannelTag } from "@/hooks/useAssetChannels";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface ChannelTagToggleProps {
  assetId: string;
}

export function ChannelTagToggle({ assetId }: ChannelTagToggleProps) {
  const { data: channels } = useAssetChannels();
  const { data: activeChannelIds, isLoading } = useAssetChannelTags(assetId);
  const toggleTag = useToggleChannelTag();

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;

  return (
    <div className="flex flex-wrap gap-2">
      {channels?.map(ch => {
        const isActive = activeChannelIds?.includes(ch.id);
        return (
          <Badge
            key={ch.id}
            variant={isActive ? "default" : "outline"}
            className="cursor-pointer select-none transition-colors"
            onClick={() => toggleTag.mutate({ assetId, channelId: ch.id, active: !isActive })}
          >
            {ch.name}
          </Badge>
        );
      })}
    </div>
  );
}
