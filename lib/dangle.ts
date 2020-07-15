export enum DangleState {
  IDLE,
  HOLDING,
  DANGLING,
}

function toDangleMouseEvent(e: MouseEvent | TouchEvent): DangleMouseEvent {
  if ((e as any).touches) {
    const touchEvent = e as TouchEvent;
  }
  const mouseEvent = e as MouseEvent;
  return mouseEvent;
}

interface DangleMouseEvent {
  pageX: number;
  pageY: number;
}

export interface DangleOption {
  holdingTheshold: number;
  holdingOrthogonalTheshold: number;
  stretch: number;
  strecthThreshold: number;
  minStep: number;
  maxStep: number;
  padding: number;
  interactable: boolean;
  mapEventToPosition: (e: DangleMouseEvent) => number;
  mapEventToOrthogonalPosition: (e: DangleMouseEvent) => number;
}

export class Dangle {

  private state_: DangleState;
  private option_: DangleOption;

  private lastTime_: number;
  private lastPosition_: number;
  private lastOrthogonalPosition_: number;

  private dpStack_: Array<{time: number, dp: number}> = [];

  constructor(
    private readonly el_: HTMLElement,
    option: DangleOption) {
    this.startCheckHoldingThreshold = this.startCheckHoldingThreshold.bind(this);
    this.checkHoldingThreshold = this.checkHoldingThreshold.bind(this);
    this.startHolding = this.startHolding.bind(this);
    this.holding = this.holding.bind(this);
    this.startDangling = this.startDangling.bind(this);
    this.dangling = this.dangling.bind(this);
  }

  private setOption(option: DangleOption) {
    
  }

  private initialize() {
    this.el_.addEventListener('mousedown', this.startCheckHoldingThreshold);
    this.el_.addEventListener('touchstart', this.startCheckHoldingThreshold);
  }

  private startCheckHoldingThreshold(evt: MouseEvent | TouchEvent) {
    if (this.state_ !== DangleState.IDLE) return;
    if (!this.option_.interactable) return;
    const e = toDangleMouseEvent(evt);
    this.lastPosition_ = this.option_.mapEventToPosition(e);
    this.lastOrthogonalPosition_ = this.option_.mapEventToOrthogonalPosition(e);
    window.addEventListener('mousemove', this.checkHoldingThreshold);
    window.addEventListener('touchmove', this.checkHoldingThreshold);
    const mouseup = () => {
      window.removeEventListener('mousemove', this.checkHoldingThreshold);
      window.removeEventListener('touchmove', this.checkHoldingThreshold);
      window.removeEventListener('mouseup', mouseup);
      window.removeEventListener('touchend', mouseup);
    };
    window.addEventListener('mouseup', mouseup);
    window.addEventListener('touchend', mouseup);
  }

  private checkHoldingThreshold(evt: MouseEvent | TouchEvent) {
    if (this.state_ !== DangleState.IDLE) return;
    const e = toDangleMouseEvent(evt);
    const pos = this.option_.mapEventToPosition(e);
    const opos = this.option_.mapEventToOrthogonalPosition(e);
    const dp = this.lastPosition_ - pos;
    const odp = this.lastOrthogonalPosition_ - opos;
    if (odp > this.option_.holdingOrthogonalTheshold) {
      window.removeEventListener('mousemove', this.checkHoldingThreshold);
      window.removeEventListener('touchmove', this.checkHoldingThreshold);
    }
    else if (dp > this.option_.holdingOrthogonalTheshold) {
      window.removeEventListener('mousemove', this.checkHoldingThreshold);
      window.removeEventListener('touchmove', this.checkHoldingThreshold);
      this.startHolding(evt);
    }
  }

  private startHolding(evt: MouseEvent | TouchEvent) {
    if (this.state_ !== DangleState.IDLE) return;
    const e = toDangleMouseEvent(evt);
    this.lastPosition_ = this.option_.mapEventToPosition(e);
    this.lastOrthogonalPosition_ = this.option_.mapEventToOrthogonalPosition(e);
    this.dpStack_ = [];
    this.state_ = DangleState.HOLDING;
    window.addEventListener('mousemove', this.holding);
    window.addEventListener('touchmove', this.holding);
    const mouseup = () => {
      window.removeEventListener('mousemove', this.holding);
      window.removeEventListener('touchmove', this.holding);
      window.removeEventListener('mouseup', mouseup);
      window.removeEventListener('touchend', mouseup);
      this.startDangling(evt);
    };
    window.addEventListener('mouseup', mouseup);
    window.addEventListener('touchend', mouseup);
  }

  private holding(evt: MouseEvent | TouchEvent) {
    if (this.state_ !== DangleState.HOLDING) return;
    const e = toDangleMouseEvent(evt);
    const pos = this.option_.mapEventToPosition(e);
    const opos = this.option_.mapEventToOrthogonalPosition(e);
    const dp = this.lastPosition_ - pos;
    const odp = this.lastOrthogonalPosition_ - opos;
    this.dpStack_.splice(0, 0, {
      time: Date.now(),
      dp: dp,
    });
    if (this.dpStack_.length > 10) this.dpStack_.length = 10;
  }

  private startDangling(evt: MouseEvent | TouchEvent) {
    if (this.state_ !== DangleState.HOLDING) return;
    this.lastTime_ = 0;
    requestAnimationFrame(this.dangling);
  }

  private dangling(time: number) {
    if (this.lastTime_ === 0) {
      this.lastTime_ = time;
      requestAnimationFrame(this.dangling);
      return;
    }
    const dt = time - this.lastTime_;
    this.lastTime_ = time;
    requestAnimationFrame(this.dangling);
  }

  public dispose() {

  }

}