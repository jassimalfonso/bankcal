# BankCal design rules

One set of rules for every tab and sheet. New screens follow these; if a rule needs to change, change it here and everywhere at once.

## Text sizes (px)
| Use | Size |
|---|---|
| Page title | 36 (30 under 360 wide and on the Fold's two-column layout) |
| Sheet title | 26 |
| Card headline | 24 |
| Section title, in-card heading | 21, weight 850 |
| Lead / emphasised line | 18 |
| Body, buttons, text links | 16 |
| Detail | 14 |
| Small print | 12 |
| Chart ticks, badges only | 10–11 |

Do not add in-between sizes (13, 13.5, 14.5, 15, 17 …).

## Layout
- Page edge: 20px on phones, 24px on the Fold. Titles and notes sit 4–6px inside the card edge.
- Page header: small muted line + title (`.large-title`), same on every tab.
- Fold unfolded (700–1023px): each tab wraps its title and main panel in `.side-col`. That column is pinned on the left; everything else scrolls on the right. `useSideFit` shrinks the panel to fit, or lets the column scroll if it can't fit. Add class `solo` when a view has no panel.
- Phones and desktop: `.side-col` is `display: contents` (no effect).

## Cards
- Corners 22px. Content cards: 16px padding. List cards keep small padding because rows carry their own.
- 12px between cards, 38px above a section title, 14px under it.
- Empty states and the balance card are the only roomier cards.

## Rows
Icon left, name + detail in the middle (flex 1), number right, action after it.

## Buttons
- Main `.btn-primary`: 56px tall, 16px text.
- Soft `.btn-soft`: 50px, 16px text; wraps instead of shrinking.
- Text link `.link-btn`: 16px, weight 850.

## Sheets
Portal to `document.body`. Grabber, `.sheet-head` (small line + 26px title, ✕ top right), content, main button last.

## Feedback
Every add, save, move or remove confirms with a receipt or toast, with Undo where it can be undone.
Hold and swipe shortcuts are extras: the tap route always stays.
