use std::fmt;
use super::{Node, NodeRef};

impl<'a> fmt::Display for Node<'a> {
  fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
    match self {
      Node::Nil => write!(f, "nil"),
      Node::Num(n) => write!(f, "{}", n),
      Node::Str(n) => write!(f, "{}", n),
      Node::Bool(n) => write!(f, "{}", n),
      Node::Id(n) => write!(f, "{}", n),
      Node::Sym(n) => write!(f, ":{}", n),
      Node::Native(_) => write!(f, "<native>"),

      Node::List(v) => {
        // TODO: There's gotta be a terser way to handle errors in this?
        write!(f, "[ ")?;
        write_vec(f, v)?;
        write!(f, "]")
      }

      Node::Dict(d) => {
        // TODO: There's gotta be a terser way to handle errors in this?
        write!(f, "{{ ")?;
        for (name, node) in d {
          write!(f, "{}: ", name)?;
          (*node).fmt(f)?;
          write!(f, " ")?;
        }
        write!(f, "}}")?;
        Ok(())
      }

      Node::Block(args, expr) => {
        write!(f, "( ")?;
        write_vec(f, args)?;
        write!(f, "| ")?;
        (*expr).fmt(f)?;
        write!(f, ")")
      }
    }
  }
}

fn write_vec(f: &mut fmt::Formatter, v: &Vec<NodeRef>) -> fmt::Result {
  use std::fmt::Display;
  use std::fmt::Write;

  for n in v {
    (*n).fmt(f)?;
    f.write_char(' ')?;
  }
  Ok(())
}
