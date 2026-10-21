/**
 * `/dev/ui` demos for the L72-09 overlays (technical spec v7 §4.2, §6.7, §6.12, §7.7). DEV only:
 * the gallery is lazily imported behind `import.meta.env.DEV`, so none of this copy ships.
 * Components only, because `overlays.gallery.tsx` exports the non-component `gallery`
 * (react-refresh). Demo copy is sample text, never catalog data.
 */

import { useState, type ReactElement, type ReactNode } from 'react';
import { Button } from './button';
import { Dialog } from './dialog';
import { Segmented, type SegmentedOption } from './segmented';
import { Sheet } from './sheet';
import { Toast, type ToastTone } from './toast';
import { Toggle } from './toggle';

function Row({ children }: { children: ReactNode }): ReactElement {
  return <div className="flex flex-wrap items-start gap-3">{children}</div>;
}

function Caption({ children }: { children: ReactNode }): ReactElement {
  return <p className="font-v7-body text-v7-caption font-bold text-v7-text-2">{children}</p>;
}

function SampleLines({ count, prefix }: { count: number; prefix: string }): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, index) => (
        <p key={index}>
          {prefix} {index + 1}: a queued effect resolves on its target&apos;s turn, after that player acts.
        </p>
      ))}
    </div>
  );
}

export function ReadOnlyStackDemo(): ReactElement {
  const [cardOpen, setCardOpen] = useState(false);
  const [kitOpen, setKitOpen] = useState(false);
  const [seatOpen, setSeatOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <Row>
        <Button
          variant="secondary"
          onClick={() => {
            setCardOpen(true);
          }}
        >
          Open card sheet
        </Button>
      </Row>
      <Caption>
        Card, then Kit, then Seat. Two read-only sheets paint at once: the third hides the oldest until the top one
        closes. Esc, a backdrop press or a swipe-down on the handle closes only the top sheet.
      </Caption>
      <Sheet
        open={cardOpen}
        mode="read-only"
        title="Basic attack"
        onClose={() => {
          setCardOpen(false);
        }}
        actions={
          <Button
            variant="quiet"
            onClick={() => {
              setCardOpen(false);
            }}
          >
            Close
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <p>Deal 1 damage to one opponent. It resolves on their turn, after they play.</p>
          <Row>
            <Button
              onClick={() => {
                setKitOpen(true);
              }}
            >
              Show kit
            </Button>
          </Row>
          <SampleLines count={12} prefix="Rule" />
        </div>
      </Sheet>
      <Sheet
        open={kitOpen}
        mode="read-only"
        title="Warrior kit"
        onClose={() => {
          setKitOpen(false);
        }}
      >
        <div className="flex flex-col gap-3">
          <p>Starts with 10 lives and 3 points.</p>
          <Row>
            <Button
              onClick={() => {
                setSeatOpen(true);
              }}
            >
              Show seat
            </Button>
          </Row>
        </div>
      </Sheet>
      <Sheet
        open={seatOpen}
        mode="read-only"
        title="Ana"
        onClose={() => {
          setSeatOpen(false);
        }}
      >
        <p>8 lives, 2 points. The Basic attack sheet is hidden under this one until it closes.</p>
      </Sheet>
    </div>
  );
}

const REWARD_OPTIONS: readonly SegmentedOption<string>[] = [
  { value: 'lives', label: '4 lives' },
  { value: 'points', label: '2 points' },
  { value: 'shield', label: 'Shield' },
];

export function BlockingSheetDemo(): ReactElement {
  const [rewardOpen, setRewardOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [reward, setReward] = useState('lives');
  const [cardOpen, setCardOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <Row>
        <Button
          variant="secondary"
          onClick={() => {
            setRewardOpen(true);
          }}
        >
          Open reward picker
        </Button>
        <Button
          variant="quiet"
          onClick={() => {
            setCardOpen(true);
          }}
        >
          Open card sheet
        </Button>
      </Row>
      <Caption>
        The picker ignores Esc, backdrop and swipe. Minimize collapses it to a bar above every sheet; intents stay
        locked{minimized ? ' (minimized now)' : ''}. Open the card sheet while it is minimized: Esc closes the card,
        the bar stays.
      </Caption>
      <Sheet
        open={rewardOpen}
        mode="blocking"
        title="Choose a reward"
        onMinimizedChange={setMinimized}
      >
        <div className="flex flex-col gap-4">
          <p>Ben is out. Pick your elimination reward.</p>
          <Segmented label="Reward" options={REWARD_OPTIONS} value={reward} onChange={setReward} />
          <Button
            fullWidth
            onClick={() => {
              setRewardOpen(false);
            }}
          >
            Confirm rewards
          </Button>
        </div>
      </Sheet>
      <Sheet
        open={cardOpen}
        mode="read-only"
        title="Basic attack"
        onClose={() => {
          setCardOpen(false);
        }}
      >
        <p>Deal 1 damage to one opponent.</p>
      </Sheet>
    </div>
  );
}

export function DialogDemo(): ReactElement {
  const [narrowOpen, setNarrowOpen] = useState(false);
  const [wideOpen, setWideOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <Row>
        <Button
          variant="secondary"
          onClick={() => {
            setNarrowOpen(true);
          }}
        >
          Open md dialog
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setWideOpen(true);
          }}
        >
          Open 3xl dialog
        </Button>
      </Row>
      <Caption>A bottom sheet on phones, centered on desktop, sized to the visual viewport. Lock ignores every dismissal.</Caption>
      <Dialog
        open={narrowOpen}
        title="Feedback"
        dismissLocked={locked}
        onClose={() => {
          setNarrowOpen(false);
        }}
        actions={
          <Button
            variant="quiet"
            disabled={locked}
            onClick={() => {
              setNarrowOpen(false);
            }}
          >
            Cancel
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <p>While sending, Esc, backdrop and swipe do nothing.</p>
          <Toggle label="Lock dismissal" pressed={locked} onPressedChange={setLocked} />
        </div>
      </Dialog>
      <Dialog
        open={wideOpen}
        title="How to play"
        width="3xl"
        onClose={() => {
          setWideOpen(false);
        }}
        actions={
          <Button
            onClick={() => {
              setWideOpen(false);
            }}
          >
            Close
          </Button>
        }
      >
        <SampleLines count={40} prefix="Rule" />
      </Dialog>
    </div>
  );
}

export function ToastDemo(): ReactElement {
  const [tone, setTone] = useState<ToastTone>('info');
  const [open, setOpen] = useState(false);
  const [lastCause, setLastCause] = useState('none yet');
  const show = (next: ToastTone): void => {
    setTone(next);
    setOpen(true);
  };
  return (
    <div className="flex flex-col gap-3">
      <Row>
        <Button
          variant="secondary"
          onClick={() => {
            show('info');
          }}
        >
          Show info toast
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            show('error');
          }}
        >
          Show error toast
        </Button>
      </Row>
      <Caption>Dismissed by OK or after 4 s, both through onDismiss. Last dismissal: {lastCause}.</Caption>
      <Toast
        open={open}
        tone={tone}
        title={tone === 'error' ? "Can't do that" : 'Link copied'}
        {...(tone === 'error' ? { body: 'It is not your turn.' } : {})}
        timeoutMs={4000}
        dismissLabel="OK"
        onDismiss={(cause) => {
          setLastCause(cause);
          setOpen(false);
        }}
      />
    </div>
  );
}
