import { World } from "../world";

// Expressions.
export type EExpr = EPrim | ECall | EDef | ENative | ELet | ELoc | ESet | EGet | EAdd;
export type EPrim = string | number | boolean;
export type ELoc = [string];
export type ECall = [string, EArgs];
export type EDef = ['def', string, EParams, ...EExpr[]];
export type ELet = ['let', EArgs, ...EExpr[]];
export type EGet = [EExpr, string]
export type ESet = [EExpr, string, EExpr]
export type ENative = ['native', NativeFn];
export type EArgs = { [arg: string]: EExpr };
export type EParams = string[]

export type EAdd = ['+', EExpr, EExpr];

// Stack frame.
export type Frame = {
  name: string,
  args: { [name: string]: EPrim }
};

export type NativeFn = (world: World, frame: Frame) => any;
