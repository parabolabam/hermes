import {open, readFile, rename} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {rangeShape, validateWrite, validateSubmitted, type Matrix} from './policy.ts';

export interface Change {spreadsheet_id: string; range: string; alias: string; expected_values: Matrix; values: Matrix; reason: string; evidence: string}
type Status = 'intent' | 'confirmed' | 'failed' | 'uncertain';
export interface Event extends Change {id: string; status: Status; before: Matrix; after: Matrix; notice: 'pending' | 'delivered'}
export interface Remote {read(id: string, range: string): Promise<Matrix>; write(id: string, range: string, values: Matrix): Promise<void>; notify(event: Event): Promise<void>}
interface State {events: Event[]}
function matches(a: Matrix, b: Matrix, h: number, w: number): boolean {
  return Array.from({length:h},(_,r)=>Array.from({length:w},(_,c)=>a[r]?.[c] ?? '')).every((row,r)=>row.every((v,c)=>v === (b[r]?.[c] ?? '')));
}
export class Journal {
  private directory: string; private remote: Remote; private state: State; private queue: Promise<void> = Promise.resolve();
  private serial<T>(job:()=>Promise<T>):Promise<T> {const result=this.queue.then(job);this.queue=result.then(()=>{},()=>{});return result;}
  private constructor(directory: string, remote: Remote, state: State) {this.directory=directory; this.remote=remote; this.state=state;}
  static async open(directory: string, remote: Remote): Promise<Journal> {
    let state: State;
    try { state = JSON.parse(await readFile(join(directory,'journal.json'),'utf8')) as State; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('invalid journal'); state={events:[]}; }
    if (!Array.isArray(state.events)) throw new Error('invalid journal');
    return new Journal(directory,remote,state);
  }
  private async persist(): Promise<void> {
    const temp=join(this.directory,`.journal-${randomUUID()}`);
    const file=await open(temp,'wx',0o600);
    try {await file.writeFile(JSON.stringify(this.state)); await file.sync();} finally {await file.close();}
    await rename(temp,join(this.directory,'journal.json'));
    const dir=await open(this.directory,'r'); try {await dir.sync();} finally {await dir.close();}
  }
  async write(change: Change,active:()=>void=()=>{}): Promise<Event> {return this.serial(()=>this.writeOne(change,active));}
  private async writeOne(change: Change,active:()=>void): Promise<Event> {
    active();
    if (!change.reason.trim() || !change.evidence.trim()) throw new Error('missing rationale');
    const [h,w]=rangeShape(change.range);
    validateSubmitted(change.values,h,w);
    const before=await this.remote.read(change.spreadsheet_id,change.range);
    validateWrite(before,change.expected_values,change.values,h,w);
    active();const event: Event={...change,id:randomUUID(),status:'intent',before,after:change.values,notice:'pending'};
    this.state.events.push(event); await this.persist();
    let started=false;
    try {
      active();started=true;await this.remote.write(change.spreadsheet_id,change.range,change.values);
      const actual=await this.remote.read(change.spreadsheet_id,change.range);
      event.status=matches(actual,event.after,h,w) ? 'confirmed' : 'uncertain';
      await this.persist();
      if (event.status !== 'confirmed') throw new Error('unverified write');
      return event;
    } catch {
      if (event.status !== 'confirmed') {event.status=started?'uncertain':'failed'; await this.persist();}
      throw new Error('write uncertain');
    }
  }
  async reconcile(): Promise<void> {return this.serial(()=>this.reconcileAll());}
  private async reconcileAll(): Promise<void> {
    for (const event of this.state.events) if (event.status === 'intent' || event.status === 'uncertain') {
      const previous=event.status;
      try {const [h,w]=rangeShape(event.range);const current=await this.remote.read(event.spreadsheet_id,event.range);event.status=matches(current,event.after,h,w)?'confirmed':'uncertain';}
      catch {event.status='uncertain';}
      if(previous!==event.status && event.notice==='delivered')event.notice='pending';
      await this.persist();
    }
  }
  async retryNotices(): Promise<void> {return this.serial(()=>this.retryAll());}
  private async retryAll(): Promise<void> {
    for (const event of this.state.events) if ((event.status === 'confirmed' || event.status === 'uncertain') && event.notice === 'pending') {
      try {await this.remote.notify(event);} catch {continue;}
      event.notice='delivered'; await this.persist();
    }
  }
}
