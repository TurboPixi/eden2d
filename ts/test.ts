import { _eval } from "./script/eval";
import { parse } from "./script/kurt";
import { _print } from "./script/print";
import { dictDef, _root } from "./script/dict";
import { $, EExpr, nil, _, _def, _do, _exists, _blk, _self, _set, __ } from "./script/script";
import { envNew } from "./script/env";

let totalFailures = 0;

export function runTests() {
  testBasic();
  testAccessors();
  testDef();
  testBlocks();
  testNestedQuoting();
  testDo();
  testEnvAndBlocks();
  testOptDefParams();
  testIf();
  testClosure();
  testForEach();
  testClass();
  testSelfEnv();
  testSetParent();
  testRestParams();

  if (totalFailures == 0) {
    console.log("--[ all passed ]-------------------");
  } else {
    console.log(`--[ ${totalFailures} failed ]------------------`);
  }
}

function run(name: string, ...exprs: EExpr[]) {
  console.log(`\n--[ ${name} ]----------------------`);

  let env = envNew(_root, nil, "[test]");
  dictDef(env, $('failures'), 0);
  _eval(env, parse(`
    [def {test = [expect expr | if [= expect expr]
      [|log "--[ pass ]-"]
      [|do
        [set {failures = [+ failures 1]}]
        [log "--[ fail ]-"]
        [log expect]
        [log expr]
      ]
    ]}]`
  ));

  let last: EExpr;
  for (let expr of exprs) {
    last = _eval(env, expr);
  }

  totalFailures += _eval(env, $('failures')) as number;
}

function testBasic() {
  run("number", parse(`[test 42 42]`));
  run("string", parse(`[test "foo" "foo"]`));
  run("boolean", parse(`[test true true]`));
  run("quoted number", parse(`[test :42 :42]`));
  run("quoted string", parse(`[test :"foo" :"foo"]`));
  run("quoted number", parse(`[test :true :true]`));
  run("quoted list", parse(`[test :[42 54] :[42 54]]`));
}

function testAccessors() {
  run(
    "basic accessors",
    parse(`[do
      [def env {foo = 42}]
      [test 42 [env :foo]]
      [set {foo = 54}]
      [test 54 foo]
    ]`)
  );

  run(
    "def, set, exists",
    parse(`[do
      [def {bag = {foo = 42 bar = "baz"}}]
      [test true [? bag :foo]]
      [test 42 bag:foo]
      [set bag {foo = 54}]
      [test 54 bag:foo]
      [test true [? bag :bar]]
      [test false [? bag :baz]]
    ]`)
  )

  run(
    "dict accessors",
    parse(`[do
      [def { thing = 42 }]
      [def {bag = {val = thing}}]
      [test {val = 42} bag]
      [test 42 [bag :val]]
    ]`)
  )
}

function testDef() {
  run(
    "defs",
    parse(`[do
      [test false [? :foo]]
      [def {foo = 42}]
      [test true [? :foo]]
      [test 42 foo]

      [{foo = 42} [| do
        [def {bar = 54}]
        [test true [? :bar]]
      ]]
      [test false [? :bar]]
    ]`)
  )
}

function testBlocks() {
  run(
    "basic blocks",
    parse(`[do
      [def {fn = [| 37]}]
      [test [| 37] fn]
      [test 37 [fn]]
      [test 37 [{} fn]]
    ]`)
  );

  run(
    "basic block scoping",
    parse(`[do
      [def {fn = [| do
        [def {foo = 42}]
        [+ foo 1]
      ]}]
      [test 43 [fn]]
    ]`)
  );

  run(
    "explicit scoping",
    parse(`[do
      [test "foo" [{x = "foo" y = "bar"} x]]
      [test "foo" [{x = "foo" y = "bar"} [| x]]]
      [test 42 [{vals = :[20 22]} +]]
      [test 42 [+ 20 22]]
    ]`)
  );

  run(
    "more explicit env",
    parse(`[do
      [test 42 [{x = 20 y = 22} [| + x y]]]
    ]`)
  );

  run(
    "blocks with explicit env",
    parse(`[do
      -- TODO: Explicit block env in declaration NYI.
      -- [def {
      --   env = {x = 22}
      --   fn = [y | env | + x y]
      -- }]
      -- [test 42 [fn 20]]

      [def {
        env2 = {^ = env x = 23}
        fn2 = [y | + x y]
      }]
      [test 43 [{^ = env2 y = 20} fn2]]

      [def {env2 = {x = 24}}]
      [test 44 [{^ = env2 y = 20} [| + x y]]]
    ]`)
  );
}

function testNestedQuoting() {
  // TODO: Add quasi-quoting.
  run(
    "nested quoting",
    parse(`[do
      :["foo" :["bar" "baz"]]
      :[+ 1 2]
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
        [def {foo = "w00t"}]
        [log foo]
        foo
      ]
    ]`)
  )

  run(
    "do with env",
    parse(`[do
      [def {val = 42}]
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

function testEnvAndBlocks() {
  run("block eval'd in new env",
    parse(`[test 43 [{foo = 42} [| [+ foo 1]]]]`)
  );

  run("expr eval'd directly in new env",
    parse(`[test 44 [{foo = 42} [+ foo 2]]]`)
  );

  run(
    "Reference to outer env",
    parse(`[do
      [def {val = 42}]
      [def env {
        fn = [x | do
          [def {vals = [list x val]}]
          [{vals = vals} +]
        ]
      }]
      [test 96 [{x = 54} fn]]
    ]`)
  );

  run(
    "simple function (named params)",
    parse(`[do
      [def {fn = [x |
        [{vals = [list x 54]} +]
      ]}]
      [test 96 [{x = 42} fn]]
    ]`)
  );
}

function testOptDefParams() {
  run(
    "default parameters",
    parse(`[do
      [def {bump = [a val |
        do
          [def {amt = [if [? :val]
            [| val]
            [| 1]
          ]}]
          [+ a amt]
        ]}
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
      [def {foo = "bar"}]
      [test 42  [if [= foo "bar"] 42]]
      [set {foo = "baz"}]
      [test 43 [if [= foo "bar"] 42 43]]
    ]`)
  );
}

function testClosure() {
  run(
    "simple closure over lexical env",
    parse(`[do
      [def {
        outer = 42
        fn = [x | + x outer]
      }]
      [test 96 [fn 54]]
    ]`)
  )

  run(
    "closure over enclosing env, after return",
    parse(`[do
      [def {fn = [| do
        [def {hidden = 42}]
        [| hidden]
      ]}]
      [def {cl = [fn]}]
      [test 42 [cl]]
    ]`)
  )
}

function testForEach() {
  run(
    "basic for-each over list",
    parse(`[do
      [def {
        list = :[0 1 2 3 4 3 2 1]
        max = 0
      }]

      [for-each list [val |
        if [> val max]
          [| set {max = val}]
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
      [def {
        OneThing = {
          val = 42
          fn = [| + @:val 1]
        }
      }]

      [def {thing = OneThing}]
      [test 43 [{@ = thing} [thing:fn]]]
      [test 43 [thing:fn]]
    ]`)
  );

  run(
    "class with callback to closure",

    parse(`[do
      [def {
        trampoline = [callback|
          [callback]
        ]

        Thing = {
          val = 42
          fn = [|
            trampoline [| + @:val 1]
          ]
        }
      }]

      [test 43 [{@ = Thing} [Thing:fn]]]
      [test 43 [Thing:fn]]
    ]`)
  );

  run(
    "singleton internal method call",
    parse(`[do
      [def {Thing = {
        val = 42
        foo = [| [@:bar]]
        bar = [| @:val]
      }}]
      [test 42 [Thing:foo]]
    ]`)
  );

  run(
    "instance internal method call",
    parse(`[do
      [def {
        Thing = {
          make = [| {^ = Thing val = 42}] -- borken because evalDict() doesn't translate ^, but changing that breaks def/set.
          foo = [| [@:bar]]
          bar = [| @:val]
        }
      }]
      [def {thing = [Thing:make]}]
      [test 42 [thing:foo]]
    ]`)
  );
}

function testSelfEnv() {
  run(
    "internal env",
    parse(`[do
      [def {fn = [| do
        [def {x = 42}]
        [{x = 43} [+ env:x env:^:x]]
      ]}]
      [test 85 [fn]]
    ]`)
  );

  run(
    "self vs env",
    parse(`[do
      [def {Thing = {
        val = 42
        fn = [| if true
          [| do
            [def {val = 43}]
            @:val
          ]
        ]
      }}]
      [test 42 [Thing:fn]]
    ]`)
  );
}

function testSetParent() {
  run("test set-parent",
    parse(`[do
      [def {
        Thing = {val1 = 42}
        thing = {
          val2 = 54
          fn = [| + @:val1 @:val2]
        }
      }]
      [set thing {^ = Thing}]
      [test 96 [thing:fn]]
    ]`)
  );
}

function testRestParams() {
  run(
    "rest params",
    parse(`[do
      [def {
        fn = [a b ...rest | do
          [def {x = [+ a b]}]

          -- TODO: Replace this with a splat... when they're implemented.
          [for-each rest [val |
            [set {x = [+ x val]}]
          ]]
          x
        ]
      }]

      [test 15 [{^ = env a = 1 b = 2 rest = :[3 4 5]} fn]]
      [test 15 [fn 1 2 3 4 5]]
    ]`)
  )
}
