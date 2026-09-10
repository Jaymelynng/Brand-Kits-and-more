/**
 * Copy text to the clipboard, with a fallback that works where the async
 * Clipboard API does not.
 *
 * navigator.clipboard.writeText rejects in more situations than people expect:
 * a page that is not focused, an insecure origin, a browser that has not been
 * granted permission. When it does, a plain `.catch(() => toast("failed"))`
 * leaves the person with nothing - which for a list of 40 asset links means
 * the work is simply gone. So: try the modern API, fall back to the old
 * execCommand path, and only report failure when both are exhausted.
 */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    // Keep it out of sight but still selectable - display:none is not.
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};
