/**
 * V7 arena entry (technical spec v7 §4.2 / §4.4, L72-20). `App` mounts it for a playing Classic
 * room and `EndScreen` for the finished board when the `?ui=next` switch is on
 * (`ui-switch.ts`). Until L74-01 replaces the body it renders the classic `TableScreen` with
 * the very same props, so a tester who opts in is never stranded without a playable table.
 */

import type { ReactElement } from 'react';

import { TableScreen, type TableScreenProps } from '../table';

export type ArenaScreenProps = TableScreenProps;

export function ArenaScreen(props: ArenaScreenProps): ReactElement {
  return <TableScreen {...props} />;
}
