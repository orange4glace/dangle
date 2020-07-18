import { Observable, Subject, Observer } from 'rxjs';

export enum DangleState {
  IDLE,
  HOLDING,
  DANGLING,
}

function toDangleMouseEvent(e: MouseEvent | TouchEvent): DangleMouseEvent {
  if ((e as any).touches) {
    const touchEvent = e as TouchEvent;
    const touch = touchEvent.touches[0];
    return touch;
  }
  const mouseEvent = e as MouseEvent;
  return mouseEvent;
}

interface DangleMouseEvent {
  pageX: number;
  pageY: number;
}

export interface DangleOption {
  holdingTheshold?: number;
  holdingOrthogonalTheshold?: number;
  flickThreshold?: number;
  stretch?: number;
  strecthThreshold?: number;
  minStep?: number;
  maxStep?: number;
  padding?: number;
  interactable?: boolean;
  danglingDuration?: number;
  mapEventToPosition?: (e: DangleMouseEvent) => number;
  mapEventToOrthogonalPosition?: (e: DangleMouseEvent) => number;
  danglingEasingFunction?: (t: number) => number;
}

const defaultOption: DangleOption = {
  holdingTheshold: 100,
  holdingOrthogonalTheshold: 10,
  flickThreshold: 30,
  stretch: 100,
  strecthThreshold: 50,
  minStep: -3,
  maxStep: 3,
  padding: 0,
  interactable: true,
  danglingDuration: 300,
  mapEventToPosition: (e: DangleMouseEvent) => {
    return e.pageX;
  },
  mapEventToOrthogonalPosition: (e: DangleMouseEvent) => {
    return e.pageY;
  },
  danglingEasingFunction: (t: number) => {
    return t;
  },
};

export class Dangle {
  public readonly onDidChangeValue: Observable<number> = new Subject<number>();
  public readonly onDidChangeStep: Observable<number> = new Subject<number>();

  public get value() {
    return this.currentValue_ * this.option_.stretch;
  }
  public get normalizedValue() {
    return this.currentValue_;
  }
  public get step() {
    return this.currentStep_;
  }

  private state_: DangleState;
  private option_: DangleOption = defaultOption;

  private lastPosition_: number;
  private lastOrthogonalPosition_: number;

  private dpStack_: Array<{ time: number; dp: number }> = [];

  private currentStep_: number;
  private currentValue_: number;

  private holdingStartValue_: number;
  private holdingStartPosition_: number;
  private holdingStartOrthogonalPosition_: number;

  private danglingStartTime_: number;
  private danglingStartValue_: number;
  private danglingEndValue_: number;
  private danglingTargetStep_: number;
  private currentDanglingDuration_: number;
  private currentDanglingEasingFunction_: (t: number) => number;

  constructor(private readonly el_: HTMLElement, option?: DangleOption) {
    this.startCheckHoldingThreshold = this.startCheckHoldingThreshold.bind(
      this
    );
    this.checkHoldingThreshold = this.checkHoldingThreshold.bind(this);
    this.startHolding = this.startHolding.bind(this);
    this.holding = this.holding.bind(this);
    this.startDangling = this.startDangling.bind(this);
    this.dangling = this.dangling.bind(this);
    this.setOption(option);
    this.initialize();
  }

  public setOption(option: DangleOption) {
    this.option_ = {
      ...this.option_,
      ...option,
    };
  }

  private initialize() {
    this.el_.addEventListener('mousedown', this.startCheckHoldingThreshold);
    this.el_.addEventListener('touchstart', this.startCheckHoldingThreshold);
    this.currentValue_ = 0;
    this.currentStep_ = 0;
    this.setState(DangleState.IDLE);
  }

  private setState(state: DangleState) {
    this.state_ = state;
  }

  private startCheckHoldingThreshold(evt: MouseEvent | TouchEvent) {
    if (!this.option_.interactable) return;
    if (this.state_ === DangleState.DANGLING) {
      this.setState(DangleState.IDLE);
      this.startHolding(evt);
      return;
    }
    if (this.state_ !== DangleState.IDLE) return;
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
    if (Math.abs(odp) > this.option_.holdingOrthogonalTheshold) {
      window.removeEventListener('mousemove', this.checkHoldingThreshold);
      window.removeEventListener('touchmove', this.checkHoldingThreshold);
    } else if (Math.abs(dp) > this.option_.holdingOrthogonalTheshold) {
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
    this.holdingStartValue_ = this.currentValue_;
    this.holdingStartPosition_ = this.lastPosition_;
    this.holdingStartOrthogonalPosition_ = this.lastOrthogonalPosition_;
    this.dpStack_ = [];
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
    this.setState(DangleState.HOLDING);
  }

  private holding(evt: MouseEvent | TouchEvent) {
    if (this.state_ !== DangleState.HOLDING) return;
    const e = toDangleMouseEvent(evt);
    const pos = this.option_.mapEventToPosition(e);
    const opos = this.option_.mapEventToOrthogonalPosition(e);
    const dp = this.holdingStartPosition_ - pos;
    const odp = this.lastOrthogonalPosition_ - opos;
    this.dpStack_.splice(0, 0, {
      time: Date.now(),
      dp: dp,
    });
    if (this.dpStack_.length > 10) this.dpStack_.length = 10;
    const dv = dp / this.option_.stretch;
    const nextValue = this.holdingStartValue_ + dv;
    this.setValue(nextValue);
  }

  private startDangling(evt: MouseEvent | TouchEvent) {
    if (this.state_ !== DangleState.HOLDING) return;
    this.danglingStartTime_ = 0;
    const now = Date.now();
    const dpCheckTimeDiff = 100;
    let dpSum = 0;
    this.dpStack_.forEach((dp) => {
      if (now - dp.time < dpCheckTimeDiff) {
        dpSum += dp.dp;
      }
    });
    let danglingTargetStep: number;
    let dpSign = dpSum >= 0 ? 1 : -1;
    const nearestStep = this.getNearestStep();
    if (Math.abs(dpSum) > this.option_.flickThreshold) {
      danglingTargetStep = nearestStep + 1 * dpSign;
    } else {
      danglingTargetStep = nearestStep;
    }
    this.danglingTargetStep_ = danglingTargetStep;
    this.danglingStartValue_ = this.currentValue_;
    this.danglingEndValue_ = this.stepToValue(this.danglingTargetStep_);
    this.currentDanglingEasingFunction_ = this.option_.danglingEasingFunction;
    this.currentDanglingDuration_ = this.option_.danglingDuration;
    requestAnimationFrame(this.dangling);
    this.setState(DangleState.DANGLING);
  }

  private dangling(time: number) {
    if (this.state_ !== DangleState.DANGLING) return;
    if (this.danglingStartTime_ === 0) {
      this.danglingStartTime_ = time;
      requestAnimationFrame(this.dangling);
      return;
    }
    const dt = Math.min(
      1,
      (time - this.danglingStartTime_) / this.currentDanglingDuration_
    );
    const easing = this.currentDanglingEasingFunction_(dt);
    const nextValue =
      (this.danglingEndValue_ - this.danglingStartValue_) * easing +
      this.danglingStartValue_;
    this.setValue(nextValue);
    if (dt >= 1) {
      this.setState(DangleState.IDLE);
      return;
    }
    requestAnimationFrame(this.dangling);
  }

  private setValue(value: number): void {
    const lastStep = this.currentStep_;
    const lastValue = this.currentValue_;
    this.currentValue_ = this.clampValue(value);
    const sign = value >= 0 ? 1 : -1;
    this.currentStep_ = this.clampStep(Math.floor(Math.abs(value)) * sign);
    lastValue !== this.currentValue_ &&
      (this.onDidChangeValue as Subject<number>).next(this.currentValue_);
    lastStep !== this.currentStep_ &&
      (this.onDidChangeStep as Subject<number>).next(this.currentStep_);
  }

  private valueToStep(value: number): number {
    return value;
  }

  private stepToValue(step: number): number {
    return step;
  }

  private clampValue(value: number): number {
    const minValue = this.valueToStep(this.option_.minStep);
    const maxValue = this.valueToStep(this.option_.maxStep);
    return Math.max(minValue, Math.min(maxValue, value));
  }

  private clampStep(value: number): number {
    return Math.max(
      this.option_.minStep,
      Math.min(this.option_.maxStep, value)
    );
  }

  private getNearestStep(): number {
    return Math.round(Math.abs(this.currentValue_));
  }

  public dispose() {}
}
