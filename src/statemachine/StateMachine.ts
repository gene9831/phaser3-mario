interface IState {
  name: string;
  group?: string;
  onEnter?: () => void;
  onUpdate?: (dt: number) => void;
  onExit?: () => void;
}

interface IStateGroup extends IState {
  states: string[];
}

type StateConfig = Omit<IState, "name" | "group">;

export default class StateMachine {
  private context: any;
  readonly name: string;
  readonly states = new Map<string, IState | IStateGroup>();
  // readonly stateGroups = new Map<string, IStateGroup>();
  private currentState?: IState;
  private nextStateTimer: number = -1;
  private debug: boolean = false;

  constructor(context: any, name: string, debug: boolean = false) {
    this.context = context;
    this.name = name;
    this.debug = debug;
  }

  private combineName(groupName: string | undefined, name: string) {
    if (groupName && groupName.length > 0) {
      return `${groupName}.${name}`;
    }
    return name;
  }

  isCurrentState(name: string, groupName?: string) {
    if (!this.currentState) return false;

    return this.currentState.name === this.combineName(groupName, name);
  }

  getCurrentState() {
    return this.currentState?.name;
  }

  addState(name: string, config?: StateConfig) {
    this.states.set(name, {
      name,
      onEnter: config?.onEnter?.bind(this.context),
      onUpdate: config?.onUpdate?.bind(this.context),
      onExit: config?.onExit?.bind(this.context),
    });
    return this;
  }

  addStateGroup(groupName: string, config?: StateConfig, states?: IState[]) {
    const statesName: string[] = [];

    this.states.set(groupName, {
      name: groupName,
      onEnter: config?.onEnter?.bind(this.context),
      onUpdate: config?.onUpdate?.bind(this.context),
      onExit: config?.onExit?.bind(this.context),
      states: statesName,
    });

    states?.forEach((state: IState) => {
      statesName.push(state.name);
      const eName = this.combineName(groupName, state.name);
      this.states.set(eName, {
        name: eName,
        group: groupName,
        onEnter: state?.onEnter?.bind(this.context),
        onUpdate: state?.onUpdate?.bind(this.context),
        onExit: state?.onExit?.bind(this.context),
      });
    });

    return this;
  }

  setState(name: string, groupName?: string, duration: number = 0, nextName?: string, nextGroupName?: string) {
    let eName = this.combineName(groupName, name);

    if (!this.states.has(eName)) return this;

    // same state
    if (this.currentState?.name === eName) return this;

    // previous state onExit
    this.currentState?.onExit?.();
    if (this.currentState?.group) {
      this.states.get(this.currentState.group)?.onExit?.();
    }

    if (this.debug) {
      console.debug(
        `[StateMachine ${this.name}] ${this.currentState?.name || "none"} => ${eName}${
          duration > 0 ? ` (duration: ${duration}) => ${this.combineName(nextGroupName, nextName || "")}` : ""
        }`
      );
    }

    // clear timer
    if (this.nextStateTimer > 0) {
      clearTimeout(this.nextStateTimer);
      this.nextStateTimer = -1;
    }

    this.currentState = this.states.get(eName)!;

    // next state timer
    if (duration > 0 && nextName) {
      // TODO 改成累加 delta time 更合适
      this.nextStateTimer = setTimeout(() => {
        this.setState(nextName, nextGroupName);
        this.nextStateTimer = -1;
      }, duration);
    }

    if (this.currentState.group) {
      this.states.get(this.currentState.group)?.onEnter?.();
    }
    this.currentState.onEnter?.();

    return this;
  }

  udpate(dt: number) {
    if (this.currentState?.group) {
      this.states.get(this.currentState.group)?.onUpdate?.(dt);
    }
    this.currentState?.onUpdate?.(dt);
  }
}
