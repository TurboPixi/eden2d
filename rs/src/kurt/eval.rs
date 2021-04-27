use std::collections::HashMap;

use crate::kurt::r;
use crate::kurt::Node;
use crate::kurt::NodeRef;

// TODO
pub fn eval<'a>(env: NodeRef<'a>, expr: NodeRef<'a>) -> NodeRef<'a> {
    println!("eval -- {} :: {}", env, expr);
    match &*expr {
        // <prim> -> <prim>
        Node::Nil => expr,
        Node::Num(_) => expr,
        Node::Str(_) => expr,
        Node::Bool(_) => expr,

        // :sym -> :sym
        Node::Sym(s) => r(Node::Id(s)),

        // name -> name
        Node::Native(f) => f(env),

        // ident -> env:ident
        Node::Id(_) => {
            // Special case: env always refers to the current environment.
            if let Node::Id(s) = *expr {
                if s == "env" {
                    return env;
                }
            }
            match env.lookup(expr) {
                Ok(n) => n,
                Err(msg) => panic!("lookup failed: {}", msg),
            }
        }

        // (args... | exprs...) -> (args... | [eval exprs...])
        Node::Block(args, expr) => r(Node::Block(args.clone(), eval(env.clone(), expr.clone()))),

        // { key:expr... } -> { key:[eval expr]... }
        Node::Dict(map) => {
            let mut new_map = HashMap::<&'a str, NodeRef>::new();
            for (key, node) in map {
                new_map.insert(key, eval(env.clone(), node.clone()));
            }
            r(Node::Dict(new_map))
        }

        // [exprs...] -> [eval [exprs...]]
        Node::List(vec) => {
            let exprs: Vec<NodeRef> = vec
                .into_iter()
                .map(|item| eval(env.clone(), item.clone()))
                .collect();
            exec(env, exprs)
        }
    }
}

pub fn exec<'a>(env: NodeRef<'a>, vec: Vec<NodeRef<'a>>) -> NodeRef<'a> {
    let ls = Node::List(vec.clone());
    println!("exec -- {} :: {}", env, ls);

    match vec.len() {
        // [] -> nil
        // TODO: Does this make sense?
        0 => r(Node::Nil),

        // [expr] -> expr
        // TODO: no-param call?
        1 => {
            let first = vec.first().unwrap();
            match &*first {
                _ => first.clone(),
            }
        }

        // [expr expr] ->
        2 => {
            let first = vec.get(0).unwrap().clone();
            let second = vec.get(1).unwrap().clone();
            match (&*first, &*second) {
                // [dict id] -> access
                (Node::Dict(_), Node::Id(s)) => eval(first, r(Node::Id(s))),

                // [dict block] -> invoke
                (Node::Dict(map), Node::Block(_, expr)) => {
                    let params = copy_map(map.clone());
                    eval(r(Node::Dict(params)), expr.clone())
                }

                _ => unimplemented!(),
            }
        }

        _ => unimplemented!(),
    }
}

fn copy_map<'a>(map: HashMap<&'a str, NodeRef<'a>>) -> HashMap<&'a str, NodeRef<'a>> {
    let mut new_map = HashMap::<&'a str, NodeRef>::new();
    for (key, node) in map {
        new_map.insert(key, node.clone());
    }
    new_map
}
