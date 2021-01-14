import { _add, _eq, _forEach, _gt, _if, _log } from "./script/builtins";
import { evaluate, _eval } from "./script/eval";
import { parse } from "./script/kurt";
import { _print } from "./script/print";
import { scopeDef, scopeNew, _root } from "./script/scope";
import { $, $$, EExpr, eq, nil, _, _def, _do, _exists, _blk, _parent, _scope, _self, _set, __ } from "./script/script";

let totalFailures = 0;

export function runTests() {
  testBasic();
  testAccessors();
  testDef();
  testFuncs();
  testNestedQuoting();
  testDo();
  testScopesAndFuncs();
  testOptDefParams();
  testIf();
  testClosure();
  testForEach();
  testClass();
  testSelfScope();

  if (totalFailures == 0) {
    console.log("--[ all passed ]-------------------");
  } else {
    console.log(`--[ ${totalFailures} failed ]------------------`);
  }
}

let test = $('test');
function run(name: string, ...exprs: EExpr[]) {
  console.log(`\n--[ ${name} ]----------------------`);

  let scope = scopeNew(_root, nil);
  scopeDef(scope, $('failures'), 0);
  _eval(scope, parse(`
    [def :test [expect expr|
      if [= expect expr]
        [|log "--[ pass ]-"]
        [|do
          [set :failures [+ failures 1]]
          [log "--[ fail ]-"]
          [log expect]
          [log expr]
        ]
      ]
    ]`
  ));

  let last: EExpr;
  for (let expr of exprs) {
    last = evaluate(scope, expr);
  }

  totalFailures += _eval(scope, $('failures')) as number;
}

function testBasic() {
  run("number", parse(`[test 42 42]`));
  run("string", parse(`[test "foo" "foo"]`));
  run("boolean", parse(`[test true true]`));
  run("quoted number", parse(`[test 42 :42]`));
  run("quoted string", parse(`[test "foo" :"foo"]`));
  run("quoted number", parse(`[test true :true]`));
  run("quoted list", parse(`[test :[42 54] :[42 54]]`));
}

function testAccessors() {
  run(
    "basic accessors",
    parse(`[do
      [def scope:foo 42]
      [test 42 [scope :foo]]
      [set :foo 54]
      [test 54 [:foo]]
      [test 54 foo]
    ]`)
  );

  run(
    "def, set, exists",
    parse(`[do
      [def :bag {foo:42 bar:"baz"}]
      [test true [? bag:foo]]
      [test 42 [bag:foo]]
      [test 54 [set bag:foo 54]]
      [test 54 [bag:foo]]
      [test true [? bag:bar]]
      [test false [? bag:baz]]
    ]`)
  )

  run(
    "dict accessors",
    parse(`[do
      [def :thing 42]
      [def :bag { val:thing }]
      [test { val:42 } bag]
      [test 42 [bag :val]]
    ]`)
  )
}

function testDef() {
  run(
    "defs",
    parse(`[do
      [test false [? :foo]]
      [def :foo 42]
      [test true [? :foo]]
      [test 42 foo]

      [{foo:42} [|
        do [
          [def :bar 54]
          [test true [? :bar]]
        ]
      ]]
      [test false [? :bar]]
    ]`)
  )
}

function testFuncs() {
  run(
    "basic funcs",
    parse(`[
      [def :fn [| 37]]
      [test [| 37] fn]
      [test 37 [fn]]
      [test 37 [{} fn]]
    ]`)
  );

  run(
    "basic func scoping",
    parse(`[do
      [def :fn [| do
        [def :foo 42]
        [+ foo 1]
      ]]
      [test 43 [fn]]
    ]`)
  );

  run(
    "explicit scoping",
    parse(`[do
      [test "foo" [{x:"foo" y:"bar"} x]]
      [test "foo" [{x:"foo" y:"bar"} [| x]]]
      [test 42 [{x:20 y:22} +]]
      [test 42 [+ 20 22]]
    ]`)
  );

  run(
    "more explicit scopes",
    parse(`[do
      [test 42 [{x:20 y:22} [| + x y]]]
    ]`)
  );

  // Explicit scope in function definition, calls, and expr eval.
  // TODO: Consider making _root parent implicit?
  //   We have no way to reference the root scope in parsing, but without it we're missing builtins.
  //
  // run(
  //   "explicitly scoped funcs",
  //   [_def, $$('env'), { parent: _root, x: 22 }],
  //   [_def, $$('fn'), [_f, $('env'), [$('y')],
  //     [_add, $('x'), $('y')]
  //   ]],
  //   [test, 42, [$('fn'), 20]],

  //   [_def, $$('env2'), { parent: _root, x: 23 }],
  //   [test, 43, [{ y: 20, env: $('env2') }, $('fn')]],

  //   [_def, $$('env2'), { parent: _root, x: 24 }],
  //   [test, 44, [{ y: 20, env: $('env2') }, [_f, [], [_add, $('x'), $('y')]]]],
  // );
}

function testNestedQuoting() {
  // TODO: Add quasi-quoting.
  run(
    "nested quoting",
    parse(`[
      :["foo" :["bar" "baz"]]
      :[+ 1 2])
      [test 3 [eval :[+ 1 2]]]
      [test 3 [+ 1 2]]
      [test :[1 2 [+ 3 4]] :[1 2 [+ 3 4]]]
    ]`)
  )
}

function testDo() {
  run(
    "basic do",
    parse(`[test "w00t"
      [do
        [def :foo "w00t"]
        [log foo]
        foo
      ]
    ]`)
  )

  run(
    "do with scopes",
    parse(`[do
      [def :val 42]
      [test 42 [if true [| val]]]
      [test 42 [if true
        [|do
          [log "w00t"]
          val
        ]
      ]]
    ]`)
  )
}

function testScopesAndFuncs() {
  run("func eval'd in new scope",
    parse(`[test 43 [{foo: 42} [| [+ foo 1]]]]`)
  );

  run("expr eval'd directly in new scope",
    parse(`[test 44 [{foo: 42} [+ foo 2]]]`)
  );

  run(
    "Reference to outer scope",
    parse(`[do
      [def :val 42]
      [def scope:fn [x|
        [{x:x y:val} +]
      ]]
      [test 96 [{x:54} fn]]
    ]`)
  );

  run(
    "simple function (named params)",
    parse(`[do
      [def :fn [x|
        [{x:x y:54} +]
      ]]
      [test 96 [{x:42} fn]]
    ]`)
  );
}

function testOptDefParams() {
  run(
    "default parameters",
    parse(`[do
      [def :bump [a val|
        do
          [def :amt [if [? :val]
            [| val]
            [| 1]]
          ]
          [{x:a y:amt} +]
        ]
      ]
      [test 43 [bump 42]]
      [test 44 [bump 42 2]]
    ]`)
  );

  // TODO: Do this with a macro; need quasi-quoting to make that go.
}

function testIf() {
  run(
    "basic if with expressions",
    parse(`[do
      [test 42 [if true 42]]
      [test 42 [[| if true 42]]]
      [test 42 [{foo:"bar"} [if [= foo "bar"] 42]]]
      [test 43 [{foo:"baz"} [if [= foo "bar"] 42 43]]]
    ]`)
  );
}

function testClosure() {
  run(
    "simple closure over lexical scope",
    parse(`[do
      [def :outer 42]
      [def :fn [x | + x outer]]
      [test 96 [fn 54]]
    ]`)
  )

  run(
    "closure over enclosing scope, after return",
    parse(`[do
      [def :fn [| do
        [def :hidden 42]
        [| hidden]
      ]]
      [def :cl [fn]]
      [test 42 [cl]]
    ]`)
  );
}

function testForEach() {
  run(
    "basic for-each over list",
    parse(`[do
      [def :list :[1 2 3 4 3 2 1]]
      [def :max 0]

      [for-each list [val|
        if [> val max]
          [| set :max val]
        ]
      ]

      [test 4 max]
    ]`)
  )
}

function testClass() {
  run(
    "simple singleton class",
    parse(`[do
      [def :OneThing {
        val: 42
        fn: [| + [@:val] 1]
      }]

      [def :thing OneThing]
      [test 43 [{@:thing} [thing:fn]]]
      [test 43 [[thing:fn]]]
    ]`)
  );

  run(
    "class with callback to closure",

    parse(`[do
      [def :trampoline [callback|
        [callback]
      ]]

      [def :Thing {
        val: 42
        fn: [|
          trampoline [| + [@:val] 1]
        ]
      }]

      [test 43 [{@:Thing} [Thing:fn]]]
      [test 43 [[Thing:fn]]]
    ]`)
  );

  run(
    "singleton internal method call",
    parse(`[do
      [def :Thing {
        val: 42
        foo: [| [@:bar]]
        bar: [| @:val]
      }]
      [test 42 [[Thing:foo]]]
    ]`)
  );

  run(
    "instance internal method call",
    parse(`[do
      [def :Thing {
        make: [| {parent:Thing val:42}]
        foo: [| [@:bar]]
        bar: [| @:val]
      }]
      [def :thing [[Thing:make]]]
      [test 42 [[thing:foo]]]
    ]`)
  );
}

function testSelfScope() {
  run(
    "internal scopes",
    parse(`[do
      [def :fn [| do
        [def :x 42]
        [{x:43} [+ [scope:x] [[scope:parent]:x]]]
      ]]
      [test 85 [fn]]
    ]`)
  );

  run(
    "self vs scope",
    parse(`[do
      [def :Thing {
        val: 42
        fn: [| if true
          [| do
            [def :val 43]
            [@:val]
          ]
        ]
      }]
      [test 42 [[Thing:fn]]]
    ]`)
  );
}
