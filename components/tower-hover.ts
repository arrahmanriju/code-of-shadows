export type HoverSource = 'mesh' | 'label' | 'focus';

/** Coalesce mesh/DOM handoffs into one update per frame. A late pointer-out
 * from the previous tower cannot clear the newly entered tower. */
export class TowerHoverState {
  private sources: Record<HoverSource,string|null> = {mesh:null,label:null,focus:null};
  private published: string|null = null;
  private onChange:(id:string|null)=>void;

  constructor(onChange:(id:string|null)=>void) { this.onChange=onChange; }

  enter(source:HoverSource,id:string) { this.sources[source]=id; }
  leave(source:HoverSource,id:string) {
    if(this.sources[source]===id) this.sources[source]=null;
  }
  clear(source:HoverSource) { this.sources[source]=null; }
  reset() { this.sources={mesh:null,label:null,focus:null}; }
  flush() {
    const active=this.sources.focus ?? this.sources.label ?? this.sources.mesh;
    if(active!==this.published) {
      this.published=active;
      this.onChange(active);
    }
    return active;
  }
}
