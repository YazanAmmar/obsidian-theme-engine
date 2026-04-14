import type ThemeEngine from '../main';
import type { NoticeRule } from '../types';

const matchesRule = (noticeText: string, rule: NoticeRule): boolean => {
  if (!rule.keywords?.trim()) return false;
  const keywords = rule.keywords.toLowerCase();
  let match = false;

  if (rule.isRegex) {
    try {
      if (new RegExp(keywords, 'i').test(noticeText)) match = true;
    } catch {
      // ignore invalid regex
    }
  } else {
    const keywordArray = keywords
      .split(',')
      .map((k: string) => k.trim())
      .filter(Boolean);
    if (keywordArray.length > 0) {
      const escaped = keywordArray.map((k: string) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (new RegExp(`\\b(${escaped.join('|')})\\b`, 'i').test(noticeText)) {
        match = true;
      }
    }
  }

  return match;
};

export const processNotice = (plugin: ThemeEngine, el: HTMLElement): void => {
  if (!el || !el.classList || el.dataset.cmProcessed === 'true') return;

  let noticeText = (el.textContent || '').toLowerCase();
  const testKeywordEl = el.querySelector<HTMLElement>('.cm-test-keyword');
  if (testKeywordEl) {
    noticeText = (testKeywordEl.textContent || '').toLowerCase();
  }

  el.dataset.cmProcessed = 'true';
  el.dataset.cmThemeEngineNotice = 'true';

  try {
    const settings = plugin.settings;
    const activeProfile = settings.profiles[settings.activeProfile];
    if (!activeProfile) return;

    const liveRules = plugin.liveNoticeRules;
    const liveRuleType = plugin.liveNoticeRuleType;

    const bgRules: NoticeRule[] =
      liveRuleType === 'background' && liveRules
        ? liveRules
        : activeProfile?.noticeRules?.background || [];

    let finalBgColor = activeProfile.vars['--cm-notice-bg-default'];

    for (const rule of bgRules) {
      if (matchesRule(noticeText, rule)) {
        finalBgColor = rule.color;
        break;
      }
    }

    if (finalBgColor) {
      el.dataset.cmNoticeBg = finalBgColor;
    }

    const textRules: NoticeRule[] =
      liveRuleType === 'text' && liveRules ? liveRules : activeProfile?.noticeRules?.text || [];

    let finalTextColor = activeProfile.vars['--cm-notice-text-default'];
    const highlightRules: NoticeRule[] = [];
    const fullColorRules: NoticeRule[] = [];

    for (const rule of textRules) {
      if (rule.highlightOnly) {
        highlightRules.push(rule);
      } else {
        fullColorRules.push(rule);
      }
    }

    for (const rule of fullColorRules) {
      if (matchesRule(noticeText, rule)) {
        finalTextColor = rule.color;
        break;
      }
    }

    if (finalTextColor) {
      el.dataset.cmNoticeText = finalTextColor;
    }

    if (highlightRules.length > 0) {
      const textNodes: Node[] = [];

      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          return node.parentElement?.classList.contains('cm-theme-engine-keyword-highlight')
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT;
        },
      });

      while (walker.nextNode()) textNodes.push(walker.currentNode);

      for (const node of textNodes) {
        const nodeContent = node.textContent;
        if (!nodeContent?.trim()) continue;

        const parent = node.parentElement;
        if (!parent) continue;

        const allMatches: { start: number; end: number; color: string }[] = [];

        for (const rule of highlightRules) {
          if (!rule.keywords?.trim()) continue;
          const color = rule.color;

          if (rule.isRegex) {
            try {
              const regex = new RegExp(rule.keywords, 'gi');
              let match;
              while ((match = regex.exec(nodeContent)) !== null) {
                if (match[0].length === 0) break;
                allMatches.push({
                  start: match.index,
                  end: match.index + match[0].length,
                  color,
                });
              }
            } catch (error) {
              console.warn('Theme Engine: Invalid Regex in notice rule', error);
            }
          } else {
            const keywords = rule.keywords
              .split(',')
              .map((k: string) => k.trim())
              .filter(Boolean);
            if (keywords.length > 0) {
              const escaped = keywords.map((k: string) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
              const ruleRegex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
              let match;
              while ((match = ruleRegex.exec(nodeContent)) !== null) {
                allMatches.push({
                  start: match.index,
                  end: match.index + match[0].length,
                  color,
                });
              }
            }
          }
        }

        if (allMatches.length === 0) continue;

        allMatches.sort((a, b) => a.start - b.start);
        const uniqueMatches = [];
        let currentEnd = -1;

        for (const match of allMatches) {
          if (match.start >= currentEnd) {
            uniqueMatches.push(match);
            currentEnd = match.end;
          }
        }

        if (uniqueMatches.length === 0) continue;

        const fragments = new DocumentFragment();
        let lastIndex = 0;

        for (const match of uniqueMatches) {
          if (match.start > lastIndex) {
            fragments.appendChild(
              document.createTextNode(nodeContent.substring(lastIndex, match.start)),
            );
          }
          const span = document.createElement('span');
          span.className = 'cm-theme-engine-keyword-highlight';
          span.setCssProps({ color: match.color });
          span.textContent = nodeContent.substring(match.start, match.end);
          fragments.appendChild(span);
          lastIndex = match.end;
        }

        if (lastIndex < nodeContent.length) {
          fragments.appendChild(document.createTextNode(nodeContent.substring(lastIndex)));
        }

        parent.replaceChild(fragments, node);
      }
    }

    updateNoticeStyles(plugin);
  } catch (error) {
    console.warn('Theme Engine: processNotice failed', error);
  }
};

export const updateNoticeStyles = (plugin: ThemeEngine): void => {
  const styleId = 'cm-dynamic-notice-styles';

  const notices = document.querySelectorAll<HTMLElement>(
    '[data-cm-notice-bg], [data-cm-notice-text]',
  );
  if (notices.length === 0) {
    plugin.clearRuntimeStyle(styleId);
    return;
  }

  const cssRules: string[] = [];
  notices.forEach((notice, i) => {
    const uniqueId = notice.dataset.cmNoticeId || `cm-notice-${i}`;
    notice.dataset.cmNoticeId = uniqueId;

    const bgColor = notice.dataset.cmNoticeBg;
    const textColor = notice.dataset.cmNoticeText;

    let rule = `[data-cm-notice-id="${uniqueId}"] {`;
    if (bgColor) {
      rule += ` background-color: ${bgColor} !important;`;
    }
    if (textColor) {
      rule += ` color: ${textColor} !important;`;
    }
    rule += ' }';
    cssRules.push(rule);
  });

  plugin.setRuntimeStyle(styleId, cssRules.join('\n'));
};
