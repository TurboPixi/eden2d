import { World } from "../world";

// Expressions.
export type EExpr = EPrim | EFunc | ECall | EInvoke | EDef | ELet | ESym | ESet | EGet | ECallable | EInvokable | EUndefined;
export type EUndefined = [];
export type EPrim = number | boolean | ESym | [string]; // [string] is a bit of crappy escaping to differentiate strings from symbol references.
export type ESym = string;
export type ECall = [EExpr, EArgs];
export type EInvoke = [EExpr, ...EExpr[]];
export type EDef = ['def', string, EExpr];
export type ELet = ['let', EArgs, ...EExpr[]];
export type EGet = ['get', EExpr, ESym]
export type ESet = ['set', EExpr, ESym, EExpr]
export type EInvokable = EFunc | ENativeFunc;
export type EFunc = ['func', EParams, ...EExpr[]];
export type ENativeFunc = ['native', 'func', EParams, NativeFunc];
export type ECallable = EAction | ENativeAction;
export type EAction = ['action', EParams, ...EExpr[]];
export type ENativeAction = ['native', 'action', EParams, NativeFunc];
export type EArgs = { [arg: string]: EExpr };
export type EParams = string[];

// Stack frame.
export type Frame = {
  name: string,
  args: { [name: string]: EPrim }
};

export type NativeFunc = (world: World, frame: Frame) => any;
