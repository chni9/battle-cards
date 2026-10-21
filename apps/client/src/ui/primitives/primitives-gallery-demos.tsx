/**
 * `/dev/ui` demos for the L72-08 primitives (technical spec v7 §4.2). DEV only: the gallery is
 * lazily imported behind `import.meta.env.DEV`, so none of this copy ships. Components only,
 * because `primitives.gallery.tsx` exports the non-component `gallery` (react-refresh). Demo
 * values are samples, never `KIT_CATALOG` data.
 */

import { useState, type ReactElement, type ReactNode } from 'react';
import { getOpponentPlaceholderUrl } from '../asset-lookup';
import { Avatar } from './avatar';
import { Badge, BadgeGroup, type BadgeGroupItem } from './badge';
import { Button } from './button';
import { Carousel, type CarouselSlide } from './carousel';
import { IconButton } from './icon-button';
import { KitTile, type KitTileStat } from './kit-tile';
import { Pill } from './pill';
import { ScrollArea } from './scroll-area';
import { Segmented } from './segmented';
import { Slider } from './slider';
import { Tabs } from './tabs';
import { TextField } from './text-field';
import { Toggle } from './toggle';
import { Tooltip } from './tooltip';

function Row({ children }: { children: ReactNode }): ReactElement {
  return <div className="flex flex-wrap items-start gap-3">{children}</div>;
}

function Caption({ children }: { children: ReactNode }): ReactElement {
  return <p className="font-v7-body text-v7-caption font-bold text-v7-text-2">{children}</p>;
}

export function ButtonDemo(): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <Row>
        <Button icon="shop">Shop</Button>
        <Button variant="secondary" icon="help">
          How to play
        </Button>
        <Button variant="danger" icon="flag">
          Forfeit
        </Button>
        <Button variant="quiet" icon="log">
          Log
        </Button>
      </Row>
      <Caption>Icons on a CTA fill sit in a --bg-0 well; on quiet they sit on the fill.</Caption>
      <Row>
        <Button>Ready</Button>
        <Button size="lg">Play solo</Button>
        <Button disabled disabledReason="Not enough points">
          Buy
        </Button>
        <Button reserveReasonSlot disabledReason="Not your turn">
          Draw
        </Button>
      </Row>
      <Button fullWidth size="lg" variant="secondary">
        Play online
      </Button>
    </div>
  );
}

export function IconButtonDemo(): ReactElement {
  return (
    <Row>
      <IconButton aria-label="Open the action log" icon="log" />
      <IconButton aria-label="Menu" icon="menu" title={null} />
      <IconButton aria-label="Chat, 3 unread" icon="chat" count={3} />
      <IconButton aria-label="Feedback" icon="feedback" variant="primary" />
      <IconButton aria-label="Help" icon="help" variant="secondary" />
      <IconButton aria-label="Forfeit" icon="flag" variant="danger" />
      <IconButton aria-label="Share" icon="share" disabled />
    </Row>
  );
}

export function PillDemo(): ReactElement {
  return (
    <div className="flex flex-col gap-3">
      <Row>
        <Pill icon="life" label="Lives" value={20} resourceKind="life" size="lg" />
        <Pill icon="point" label="Points" value={7} resourceKind="point" size="lg" />
      </Row>
      <Row>
        <Pill icon="life" label="Lives" value={12} resourceKind="life" />
        <Pill icon="point" label="Points" value="unknown" resourceKind="point" />
        <Pill icon="shield" label="Shield" value={2} resourceKind="shield" captionVisible />
        <Pill icon="upgrade" label="Upgrade points" value={1} resourceKind="upgradePoint" captionVisible />
      </Row>
      <Row>
        <Pill icon="life" label="Lives" value={4} resourceKind="life" size="sm" />
        <Pill icon="upgrade" label="Upgrade points" value={0} resourceKind="upgradePoint" size="sm" />
        <Pill icon="clock" label="Turn time" value={60} size="sm" />
      </Row>
    </div>
  );
}

const BADGES: readonly BadgeGroupItem[] = [
  { id: 'block', icon: 'block', label: 'Block' },
  { id: 'persistent', icon: 'persistent', label: 'Poison', value: 2, tone: 'threat-attack' },
  { id: 'spied-by-you', icon: 'spied-by-you', label: 'Spied', tone: 'mine' },
  { id: 'invisibility', icon: 'invisibility', label: 'Invisibility', value: 4, tone: 'threat-other' },
  { id: 'bot', icon: 'bot', label: 'Bot' },
];

export function BadgeDemo(): ReactElement {
  const [overflowOpened, setOverflowOpened] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <Row>
        <Badge icon="shield-active" label="Shield" value={3} tone="shield" />
        <Badge icon="sentence-ticking" label="Sentence" value={2} tone="threat-attack" />
        <Badge icon="spying-on-you" label="Spying on you" tone="threat-other" labelHidden />
        <Badge label="Host" />
      </Row>
      <BadgeGroup items={BADGES} />
      <BadgeGroup
        items={BADGES}
        max={3}
        onOverflowClick={() => {
          setOverflowOpened((count) => count + 1);
        }}
      />
      <Caption>{`Overflow opened ${String(overflowOpened)} times`}</Caption>
    </div>
  );
}

const SEAT_NAMES = ['Ada', 'Bo', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal'] as const;

export function AvatarDemo(): ReactElement {
  const portrait = getOpponentPlaceholderUrl();
  return (
    <div className="flex flex-col gap-3">
      <Row>
        {SEAT_NAMES.map((name, seat) => (
          <Avatar key={name} name={name} seatIndex={seat} />
        ))}
        <Avatar name="walk-in" seatIndex={null} />
      </Row>
      <Row>
        <Avatar name="Ada" seatIndex={1} eliminated />
        <Avatar name="Ada" seatIndex={2} imageUrl={portrait} />
        <Avatar name="Ada" seatIndex={2} imageUrl={portrait} eliminated />
      </Row>
      <Row>
        <Avatar name="Bo" seatIndex={4} size="sm" />
        <Avatar name="Bo" seatIndex={4} />
        <Avatar name="Bo" seatIndex={4} size="lg" />
        <Avatar name="Bo" seatIndex={4} size="lg" imageUrl={portrait} />
      </Row>
    </div>
  );
}

type ReleaseTab = 'latest' | 'history' | 'archive';

export function TabsDemo(): ReactElement {
  const [selected, setSelected] = useState<ReleaseTab>('latest');
  return (
    <Tabs
      label="Release notes"
      tabs={[
        { id: 'latest', label: 'Latest' },
        { id: 'history', label: 'History' },
        { id: 'archive', label: 'Archive', disabled: true },
      ]}
      selectedId={selected}
      onSelect={setSelected}
    >
      <Caption>{`Panel: ${selected}. ArrowLeft and ArrowRight move, Home and End jump.`}</Caption>
    </Tabs>
  );
}

type Difficulty = 'easy' | 'normal' | 'hard';

export function SegmentedDemo(): ReactElement {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [seats, setSeats] = useState(3);
  const options = [
    { value: 'easy', label: 'Easy' },
    { value: 'normal', label: 'Normal' },
    { value: 'hard', label: 'Hard' },
  ] as const;
  return (
    <div className="flex flex-col gap-3">
      <Segmented label="Difficulty" options={options} value={difficulty} onChange={setDifficulty} />
      <Segmented
        label="Seats"
        options={[2, 3, 4, 5].map((count) => ({ value: count, label: String(count), disabled: count === 5 }))}
        value={seats}
        onChange={setSeats}
      />
      <Segmented label="Locked difficulty" options={options} value="hard" onChange={setDifficulty} disabled />
    </div>
  );
}

export function SliderDemo(): ReactElement {
  const [committed, setCommitted] = useState(60);
  const [commits, setCommits] = useState(0);
  return (
    <div className="flex max-w-sm flex-col gap-2">
      <Slider
        label="Turn time"
        min={5}
        max={180}
        step={5}
        value={committed}
        formatValue={(value) => `${String(value)}s`}
        onCommit={(value) => {
          setCommitted(value);
          setCommits((count) => count + 1);
        }}
      />
      <Caption>{`Last commit: ${String(committed)}s (${String(commits)} commits)`}</Caption>
      <Slider label="Locked" min={0} max={10} value={4} onCommit={() => undefined} disabled />
    </div>
  );
}

export function ToggleDemo(): ReactElement {
  const [sound, setSound] = useState(true);
  const [vibration, setVibration] = useState(false);
  return (
    <Row>
      <Toggle label="Sound" icon="sound" pressed={sound} onPressedChange={setSound} />
      <Toggle label="Vibration" icon="vibration" labelHidden pressed={vibration} onPressedChange={setVibration} />
      <Toggle label="Locked" pressed onPressedChange={() => undefined} disabled />
    </Row>
  );
}

export function TooltipDemo(): ReactElement {
  return (
    <Row>
      <Tooltip content="Not enough points">
        <Button variant="quiet">Buy</Button>
      </Tooltip>
      <Tooltip content="Opens the shop below the table" placement="bottom">
        <IconButton aria-label="Shop" icon="shop" title={null} />
      </Tooltip>
    </Row>
  );
}

export function ScrollAreaDemo(): ReactElement {
  return (
    <div className="flex flex-col gap-3">
      <ScrollArea label="Action log" className="h-40 rounded-v7-chrome-sm bg-v7-bg-0 p-3">
        <ol className="flex flex-col gap-1 font-v7-body text-v7-body font-bold text-v7-text">
          {Array.from({ length: 24 }, (_, line) => (
            <li key={line}>{`Round ${String(Math.floor(line / 3) + 1)}: sample log line ${String(line + 1)}`}</li>
          ))}
        </ol>
      </ScrollArea>
      <ScrollArea axis="x" className="pb-2">
        <div className="flex w-max gap-2">
          {Array.from({ length: 12 }, (_, index) => (
            <Pill key={index} icon="life" label="Lives" value={index + 1} resourceKind="life" />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function TextFieldDemo(): ReactElement {
  const [nickname, setNickname] = useState('');
  return (
    <div className="flex max-w-sm flex-col gap-3">
      <TextField
        label="Nickname"
        name="nickname"
        hint="Shown to other players"
        value={nickname}
        error={nickname.trim() === '' ? 'Pick a nickname' : null}
        onChange={(event) => {
          setNickname(event.currentTarget.value);
        }}
      />
      <TextField label="Join code" placeholder="ABCD" autoCapitalize="characters" />
      <TextField label="Message" labelHidden placeholder="Message" />
      <TextField label="Locked" value="Read only" disabled readOnly />
    </div>
  );
}

function SlidePanel({ title, body }: { title: string; body: string }): ReactElement {
  return (
    <div className="flex min-h-32 flex-col gap-2 rounded-v7-chrome-sm bg-v7-panel-2 p-4">
      <p className="font-v7-display text-v7-title text-v7-text">{title}</p>
      <p className="font-v7-body text-v7-body font-bold text-v7-text-2">{body}</p>
    </div>
  );
}

const HOW_TO_PLAY: readonly CarouselSlide[] = [
  { id: 'goal', label: 'Goal', content: <SlidePanel title="Goal" body="Sample slide one." /> },
  {
    id: 'turns',
    label: 'Turns',
    content: <SlidePanel title="Turns" body="Sample slide two." />,
    dataAttributes: { 'data-section': 'turns' },
  },
  { id: 'lives', label: 'Lives', content: <SlidePanel title="Lives" body="Sample slide three." /> },
];

const AWARDS: readonly CarouselSlide[] = ['First', 'Second', 'Third', 'Fourth'].map((title) => ({
  id: title.toLowerCase(),
  label: `${title} award`,
  content: <SlidePanel title={`${title} award`} body="A grid at desktop, a carousel elsewhere." />,
}));

export function CarouselDemo(): ReactElement {
  const [index, setIndex] = useState(0);
  return (
    <div className="flex flex-col gap-6">
      <Carousel
        label="How to play"
        slides={HOW_TO_PLAY}
        index={index}
        onIndexChange={setIndex}
        previousLabel="Previous"
        nextLabel="Next"
      />
      <Caption>{`Controlled index: ${String(index)}`}</Caption>
      <Carousel label="Awards" slides={AWARDS} gridAtDesktop previousLabel="Previous" nextLabel="Next" />
    </div>
  );
}

const KIT_STATS: readonly KitTileStat[] = [
  { icon: 'life', label: 'Lives', value: '20' },
  { icon: 'point', label: 'Points', value: '3' },
  { icon: 'upgrade', label: 'Upgrade points', value: '1' },
  { icon: 'draw', label: 'Draws', value: '2' },
];

export function KitTileDemo(): ReactElement {
  const [selected, setSelected] = useState<'sample' | 'other'>('sample');
  const [infoOpened, setInfoOpened] = useState(0);
  const portrait = (
    <img src={getOpponentPlaceholderUrl()} alt="" draggable={false} className="size-full object-cover" />
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KitTile
          name="Sample kit"
          portrait={portrait}
          stats={KIT_STATS}
          selected={selected === 'sample'}
          onSelect={() => {
            setSelected('sample');
          }}
          onInfo={() => {
            setInfoOpened((count) => count + 1);
          }}
          infoLabel="Sample kit details"
        />
        <KitTile
          name="Other kit"
          portrait={portrait}
          stats={KIT_STATS}
          selected={selected === 'other'}
          onSelect={() => {
            setSelected('other');
          }}
        />
        <KitTile
          name="Excluded kit"
          portrait={portrait}
          stats={KIT_STATS}
          excluded
          onSelect={() => undefined}
        />
        <KitTile name="Display only" portrait={portrait} stats={KIT_STATS.slice(0, 2)} />
      </div>
      <Caption>{`Info opened ${String(infoOpened)} times`}</Caption>
    </div>
  );
}
