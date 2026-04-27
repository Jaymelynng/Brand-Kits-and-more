import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { generateQRCode, type QRFrameShape } from "@/utils/qrGenerator";
import { saveGeneratedQR, saveBulkGeneratedQRs } from "@/services/qrService";
import { supabase } from "@/integrations/supabase/client";
import { Download, Save, Layers, RefreshCw, X, AlertTriangle, QrCode, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { UrlPreview } from "./UrlPreview";

interface GeneratedQR {
  content: string;
  imageUrl: string;
  title?: string;
  sublabel?: string;
  resolvedGymId?: string;
  resolvedGymName?: string;
  resolvedGymCode?: string;
}

interface ParsedBulkEntry {
  content: string;
  label?: string;
  sublabel?: string;
  resolvedGymId?: string;
  resolvedGymName?: string;
  resolvedGymCode?: string;
  isGymResolved: boolean;
  validationMessage?: string;
  detectedGymCode?: string;
  detectedGymName?: string;
}

interface Logo {
  file: File;
  name: string;
  preview: string;
  image: HTMLImageElement;
}

interface GymWithLogo {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  primaryColor?: string;
}

const slugifyFilenamePart = (value?: string | null) => value
  ?.toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildBulkFilename = (gymCode?: string | null, title?: string | null, index = 0) => {
  const label = slugifyFilenamePart(title) || `qr-${index + 1}`;
  const normalizedGymCode = gymCode?.trim().toUpperCase();

  return normalizedGymCode ? `(${normalizedGymCode})-_${label}.png` : `${label}.png`;
};

const DESTINATION_TYPES = [
  'Classes', 'Waiver', 'Login', 'Trial', 'Camp', 'Event', 'Registration', 'Website', 'Other'
];

// ─── Gym Logo Grid ───────────────────────────────────────────────────
const GymLogoGrid = ({
  gyms,
  selected,
  onToggle,
  multi = false,
}: {
  gyms: GymWithLogo[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  multi?: boolean;
}) => {
  if (gyms.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--brand-navy) / 0.7)' }}>
          {multi ? 'Select Gyms for Logo Matching' : 'Select Gym'}
        </Label>
        <span className="text-xs font-medium" style={{ color: 'hsl(var(--brand-rose-gold))' }}>
          {selected.size} selected
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-2 p-3 rounded-xl" style={{
        background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.08), hsl(var(--brand-rose-gold) / 0.04))',
        border: '1px solid hsl(var(--brand-rose-gold) / 0.2)',
      }}>
        {gyms.map((gym) => {
          const isSelected = selected.has(gym.id);
          const color = gym.primaryColor || '#b48f8f';
          return (
            <div
              key={gym.id}
              onClick={() => onToggle(gym.id)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-1.5 py-1.5 cursor-pointer rounded-lg transition-all duration-200",
                isSelected ? "scale-105" : "opacity-60 hover:opacity-100"
              )}
              style={{
                border: isSelected ? `3px solid ${color}` : '2px solid hsl(var(--brand-rose-gold) / 0.25)',
                background: '#fff',
                boxShadow: isSelected
                  ? `0 3px 12px ${color}40, 0 1px 4px rgba(0,0,0,0.12)`
                  : '0 1px 4px rgba(0,0,0,0.06)',
                minWidth: '52px',
              }}
              title={gym.name}
            >
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center z-10" style={{ backgroundColor: color }}>
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <div className="w-9 h-9 flex items-center justify-center rounded overflow-hidden">
                {gym.logoUrl ? (
                  <img src={gym.logoUrl} alt={gym.code} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center rounded text-[10px] font-bold text-white" style={{ backgroundColor: color }}>
                    {gym.code}
                  </div>
                )}
              </div>
              <span className="text-[9px] font-bold tracking-wider" style={{ color: isSelected ? color : 'hsl(var(--brand-navy) / 0.5)' }}>
                {gym.code}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────
export const QRGenerator = () => {
  // Single mode state
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [singleLogo, setSingleLogo] = useState<Logo | null>(null);
  const [singleGymId, setSingleGymId] = useState<string>("");
  const [destinationType, setDestinationType] = useState("");
  const [showSingleLabel, setShowSingleLabel] = useState(false);

  // Bulk mode state
  const [batchTitle, setBatchTitle] = useState("");
  const [bulkContent, setBulkContent] = useState("");
  const [generatedQRs, setGeneratedQRs] = useState<GeneratedQR[]>([]);
  const [selectedBulkGyms, setSelectedBulkGyms] = useState<Set<string>>(new Set());
  const [showBulkLabel, setShowBulkLabel] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [gyms, setGyms] = useState<GymWithLogo[]>([]);
  const [gymLogoImages, setGymLogoImages] = useState<Map<string, HTMLImageElement>>(new Map());

  // Bulk QR size — applies to every QR in the batch (single + bulk). Persisted per session.
  const [bulkSize, setBulkSize] = useState<number>(() => {
    if (typeof window === 'undefined') return 512;
    const stored = window.sessionStorage.getItem('qr-bulk-size');
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return Number.isFinite(parsed) && parsed >= 256 && parsed <= 2048 ? parsed : 512;
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('qr-bulk-size', String(bulkSize));
    }
  }, [bulkSize]);

  // Debounced size for live regeneration (prevents thrash while dragging slider)
  const [debouncedSize, setDebouncedSize] = useState(bulkSize);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSize(bulkSize), 150);
    return () => clearTimeout(t);
  }, [bulkSize]);

  // Frame shape — applies to every QR. Persisted per session.
  const [frameShape, setFrameShape] = useState<QRFrameShape>(() => {
    if (typeof window === 'undefined') return 'square';
    const stored = window.sessionStorage.getItem('qr-frame-shape') as QRFrameShape | null;
    return stored && ['square', 'tall', 'wide', 'rounded', 'circle'].includes(stored) ? stored : 'square';
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('qr-frame-shape', frameShape);
    }
  }, [frameShape]);

  // Load gyms with logos
  useEffect(() => {
    const load = async () => {
      const { data: gymData } = await supabase.from('gyms').select('id, name, code').order('name');
      if (!gymData) return;
      const { data: logos } = await supabase.from('gym_logos').select('gym_id, file_url, is_main_logo');
      const { data: colors } = await supabase.from('gym_colors').select('gym_id, color_hex, order_index').order('order_index');

      const gymsWithLogos: GymWithLogo[] = gymData.map(g => {
        const mainLogo = logos?.find(l => l.gym_id === g.id && l.is_main_logo) || logos?.find(l => l.gym_id === g.id);
        const primaryColor = colors?.find(c => c.gym_id === g.id)?.color_hex;
        return { ...g, logoUrl: mainLogo?.file_url, primaryColor };
      });
      setGyms(gymsWithLogos);

      // Preload logo images for QR overlay
      const imgMap = new Map<string, HTMLImageElement>();
      for (const gym of gymsWithLogos) {
        if (gym.logoUrl) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = gym.logoUrl;
          img.onload = () => imgMap.set(gym.id, img);
        }
      }
      // Store after a short delay to allow images to load
      setTimeout(() => setGymLogoImages(new Map(imgMap)), 2000);
    };
    load();
  }, []);

  // Live regenerate single QR when size changes
  useEffect(() => {
    if (!qrImage || !content.trim()) return;
    let cancelled = false;
    (async () => {
      try {
        const imageUrl = await generateQRCode({
          content,
          size: debouncedSize,
          frameShape,
          logoImage: singleLogo?.image,
          label: showSingleLabel && title ? title : undefined,
        });
        if (!cancelled) setQrImage(imageUrl);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSize, frameShape]);

  // Live regenerate bulk QRs when size changes
  useEffect(() => {
    if (generatedQRs.length === 0) return;
    let cancelled = false;
    (async () => {
      const updated: GeneratedQR[] = [];
      for (const qr of generatedQRs) {
        const matchedLogo = qr.resolvedGymId ? gymLogoImages.get(qr.resolvedGymId) : undefined;
        try {
          const imageUrl = await generateQRCode({
            content: qr.content,
            size: debouncedSize,
            frameShape,
            logoImage: matchedLogo,
            label: showBulkLabel && qr.title ? qr.title : undefined,
            sublabel: showBulkLabel ? qr.sublabel : undefined,
          });
          updated.push({ ...qr, imageUrl });
        } catch {
          updated.push(qr);
        }
      }
      if (!cancelled) setGeneratedQRs(updated);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSize, frameShape]);

  // Single mode: auto-load logo when gym selected
  const singleSelectedSet = useMemo(() => singleGymId ? new Set([singleGymId]) : new Set<string>(), [singleGymId]);

  const handleSingleGymToggle = (gymId: string) => {
    if (singleGymId === gymId) {
      setSingleGymId("");
      setSingleLogo(null);
    } else {
      setSingleGymId(gymId);
      // Auto-load logo
      const gym = gyms.find(g => g.id === gymId);
      if (gym?.logoUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setSingleLogo({ file: new File([], gym.name), name: gym.name, preview: gym.logoUrl!, image: img });
        };
        img.src = gym.logoUrl;
      }
    }
  };

  const handleBulkGymToggle = (gymId: string) => {
    setSelectedBulkGyms(prev => {
      const next = new Set(prev);
      if (next.has(gymId)) next.delete(gymId); else next.add(gymId);
      return next;
    });
  };

  // ─── Parsing Logic ─────────────────────────────────────────────────
  // URL-first approach: find every URL in the text, then look around each one
  // for an associated label / gym code. Tolerates almost any layout:
  //   "CCP   https://..."           (code + spaces/tabs + URL)
  //   "CCP, https://..."            (any punctuation between)
  //   "CCP — Trial — https://..."   (multi-part label)
  //   "https://...   CCP"           (URL first, label after)
  //   "CCP\nhttps://..."            (label on previous line)
  //   "Capital Gymnastics (CCP): https://..." etc.

  const URL_REGEX_SRC = "(?:https?:\\/\\/|mailto:|tel:)[^\\s<>\"'`)\\]}|]+";

  const stripUrlEdges = (url: string): string => {
    let u = url.trim();
    while (u.length > 0) {
      const last = u[u.length - 1];
      if ('.,;:!?'.includes(last)) { u = u.slice(0, -1); continue; }
      if (last === ')' && !u.includes('(')) { u = u.slice(0, -1); continue; }
      if (last === ']' && !u.includes('[')) { u = u.slice(0, -1); continue; }
      if (last === '}' && !u.includes('{')) { u = u.slice(0, -1); continue; }
      break;
    }
    return u;
  };

  const cleanUrl = (url: string): string => stripUrlEdges(url).replace(/\s*\([^)]*\)\s*$/, '').trim();

  const cleanLabel = (raw: string): string => {
    let s = raw.trim();
    s = s.replace(/^[\s>"'`]*[-*•·▪▸➤→›»#]+\s*/u, '');
    s = s.replace(/^\s*\d+[.)\]]\s*/, '');
    s = s.replace(/^\(\s*\d+\s*\)\s*/, '');
    s = s.replace(/^[\u{1F300}-\u{1FAF8}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]+\s*/u, '');
    s = s.replace(/^["'`]+|["'`]+$/g, '');
    s = s.replace(/[\s\-–—:|,;>=→]+$/u, '');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  };

  const isSeparatorLine = (line: string) => /^[═─━\-=_*]{3,}$/.test(line.trim()) || /^[\s═─━\-=_*│|]+$/.test(line.trim());
  const isCategoryHeader = (line: string) => {
    const t = line.trim();
    if (!t || t.length < 3) return false;
    return /^[A-Z][A-Z\s–—\-:&/|,]+$/.test(t) && !/^https?:\/\//i.test(t);
  };
  const detectGymHeader = (line: string): { name: string; code: string } | null => {
    const t = line.trim();
    const match = t.match(/^(.+?)\s*\(([A-Z0-9]{2,8})\)\s*$/i);
    if (match) return { name: match[1].trim(), code: match[2].toUpperCase() };
    return null;
  };

  const parseMultiLineEntries = (text: string) => {
    if (!text || !text.trim()) return [];

    type Entry = { label?: string; sublabel?: string; content: string; detectedGymCode?: string; detectedGymName?: string };
    const entries: Entry[] = [];
    const rawLines = text.split(/\r?\n/);

    let currentGymCode: string | undefined;
    let currentGymName: string | undefined;

    for (const rawLine of rawLines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (isSeparatorLine(line)) continue;

      const hasUrl = new RegExp(URL_REGEX_SRC, 'i').test(line);

      // Section header "Gym Name (CODE)" with no URL — sets context, no entry
      if (!hasUrl) {
        const gymHeader = detectGymHeader(line);
        if (gymHeader) {
          currentGymCode = gymHeader.code;
          currentGymName = gymHeader.name;
          continue;
        }
        if (isCategoryHeader(line)) continue;
        const cleaned = cleanLabel(line);
        if (cleaned) {
          entries.push({ content: '__PENDING_LABEL__', label: cleaned, detectedGymCode: currentGymCode, detectedGymName: currentGymName });
        }
        continue;
      }

      // Find every URL on this line
      const urls: { match: string; index: number; clean: string }[] = [];
      const re = new RegExp(URL_REGEX_SRC, 'gi');
      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        const clean = cleanUrl(m[0]);
        if (clean) urls.push({ match: m[0], index: m.index, clean });
      }
      if (urls.length === 0) continue;

      let cursor = 0;
      for (let u = 0; u < urls.length; u++) {
        const url = urls[u];
        const before = line.slice(cursor, url.index);
        const after = u === urls.length - 1 ? line.slice(url.index + url.match.length) : '';

        let labelText = before;
        if (!labelText.trim() && after.trim()) labelText = after;
        labelText = labelText.replace(/[\s\-–—:|,;>=→\t]+$/u, '');
        const label = cleanLabel(labelText);

        entries.push({
          content: url.clean,
          label: label || undefined,
          detectedGymCode: currentGymCode,
          detectedGymName: currentGymName,
        });
        cursor = url.index + url.match.length;
      }
    }

    // Merge orphan label lines with the following entry
    const merged: Entry[] = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.content === '__PENDING_LABEL__') {
        const next = entries[i + 1];
        if (next && next.content !== '__PENDING_LABEL__') {
          if (next.label) {
            merged.push({ ...next, sublabel: next.sublabel || e.label });
          } else {
            merged.push({ ...next, label: e.label });
          }
          i++;
        }
        continue;
      }
      merged.push(e);
    }

    return merged;
  };

  const checkMismatch = (label: string | undefined, url: string): boolean => {
    if (!label) return false;
    try {
      const pathSlug = new URL(url).pathname.replace(/\//g, '').toLowerCase();
      if (!pathSlug) return false;
      const words = label.toLowerCase().split(/[\s\-()]+/).filter(w => w.length > 2);
      return !words.some(w => pathSlug.includes(w));
    } catch { return false; }
  };

  const selectedBulkGymRecords = useMemo(
    () => gyms.filter((gym) => selectedBulkGyms.has(gym.id)),
    [gyms, selectedBulkGyms],
  );

  // Auto-assign a gym by scanning a URL + label for the gym's code, full name,
  // or any meaningful name token. Returns the highest-scoring gym, or undefined
  // if no confident match exists. Score weights:
  //   +10 explicit code match (whole-word)         e.g. "/CCP/" or " CCP "
  //   +6  full-name slug match                      e.g. "oasisgymnastics"
  //   +3  per meaningful name-token match (≥4 chars unique to that gym)
  //   +2  per shorter token match (3 chars)
  // Ties are broken by code length (longer = more specific).
  const autoAssignGym = (
    label: string | undefined,
    url: string,
    available: GymWithLogo[],
  ): GymWithLogo | undefined => {
    if (available.length === 0) return undefined;

    const haystackRaw = `${label || ''} ${url}`.toLowerCase();
    // Normalized haystack: strip non-alphanumerics so "cap-gym-avery" matches "capgymavery"
    const haystackSlug = haystackRaw.replace(/[^a-z0-9]/g, '');
    if (!haystackSlug) return undefined;

    // Stop-words that appear in many gym names — don't count toward score
    const STOP = new Set(['gym', 'gyms', 'gymnastics', 'academy', 'center', 'centre', 'the', 'and']);

    type Scored = { gym: GymWithLogo; score: number };
    const scored: Scored[] = [];

    for (const gym of available) {
      let score = 0;
      const codeLower = gym.code.toLowerCase();
      const nameLower = gym.name.toLowerCase();
      const nameSlug = nameLower.replace(/[^a-z0-9]/g, '');

      // Whole-word code match in raw text (e.g. " CCP " or "/CCP/" or "(CCP)")
      const codeWordRe = new RegExp(`(^|[^a-z0-9])${escapeRegExp(codeLower)}([^a-z0-9]|$)`, 'i');
      if (codeWordRe.test(haystackRaw)) score += 10;

      // Full-name slug appears in URL/label (strong signal)
      if (nameSlug.length >= 6 && haystackSlug.includes(nameSlug)) score += 6;

      // Per-token matches (excluding stop-words and the code itself)
      const tokens = nameLower.split(/[^a-z0-9]+/).filter(Boolean);
      for (const tok of tokens) {
        if (STOP.has(tok)) continue;
        if (tok.length >= 4 && haystackSlug.includes(tok)) score += 3;
        else if (tok.length === 3 && haystackSlug.includes(tok)) score += 2;
      }

      if (score > 0) scored.push({ gym, score });
    }

    if (scored.length === 0) return undefined;
    scored.sort((a, b) => b.score - a.score || b.gym.code.length - a.gym.code.length);

    // Require a minimum score and a meaningful gap over runner-up to avoid
    // false positives (e.g. two gyms sharing a token).
    if (scored[0].score < 3) return undefined;
    if (scored.length > 1 && scored[0].score === scored[1].score) {
      // Ambiguous — only accept if the top score is very high (explicit code)
      if (scored[0].score < 10) return undefined;
    }
    return scored[0].gym;
  };

  const resolveGymPrefix = (rawLabel: string, availableGyms: GymWithLogo[]) => {
    const label = rawLabel.trim();

    for (const gym of availableGyms) {
      // Bare code or name match (no separator, no remainder)
      // Use the gym's full name as the title so QR labels show "Oasis Gymnastics"
      // instead of just "OAS" when the user pastes the bare code.
      if (label.toUpperCase() === gym.code.toUpperCase() || label.toLowerCase() === gym.name.toLowerCase()) {
        return { gym, title: gym.name };
      }

      const patterns = [
        new RegExp(`^\\(\\s*${escapeRegExp(gym.code)}\\s*\\)\\s*[-–—:|]?\\s*(.*)$`, 'i'),
        new RegExp(`^${escapeRegExp(gym.code)}\\s*[-–—:|]\\s*(.*)$`, 'i'),
        new RegExp(`^${escapeRegExp(gym.name)}\\s*\\(${escapeRegExp(gym.code)}\\)\\s*[-–—:|]?\\s*(.*)$`, 'i'),
        new RegExp(`^${escapeRegExp(gym.name)}\\s*[-–—:|]\\s*(.*)$`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = label.match(pattern);
        if (!match) continue;

        return {
          gym,
          title: match[1]?.trim() || undefined,
        };
      }
    }

    return undefined;
  };

  const resolveBulkEntry = (entry: { label?: string; sublabel?: string; content: string; detectedGymCode?: string; detectedGymName?: string }): ParsedBulkEntry => {
    const singleSelectedGym = selectedBulkGymRecords.length === 1 ? selectedBulkGymRecords[0] : undefined;

    // If the parser detected a gym code from a section header, try to match it to a selected gym
    if (entry.detectedGymCode) {
      const matchedGym = selectedBulkGymRecords.find(
        (g) => g.code.toUpperCase() === entry.detectedGymCode!.toUpperCase()
      ) || gyms.find(
        (g) => g.code.toUpperCase() === entry.detectedGymCode!.toUpperCase()
      );

      if (matchedGym) {
        return {
          ...entry,
          resolvedGymId: matchedGym.id,
          resolvedGymName: matchedGym.name,
          resolvedGymCode: matchedGym.code,
          isGymResolved: true,
        };
      }

      // Even if not in selected list, use the detected code
      return {
        ...entry,
        resolvedGymCode: entry.detectedGymCode,
        resolvedGymName: entry.detectedGymName,
        isGymResolved: true,
      };
    }

    if (singleSelectedGym) {
      const explicitMatch = entry.label ? resolveGymPrefix(entry.label, [singleSelectedGym]) : undefined;

      return {
        ...entry,
        label: explicitMatch?.title || entry.label,
        resolvedGymId: singleSelectedGym.id,
        resolvedGymName: singleSelectedGym.name,
        resolvedGymCode: singleSelectedGym.code,
        isGymResolved: true,
      };
    }

    if (selectedBulkGymRecords.length > 1 && entry.label) {
      const explicitMatch = resolveGymPrefix(entry.label, selectedBulkGymRecords);

      if (explicitMatch) {
        return {
          ...entry,
          label: explicitMatch.title || entry.label,
          resolvedGymId: explicitMatch.gym.id,
          resolvedGymName: explicitMatch.gym.name,
          resolvedGymCode: explicitMatch.gym.code,
          isGymResolved: true,
        };
      }
    }

    // Fallback 1: try matching label prefix against ALL gyms (so users don't
    // need to pre-select gyms when they paste rows like "CCP   https://...")
    if (entry.label) {
      const anyMatch = resolveGymPrefix(entry.label, gyms);
      if (anyMatch) {
        return {
          ...entry,
          label: anyMatch.title || entry.label,
          resolvedGymId: anyMatch.gym.id,
          resolvedGymName: anyMatch.gym.name,
          resolvedGymCode: anyMatch.gym.code,
          isGymResolved: true,
        };
      }
    }

    // Fallback 2: fuzzy auto-assign by scanning the URL + label for gym
    // identifiers (code, name tokens). Catches rows like
    // "https://portal.iclasspro.com/oasisgymnastics/..." where the slug
    // tells us which gym it belongs to even without any label.
    const fuzzyMatch = autoAssignGym(entry.label, entry.content, gyms);
    if (fuzzyMatch) {
      // If the only label was the bare code (e.g. "OAS") or no label at all,
      // promote the gym's full name so the QR shows "Oasis Gymnastics".
      const labelIsBareCode = entry.label
        ? entry.label.trim().toUpperCase() === fuzzyMatch.code.toUpperCase()
        : true;
      return {
        ...entry,
        label: labelIsBareCode ? fuzzyMatch.name : entry.label,
        resolvedGymId: fuzzyMatch.id,
        resolvedGymName: fuzzyMatch.name,
        resolvedGymCode: fuzzyMatch.code,
        isGymResolved: true,
      };
    }

    return {
      ...entry,
      isGymResolved: false,
      validationMessage: 'No gym match — add a code or pick one',
    };
  };

  const parsedPreview = useMemo(
    () => parseMultiLineEntries(bulkContent).map(resolveBulkEntry),
    [bulkContent, selectedBulkGymRecords],
  );

  const mismatchCount = useMemo(
    () => parsedPreview.filter((entry) => checkMismatch(entry.label, entry.content)).length,
    [parsedPreview],
  );

  const unresolvedPreviewCount = useMemo(
    () => parsedPreview.filter((entry) => !entry.isGymResolved).length,
    [parsedPreview],
  );

  // ─── Actions ───────────────────────────────────────────────────────
  const clearSingle = () => {
    setContent(""); setTitle(""); setQrImage(""); setSingleLogo(null);
    setSingleGymId(""); setDestinationType("");
    toast({ title: "Session cleared" });
  };

  const clearBulk = () => {
    setBatchTitle(""); setBulkContent(""); setGeneratedQRs([]);
    setSelectedBulkGyms(new Set());
    toast({ title: "Session cleared" });
  };

  const handleSingleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const preview = event.target?.result as string;
      const img = new Image();
      img.onload = () => setSingleLogo({ file, name: file.name, preview, image: img });
      img.src = preview;
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!content.trim()) { toast({ title: "Content required", variant: "destructive" }); return; }
    setIsGenerating(true);
    try {
      const imageUrl = await generateQRCode({
        content,
        size: bulkSize,
        frameShape,
        logoImage: singleLogo?.image,
        label: showSingleLabel && title ? title : undefined,
      });
      setQrImage(imageUrl);
      toast({ title: "QR code generated" });
    } catch {
      toast({ title: "Error generating QR code", variant: "destructive" });
    } finally { setIsGenerating(false); }
  };

  const handleDownload = () => {
    if (!qrImage) return;
    const link = document.createElement("a");
    const gymName = singleGymId ? gyms.find(g => g.id === singleGymId)?.name : null;
    const parts = [gymName, destinationType, title].map(slugifyFilenamePart).filter(Boolean);
    link.download = parts.length > 0 ? `${parts.join('_')}.png` : `qr-code-${Date.now()}.png`;
    link.href = qrImage;
    link.click();
  };

  const handleSave = async () => {
    if (!qrImage) return;
    try {
      await saveGeneratedQR({
        content, qrImageUrl: qrImage, title: title || undefined,
        gymId: singleGymId || undefined, destinationType: destinationType || undefined,
      });
      toast({ title: "Saved to library" });
    } catch { toast({ title: "Error saving", variant: "destructive" }); }
  };

  const handleBulkGenerate = async () => {
    if (parsedPreview.length === 0) { toast({ title: "Content required", variant: "destructive" }); return; }
    if (unresolvedPreviewCount > 0) {
      toast({ title: "Every row needs a gym", description: "Add a gym code prefix or select exactly one gym.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const generated: GeneratedQR[] = [];
      for (const entry of parsedPreview) {
        const { label, sublabel, content } = entry;
        const matchedLogo = entry.resolvedGymId ? gymLogoImages.get(entry.resolvedGymId) : undefined;
        const resolvedSublabel = sublabel || batchTitle.trim() || undefined;
        const imageUrl = await generateQRCode({
          content,
          size: bulkSize,
          frameShape,
          logoImage: matchedLogo,
          label: showBulkLabel && label ? label : undefined,
          sublabel: showBulkLabel ? resolvedSublabel : undefined,
        });
        generated.push({
          content,
          imageUrl,
          title: label,
          sublabel: resolvedSublabel,
          resolvedGymId: entry.resolvedGymId,
          resolvedGymName: entry.resolvedGymName,
          resolvedGymCode: entry.resolvedGymCode,
        });
      }
      setGeneratedQRs(generated);
      toast({ title: `Generated ${generated.length} QR codes` });
    } catch {
      toast({ title: "Error generating", variant: "destructive" });
    } finally { setIsGenerating(false); }
  };

  const handleSaveAll = async () => {
    if (generatedQRs.length === 0) return;
    setIsGenerating(true);
    try {
      await saveBulkGeneratedQRs({
        batchName: batchTitle.trim() || `Batch ${new Date().toLocaleDateString()}`,
        qrCodes: generatedQRs.map(qr => ({ content: qr.content, qrImageUrl: qr.imageUrl, title: qr.title })),
      });
      toast({ title: `Saved ${generatedQRs.length} QR codes` });
    } catch { toast({ title: "Error saving", variant: "destructive" }); }
    finally { setIsGenerating(false); }
  };

  const handleDownloadAll = async () => {
    // Browsers throttle / drop rapid synchronous downloads (typically caps at ~10).
    // Stagger each download with a small delay so every QR in the batch saves.
    for (let index = 0; index < generatedQRs.length; index++) {
      const qr = generatedQRs[index];
      const link = document.createElement("a");
      link.download = buildBulkFilename(qr.resolvedGymCode, qr.title, index);
      link.href = qr.imageUrl;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // 250ms is the sweet spot — fast enough to feel instant, slow enough that Chrome/Edge/Safari
      // don't coalesce or drop downloads.
      await new Promise((r) => setTimeout(r, 250));
    }
    toast({ title: `Downloaded ${generatedQRs.length} QR codes` });
  };

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <Tabs defaultValue="bulk" className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-11" style={{
        background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.15), hsl(var(--brand-blue-gray) / 0.1))',
        border: '2px solid hsl(var(--brand-rose-gold) / 0.25)',
      }}>
        <TabsTrigger value="bulk" className="text-sm font-semibold gap-2 data-[state=active]:shadow-md">
          <Layers className="h-4 w-4" /> Bulk Generate
        </TabsTrigger>
        <TabsTrigger value="single" className="text-sm font-semibold gap-2 data-[state=active]:shadow-md">
          <QrCode className="h-4 w-4" /> Single QR
        </TabsTrigger>
      </TabsList>

      {/* ━━━ BULK TAB ━━━ */}
      <TabsContent value="bulk" className="mt-4 space-y-4">
        <Card className="p-4 space-y-4 max-w-3xl mx-auto" style={{
          border: '2px solid hsl(var(--brand-rose-gold) / 0.2)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
        }}>
          {/* Status bar */}
          <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid hsl(var(--brand-rose-gold) / 0.15)' }}>
            <span className="text-xs font-medium" style={{ color: 'hsl(var(--brand-navy) / 0.6)' }}>
              {selectedBulkGyms.size} gym{selectedBulkGyms.size !== 1 ? 's' : ''} • {generatedQRs.length} QR{generatedQRs.length !== 1 ? 's' : ''} generated
            </span>
            <Button variant="ghost" size="sm" onClick={clearBulk} className="h-7 text-xs">
              <RefreshCw className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>

          {/* QR Size Slider — applies to every QR in this batch */}
          <div className="space-y-2 p-3 rounded-lg" style={{
            background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.06), hsl(var(--brand-rose-gold) / 0.02))',
            border: '1.5px solid hsl(var(--brand-rose-gold) / 0.25)',
          }}>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--brand-navy) / 0.8)' }}>
                QR Size — applies to all
              </Label>
              <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded" style={{
                background: 'hsl(var(--brand-rose-gold) / 0.15)',
                color: 'hsl(var(--brand-navy))',
              }}>
                {bulkSize} × {bulkSize} px
              </span>
            </div>
            <Slider
              value={[bulkSize]}
              onValueChange={(v) => setBulkSize(v[0])}
              min={256}
              max={2048}
              step={64}
              className="py-1"
            />
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Small', size: 256 },
                { label: 'Medium', size: 512 },
                { label: 'Large', size: 1024 },
                { label: 'Print', size: 2048 },
              ].map(p => (
                <Button
                  key={p.size}
                  type="button"
                  variant={bulkSize === p.size ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBulkSize(p.size)}
                  className="h-7 text-[11px] px-2.5 font-semibold"
                  style={bulkSize === p.size ? {
                    background: 'hsl(var(--brand-rose-gold))',
                    color: 'white',
                    border: 'none',
                  } : {
                    border: '1.5px solid hsl(var(--brand-rose-gold) / 0.3)',
                    color: 'hsl(var(--brand-navy))',
                  }}
                >
                  {p.label} {p.size}
                </Button>
              ))}
            </div>
          </div>

          {/* Frame Shape Picker — applies to every QR */}
          <div className="space-y-2 p-3 rounded-lg" style={{
            background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.06), hsl(var(--brand-rose-gold) / 0.02))',
            border: '1.5px solid hsl(var(--brand-rose-gold) / 0.25)',
          }}>
            <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--brand-navy) / 0.8)' }}>
              Frame Shape — applies to all
            </Label>
            <div className="grid grid-cols-5 gap-1.5">
              {([
                { id: 'square', label: 'Square', dims: 'w-7 h-7 rounded-sm' },
                { id: 'rounded', label: 'Rounded', dims: 'w-7 h-7 rounded-lg' },
                { id: 'tall', label: 'Tall', dims: 'w-5 h-7 rounded-sm' },
                { id: 'wide', label: 'Wide', dims: 'w-8 h-5 rounded-sm' },
                { id: 'circle', label: 'Circle', dims: 'w-7 h-7 rounded-full' },
              ] as const).map(s => (
                <Button
                  key={s.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFrameShape(s.id)}
                  className="h-auto py-2 flex flex-col items-center gap-1 text-[10px] font-semibold"
                  style={frameShape === s.id ? {
                    background: 'hsl(var(--brand-rose-gold) / 0.15)',
                    border: '2px solid hsl(var(--brand-rose-gold))',
                    color: 'hsl(var(--brand-navy))',
                  } : {
                    border: '1.5px solid hsl(var(--brand-rose-gold) / 0.25)',
                    color: 'hsl(var(--brand-navy) / 0.7)',
                  }}
                >
                  <div className={cn(s.dims, "border-2")} style={{
                    borderColor: frameShape === s.id ? 'hsl(var(--brand-rose-gold))' : 'hsl(var(--brand-navy) / 0.4)',
                    background: frameShape === s.id ? 'hsl(var(--brand-rose-gold) / 0.2)' : 'transparent',
                  }} />
                  {s.label}
                </Button>
              ))}
            </div>
          </div>


          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <Label htmlFor="batchTitle" className="text-xs font-semibold">Batch Title</Label>
              <Input id="batchTitle" placeholder="e.g. Waiver Links March 2026" value={batchTitle}
                onChange={(e) => setBatchTitle(e.target.value)} className="mt-1 h-9 text-sm" />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Label htmlFor="showBulkLabel" className="text-xs">Labels</Label>
              <Switch id="showBulkLabel" checked={showBulkLabel} onCheckedChange={setShowBulkLabel} />
            </div>
          </div>

          {/* Bulk Content Paste Area */}
          <div>
            <Label htmlFor="bulkContent" className="text-xs font-semibold">Paste URLs</Label>
            <p className="text-[10px] mb-1" style={{ color: 'hsl(var(--brand-navy) / 0.5)' }}>
              Use "CCP - Classes Page - URL" for multi-gym batches, or select one gym to apply it to every row
            </p>
            <Textarea id="bulkContent"
              placeholder={"CCP - Classes Page - https://example.com/classes\nEOS - Waiver - https://example.com/waiver"}
              value={bulkContent} onChange={(e) => setBulkContent(e.target.value)}
              rows={8} className="text-sm font-mono" />
          </div>

          {/* Parse Preview Table */}
          {parsedPreview.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold" style={{ color: 'hsl(var(--brand-navy))' }}>
                {parsedPreview.length} entries detected
                {mismatchCount > 0 && (
                  <span className="ml-2 text-yellow-600">({mismatchCount} potential mismatch{mismatchCount > 1 ? 'es' : ''})</span>
                )}
                {unresolvedPreviewCount > 0 && (
                  <span className="ml-2" style={{ color: 'hsl(var(--destructive))' }}>
                    ({unresolvedPreviewCount} need gym assignment)
                  </span>
                )}
              </p>
              <div className="max-h-48 overflow-y-auto rounded-lg" style={{
                border: '1.5px solid hsl(var(--brand-rose-gold) / 0.2)',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <table className="w-full text-xs">
                  <thead className="sticky top-0" style={{ background: 'hsl(var(--brand-rose-gold) / 0.1)' }}>
                    <tr>
                      <th className="px-2 py-1.5 text-left w-8 font-semibold">#</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Gym</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Page</th>
                      <th className="px-2 py-1.5 text-left font-semibold">URL</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Filename</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedPreview.map((entry, i) => {
                      const isMismatch = checkMismatch(entry.label, entry.content);
                      return (
                        <tr
                          key={i}
                          className={cn(
                            !entry.isGymResolved && "bg-destructive/10",
                            entry.isGymResolved && isMismatch && "bg-yellow-500/10",
                            entry.isGymResolved && !isMismatch && (i % 2 === 0 ? "bg-white" : "bg-muted/30"),
                          )}
                        >
                          <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                          <td className="px-2 py-1">
                            <div className="flex items-center gap-1">
                              {!entry.isGymResolved ? (
                                <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: 'hsl(var(--destructive))' }} />
                              ) : null}
                              <div>
                                <div className="font-medium">{entry.resolvedGymCode || '—'}</div>
                                <div className="text-muted-foreground">{entry.resolvedGymName || entry.validationMessage}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex items-center gap-1">
                              {entry.isGymResolved && isMismatch && <AlertTriangle className="h-3 w-3 text-yellow-600 shrink-0" />}
                              {entry.label ? (
                                <div>
                                  <div className="font-medium">{entry.label}</div>
                                  {entry.sublabel && <div className="text-muted-foreground">{entry.sublabel}</div>}
                                </div>
                              ) : <span className="text-muted-foreground italic">No label</span>}
                            </div>
                          </td>
                          <td className="px-2 py-1 text-muted-foreground truncate max-w-[250px]">{entry.content}</td>
                          <td className="px-2 py-1 font-mono text-[11px]">{buildBulkFilename(entry.resolvedGymCode, entry.label, i)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button onClick={handleBulkGenerate} disabled={isGenerating || parsedPreview.length === 0 || unresolvedPreviewCount > 0} className="w-full h-10 text-sm font-semibold" style={{
            background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-rose-gold-dark)))',
            color: 'white',
            boxShadow: '0 4px 14px hsl(var(--brand-rose-gold) / 0.4)',
          }}>
            {isGenerating ? "Generating..." : "Generate All QR Codes"}
          </Button>
        </Card>

        {/* Generated QR Results */}
        {generatedQRs.length > 0 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button onClick={handleDownloadAll} variant="outline" className="flex-1 h-9 text-sm font-semibold" style={{
                border: '2px solid hsl(var(--brand-rose-gold) / 0.3)',
              }}>
                <Download className="h-4 w-4 mr-2" /> Download All ({generatedQRs.length})
              </Button>
              <Button onClick={handleSaveAll} disabled={isGenerating} className="flex-1 h-9 text-sm font-semibold" style={{
                background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-rose-gold-dark)))',
                color: 'white',
              }}>
                <Save className="h-4 w-4 mr-2" /> Save All as Batch
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {generatedQRs.map((qr, index) => (
                <Card key={index} className="p-2.5 space-y-2" style={{
                  border: '1.5px solid hsl(var(--brand-rose-gold) / 0.2)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold truncate">{qr.title || `QR #${index + 1}`}</div>
                    {qr.sublabel && <div className="text-[10px] text-muted-foreground truncate">{qr.sublabel}</div>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <img src={qr.imageUrl} alt={qr.title || `QR ${index + 1}`} className="w-full rounded-md aspect-square object-contain" style={{
                      border: '1px solid hsl(var(--brand-rose-gold) / 0.15)',
                      background: '#fff',
                    }} />
                    <UrlPreview url={qr.content} />
                  </div>
                  <p className="text-[10px] text-muted-foreground break-all line-clamp-1">{qr.content}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      {/* ━━━ SINGLE TAB ━━━ */}
      <TabsContent value="single" className="mt-4">
        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <Card className="p-4 space-y-3" style={{
            border: '2px solid hsl(var(--brand-rose-gold) / 0.2)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}>
            {/* Status bar */}
            <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid hsl(var(--brand-rose-gold) / 0.15)' }}>
              <span className="text-xs font-medium" style={{ color: 'hsl(var(--brand-navy) / 0.6)' }}>
                {singleLogo ? "1 logo" : "No logo"} • {qrImage ? "1 QR" : "No QR yet"}
              </span>
              <Button variant="ghost" size="sm" onClick={clearSingle} className="h-7 text-xs">
                <RefreshCw className="h-3 w-3 mr-1" /> Clear
              </Button>
            </div>

            {/* QR Size Slider — shared across single + bulk */}
            <div className="space-y-2 p-3 rounded-lg" style={{
              background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.06), hsl(var(--brand-rose-gold) / 0.02))',
              border: '1.5px solid hsl(var(--brand-rose-gold) / 0.25)',
            }}>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--brand-navy) / 0.8)' }}>
                  QR Size
                </Label>
                <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded" style={{
                  background: 'hsl(var(--brand-rose-gold) / 0.15)',
                  color: 'hsl(var(--brand-navy))',
                }}>
                  {bulkSize} × {bulkSize} px
                </span>
              </div>
              <Slider
                value={[bulkSize]}
                onValueChange={(v) => setBulkSize(v[0])}
                min={256}
                max={2048}
                step={64}
                className="py-1"
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Small', size: 256 },
                  { label: 'Medium', size: 512 },
                  { label: 'Large', size: 1024 },
                  { label: 'Print', size: 2048 },
                ].map(p => (
                  <Button
                    key={p.size}
                    type="button"
                    variant={bulkSize === p.size ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkSize(p.size)}
                    className="h-7 text-[11px] px-2.5 font-semibold"
                    style={bulkSize === p.size ? {
                      background: 'hsl(var(--brand-rose-gold))',
                      color: 'white',
                      border: 'none',
                    } : {
                      border: '1.5px solid hsl(var(--brand-rose-gold) / 0.3)',
                      color: 'hsl(var(--brand-navy))',
                    }}
                  >
                    {p.label} {p.size}
                  </Button>
                ))}
              </div>
            </div>

            {/* Frame Shape Picker */}
            <div className="space-y-2 p-3 rounded-lg" style={{
              background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.06), hsl(var(--brand-rose-gold) / 0.02))',
              border: '1.5px solid hsl(var(--brand-rose-gold) / 0.25)',
            }}>
              <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--brand-navy) / 0.8)' }}>
                Frame Shape
              </Label>
              <div className="grid grid-cols-5 gap-1.5">
                {([
                  { id: 'square', label: 'Square', dims: 'w-7 h-7 rounded-sm' },
                  { id: 'rounded', label: 'Rounded', dims: 'w-7 h-7 rounded-lg' },
                  { id: 'tall', label: 'Tall', dims: 'w-5 h-7 rounded-sm' },
                  { id: 'wide', label: 'Wide', dims: 'w-8 h-5 rounded-sm' },
                  { id: 'circle', label: 'Circle', dims: 'w-7 h-7 rounded-full' },
                ] as const).map(s => (
                  <Button
                    key={s.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFrameShape(s.id)}
                    className="h-auto py-2 flex flex-col items-center gap-1 text-[10px] font-semibold"
                    style={frameShape === s.id ? {
                      background: 'hsl(var(--brand-rose-gold) / 0.15)',
                      border: '2px solid hsl(var(--brand-rose-gold))',
                      color: 'hsl(var(--brand-navy))',
                    } : {
                      border: '1.5px solid hsl(var(--brand-rose-gold) / 0.25)',
                      color: 'hsl(var(--brand-navy) / 0.7)',
                    }}
                  >
                    <div className={cn(s.dims, "border-2")} style={{
                      borderColor: frameShape === s.id ? 'hsl(var(--brand-rose-gold))' : 'hsl(var(--brand-navy) / 0.4)',
                      background: frameShape === s.id ? 'hsl(var(--brand-rose-gold) / 0.2)' : 'transparent',
                    }} />
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Gym Logo Grid */}
            <GymLogoGrid gyms={gyms} selected={singleSelectedSet} onToggle={handleSingleGymToggle} />

            {/* Destination Type */}
            <div>
              <Label className="text-xs font-semibold">Destination Type</Label>
              <Select value={destinationType} onValueChange={setDestinationType}>
                <SelectTrigger className="mt-1 h-9 text-sm">
                  <SelectValue placeholder="e.g. Classes, Waiver, Login..." />
                </SelectTrigger>
                <SelectContent>
                  {DESTINATION_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Manual Logo Upload (fallback) */}
            {!singleGymId && (
              <div>
                <Label htmlFor="logo" className="text-xs font-semibold">Upload Logo</Label>
                <div className="space-y-1.5 mt-1">
                  <Input id="logo" type="file" accept="image/*" onChange={handleSingleLogoUpload} className="h-9 text-sm" />
                  {singleLogo && (
                    <div className="flex items-center gap-2">
                      <img src={singleLogo.preview} alt={singleLogo.name} className="w-12 h-12 rounded object-cover border-2 border-border" />
                      <Button variant="ghost" size="sm" onClick={() => setSingleLogo(null)} className="h-7">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Title + Label Toggle */}
            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <Label htmlFor="title" className="text-xs font-semibold">Title</Label>
                <Input id="title" placeholder="My QR Code" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-9 text-sm" />
              </div>
              <div className="flex items-center gap-2 pb-1">
                <Label htmlFor="showSingleLabel" className="text-xs">Label</Label>
                <Switch id="showSingleLabel" checked={showSingleLabel} onCheckedChange={setShowSingleLabel} />
              </div>
            </div>

            {/* Content */}
            <div>
              <Label htmlFor="content" className="text-xs font-semibold">Content *</Label>
              <Textarea id="content" placeholder="Enter URL, text, or any content..."
                value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="text-sm" />
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full h-10 text-sm font-semibold" style={{
              background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-rose-gold-dark)))',
              color: 'white',
              boxShadow: '0 4px 14px hsl(var(--brand-rose-gold) / 0.4)',
            }}>
              {isGenerating ? "Generating..." : "Generate QR Code"}
            </Button>
          </Card>

          {/* QR Preview Panel */}
          <Card className="p-4 flex flex-col items-center justify-center space-y-3" style={{
            border: '2px solid hsl(var(--brand-rose-gold) / 0.2)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            background: 'linear-gradient(180deg, hsl(var(--brand-rose-gold) / 0.04), transparent)',
          }}>
            {qrImage ? (
              <>
                <img src={qrImage} alt="Generated QR Code" className="w-full max-w-xs rounded-lg" style={{
                  border: '2px solid hsl(var(--brand-rose-gold) / 0.2)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                }} />
                {content && /^https?:\/\//i.test(content) && (
                  <div className="w-full max-w-xs space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--brand-navy) / 0.6)' }}>
                      Destination Preview
                    </div>
                    <UrlPreview url={content} />
                  </div>
                )}
                <div className="flex gap-2 w-full max-w-xs">
                  <Button onClick={handleDownload} variant="outline" className="flex-1 h-9 text-sm" style={{
                    border: '2px solid hsl(var(--brand-rose-gold) / 0.3)',
                  }}>
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                  <Button onClick={handleSave} className="flex-1 h-9 text-sm" style={{
                    background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-rose-gold-dark)))',
                    color: 'white',
                  }}>
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <QrCode className="h-20 w-20 mx-auto mb-3" style={{ color: 'hsl(var(--brand-rose-gold) / 0.2)' }} />
                <p className="text-sm" style={{ color: 'hsl(var(--brand-navy) / 0.4)' }}>Your QR code will appear here</p>
              </div>
            )}
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
};
