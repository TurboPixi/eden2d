use std::collections::HashMap;
use std::rc::Rc;

pub mod eval;
pub mod parse;
pub mod print;
pub mod builtins;

// Node represents both the AST and runtime state.
// Parsing produces a Node graph, and evaluation updates that graph.
#[derive(Debug)]
pub enum Node<'a> {
  Dict(HashMap<&'a str, NodeRef<'a>>),
  List(Vec<NodeRef<'a>>),
  Str(&'a str),
  Num(f64),
  Bool(bool),
  Id(&'a str),
  Sym(&'a str),
  Block(Vec<NodeRef<'a>>, NodeRef<'a>),
  Native(fn(env: NodeRef<'a>) -> NodeRef<'a>),
  Nil,
}

// Shorthand for ref-counted Node references.
pub type NodeRef<'a> = Rc<Node<'a>>;

// Wrap a Node in an Rc to get a NodeRef.
pub fn r<'a>(n: Node<'a>) -> NodeRef<'a> {
  return Rc::from(n);
}

impl<'a> Node<'a> {
  pub fn sdefine(&mut self, k: &'a str, val: NodeRef<'a>) -> Result<(), &'a str> {
    match self {
      Node::Dict(map) => {
          map.insert(k, val);
          Ok(())
      }
      _ => {
        Err("def only works on dicts")
      }
    }
  }

  // pub fn define(&self, id: NodeRef<'a>, val: NodeRef<'a>) -> Result<(), &'a str> {
  //   match self {
  //     Node::Dict(map) => {
  //       if let Node::Id(s) = &*id {
  //         map.insert(s, val);
  //         Ok(())
  //       } else {
  //         Err("def requires a name")
  //       }
  //     }
  //     _ => {
  //       Err("def only works on dicts")
  //     }
  //   }
  // }

  pub fn lookup(&self, name: NodeRef<'a>) -> Result<NodeRef<'a>, NodeRef<'a>> {
    let mut cur = self;
    loop {
      match cur {
        // Check current dict.
        Node::Dict(map) => {
          if let Node::Id(s) = &*name {
            if let Some(n) = map.get(&*s) {
              return Ok(n.clone());
            }
          }

          // Check parent.
          match map.get("^") {
            Some(next) => cur = &*next,
            None => break,
          }
        },

        // TODO: integer lookups for lists.
        Node::List(_) => break,

        _ => break,
      }
    }

    // TODO: Better error.
    Err(name.clone())
  }
}
