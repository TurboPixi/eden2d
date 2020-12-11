import { World } from "../world";

// Expressions.
export type EExpr = EPrim | ECall | EDef | ELet | ELoc | ESet | EGet | EAdd;
export type EPrim = string | number | boolean;
export type ELoc = [string];
export type ECall = [string, EArgs];
export type ELet = ['let', EArgs, EExpr[]];
export type EGet = ['get', EExpr, string]
export type ESet = ['set', EExpr, string, EExpr]
export type EDef = ['def', string, EParams, EImpl];
export type EArgs = { [arg: string]: EExpr };
export type EParams = string[]
export type EImpl = ENative | EExpr[];
export type ENative = ['native', NativeFn];

export type EAdd = ['+', EExpr, EExpr];

// Stack frame.
export type Frame = {
  name: string,
  args: { [name: string]: EPrim }
};

export type NativeFn = (world: World, frame: Frame) => any;
