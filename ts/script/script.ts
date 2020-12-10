import { World } from "../world";

// TODO: Consider matching return type on func defs to further disambiguate.
export type Expr = Primitive | Call | Definition | Let | Get;
export type Type = 'any' | 'str' | 'num' | 'bool' | 'ent' | 'chunk' | 'tent' | 'type';
export type Primitive = string | number | boolean;
export type Call = [string, Args];
export type Args = { [arg: string]: Expr };
export type Definition = ['def', string, Params, Impl];
export type Params = { [arg: string]: string[] | Type };
export type Let = ['let', Args, Expr[]];
export type Get = ['get', string]
export type Impl = Native | Expr[];
export type Native = ['native', (world: World, frame: Frame) => any];

export type Frame = { [name: string]: Primitive };

// Keywords.
export const Def = "def";
export const Let = "let";
export const Get = "get";
export const Native = "native";

// Types.
export const TAny: Type = "any";
export const TStr: Type = "str";
export const TNum: Type = "num";
export const TBool: Type = "bool";
export const TChunk: Type = "chunk";
export const TEnt: Type = "ent";
export const TType: Type = "type";
export const TEntType: Type = "tent";
