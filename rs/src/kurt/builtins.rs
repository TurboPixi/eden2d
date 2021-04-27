use std::{collections::HashMap, vec};

use crate::kurt::r;
use crate::kurt::Node;
use crate::kurt::NodeRef;

pub fn init_builtins<'a>(map: &'a mut HashMap<&str, NodeRef>) {
    map.insert("def", builtin(vec!["vals"], native_def));
    map.insert("log", builtin(vec!["msg"], native_log));
}

fn native_def<'a>(env: NodeRef) -> NodeRef<'a> {
    match loc(env.clone(), "vals") {
        Some(vals) => {
            if let Node::Dict(vals_map) = &*vals {
                for (_, _) in vals_map {
                  // env.sdefine(k, v.clone());
                }
            }
        }
        None => panic!("wut"),
    }
    r(Node::Nil)
}

fn native_log<'a>(env: NodeRef) -> NodeRef<'a> {
    println!("{}", loc_str(env.clone(), "msg"));
    r(Node::Nil)
}

fn builtin<'a>(args: Vec<&'a str>, f: fn(env: NodeRef) -> NodeRef<'a>) -> NodeRef<'a> {
    let nargs: Vec<NodeRef> = args.iter().map(|arg| r(Node::Sym(arg))).collect();
    r(Node::Block(nargs, r(Node::Native(f))))
}

fn loc<'a>(env: NodeRef<'a>, name: &str) -> Option<NodeRef<'a>> {
    if let Node::Dict(env_map) = &*env {
        Some(env_map.get(name)?.clone())
    } else {
        None
    }
}

fn loc_str<'a>(env: NodeRef<'a>, name: &str) -> &'a str {
    match &*env {
        Node::Dict(map) => match map.get(name) {
            Some(loc) => match &**loc {
                Node::Str(s) => s,
                _ => "",
            },
            None => unimplemented!(),
        },
        _ => unimplemented!(),
    }
}

// fn loc_dict<'a>(env: NodeRef<'a>, name: &str) -> HashMap<&'a str, NodeRef<'a>> {
//   if let Node::Dict(env_map) = &*env {
//     if let Some(expr) = env_map.get(name) {
//       if let Node::Dict(dict_map) = &**expr {
//         return dict_map.clone();
//       }
//     }
//   }
//   unimplemented!()
// }
