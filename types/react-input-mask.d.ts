declare module 'react-input-mask' {
  import * as React from 'react';

  export interface InputState {
    value: string;
    selection: {
      start: number;
      end: number;
    } | null;
  }

  export interface BeforeMaskedStateChangeStates {
    previousState: InputState;
    currentState: InputState;
    nextState: InputState;
  }

  export interface InputMaskProps extends React.InputHTMLAttributes<HTMLInputElement> {
    mask: string | Array<string | RegExp>;
    maskChar?: string | null;
    formatChars?: { [key: string]: string };
    alwaysShowMask?: boolean;
    inputRef?: React.Ref<HTMLInputElement>;
    beforeMaskedStateChange?: (states: BeforeMaskedStateChangeStates) => InputState;
    children?: (inputProps: React.InputHTMLAttributes<HTMLInputElement>) => React.ReactElement;
  }

  export default class InputMask extends React.Component<InputMaskProps> {}
}
