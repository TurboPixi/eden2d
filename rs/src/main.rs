use std::collections::HashMap;
use std::fs;
use std::rc::Rc;

use kurt::builtins::init_builtins;

use crate::kurt::eval;
use crate::kurt::parse;
use crate::kurt::Node;

mod kurt;

#[macro_use]
extern crate pest_derive;

fn main() {
    let src = fs::read_to_string("test.kurt").expect("cannot read file");

    let mut root_map = HashMap::new();
    init_builtins(&mut root_map);

    let root = Rc::from(Node::Dict(root_map));
    let tree = parse::parse(src.as_str());
    println!("-> {}", eval::eval(root, tree));
}
