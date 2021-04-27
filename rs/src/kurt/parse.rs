use pest::iterators::Pair;
use pest::Parser;
use std::collections::HashMap;

use crate::kurt::r;
use crate::kurt::Node;
use crate::kurt::NodeRef;

#[derive(Parser)]
#[grammar = "kurt/kurt.pest"]
struct KurtParser;

pub fn parse<'a>(src: &'a str) -> NodeRef<'a> {
  let file = KurtParser::parse(Rule::file, &src)
    .expect("unsuccessful parse")
    .next()
    .unwrap();

  fn parse_value<'a>(expr: Pair<'a, Rule>) -> NodeRef {
    match expr.as_rule() {
      Rule::dict => {
        let mut map = HashMap::<&'a str, NodeRef>::new();
        expr.into_inner().for_each(|pair| match pair.as_rule() {
          Rule::pair => {
            let mut inner_rules = pair.into_inner();
            let sym = inner_rules.next().unwrap().as_str();
            let value = parse_value(inner_rules.next().unwrap());
            map.insert(sym, value);
          }
          _ => unreachable!(),
        });
        let foo = Node::Dict(map);
        r(foo)
      }

      // Rule::exec => {
      //   let inner = parse_value(expr.into_inner().next().unwrap());
      //   r(Node::Exec(inner))
      // }

      Rule::block => {
        let mut rules = expr.into_inner();
        let args = rules.next().unwrap().into_inner().map(parse_value).collect();
        let exprs = rules.map(parse_value).collect();
        r(Node::Block(args, r(Node::List(exprs))))
      }

      Rule::list => r(Node::List(expr.into_inner().map(parse_value).collect())),
      Rule::number => r(Node::Num(expr.as_str().parse().unwrap())),
      Rule::boolean => r(Node::Bool(expr.as_str().parse().unwrap())),
      Rule::string => r(Node::Str(expr.as_str())),
      Rule::sym => r(Node::Sym(&expr.as_str()[1..])),
      Rule::id => r(Node::Id(expr.as_str())),
      Rule::prim => parse_value(expr.into_inner().next().unwrap()),
      Rule::expr => parse_value(expr.into_inner().next().unwrap()),

      _ => unreachable!(),
    }
  }

  let expr = file.into_inner().next().unwrap();
  parse_value(expr)
}
