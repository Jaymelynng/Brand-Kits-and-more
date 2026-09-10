import { GymWithColors } from "@/hooks/useGyms";

export type CopyWhat = "colors" | "logos" | "both";
export type CopyStyle = "named" | "bare";

const sortedLogos = (gym: GymWithColors) =>
  [...(gym.logos || [])].sort(
    (a, b) => Number(!!b.is_main_logo) - Number(!!a.is_main_logo)
  );

/** One place that decides what a copy contains. */
export const buildCopyText = (
  gyms: GymWithColors[],
  what: CopyWhat,
  style: CopyStyle
): string => {
  const blocks = gyms.map((gym) => {
    const lines: string[] = [];
    const heading = `${gym.name} (${gym.code}):`;

    if (what === "colors" || what === "both") {
      const hexes = (gym.colors || []).map((c) => c.color_hex);
      if (style === "named") {
        lines.push(heading);
        if (what === "both") lines.push("Colors:");
        lines.push(...hexes);
      } else {
        lines.push(...hexes);
      }
    }

    if (what === "logos" || what === "both") {
      const logos = sortedLogos(gym);
      if (style === "named") {
        if (what === "logos") lines.push(heading);
        if (what === "both" && logos.length > 0) lines.push("Logos:");
        logos.forEach((l) => lines.push(`${l.filename || "logo"}: ${l.file_url}`));
      } else {
        logos.forEach((l) => lines.push(l.file_url));
      }
    }

    return lines.join("\n");
  });

  return blocks.filter(Boolean).join("\n\n");
};

export const countCopy = (gyms: GymWithColors[], what: CopyWhat) => {
  const colors =
    what === "logos" ? 0 : gyms.reduce((n, g) => n + (g.colors?.length || 0), 0);
  const logos =
    what === "colors" ? 0 : gyms.reduce((n, g) => n + (g.logos?.length || 0), 0);
  return { gyms: gyms.length, colors, logos };
};
