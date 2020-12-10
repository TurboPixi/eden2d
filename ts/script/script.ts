import { World } from "../world";
// Keywords.
export const KNew = "new";
export const KDef = "def";
export const KLet = "let";
export const KSet = "set";
export const KGet = "get";
export const KNative = "native";

type EKDef = typeof KDef;
type EKLet = typeof KLet;
type EKSet = typeof KSet;
type EKGet = typeof KGet;
type EKNative = typeof KNative;

// Expressions.
export type EExpr = EPrim | ECall | EDef | ELet | ELoc | ESet | EGet;
export type EPrim = string | number | boolean;
export type ECall = [string, EArgs];
export type ELoc = [string];
export type ESet = [EKSet, EExpr, string, EExpr]
export type EGet = [EKGet, EExpr, string]
export type EArgs = { [arg: string]: EExpr };
export type EDef = [EKDef, string, EParams, EImpl];
export type EParams = string[]
export type ELet = [EKLet, EArgs, EExpr[]];
export type EImpl = ENative | EExpr[];
export type ENative = [EKNative, (world: World, frame: Frame) => any];

// Stack frame.
export type Frame = { [name: string]: EPrim };
