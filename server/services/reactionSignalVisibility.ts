import type {ReactionAuthority} from './reactionAuthority';

type Snapshot=ReturnType<ReactionAuthority['snapshot']>;

/** Published signal state is viewable by everyone; mutations have separate role guards. */
export function visibleReactionSnapshot(snapshot:Snapshot,_isAdmin=false):Snapshot {
  return snapshot;
}
