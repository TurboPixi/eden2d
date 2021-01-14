start = _ expr:expr _ { return expr }

expr
  = prim
  / pipe
  / sym
  / quote
  / list
  / dict

_ = (ws comment)* ws / ws

ws = [ \t\r\n]*
comment = single / multi
multi =  "-[" (!"]-" .)* "]-" { return null }
single = '--' ([^\n]*)[\n] { return null }

pipe = "|" { return {_expr_sym: '|'} }

prim
  = integer
  / string
  / boolean
  / nil

// TODO: General number
integer
  = digits:[0-9]+ { return parseInt(digits.join(""), 10) }

string
  = "\"" chars:[^"]* "\"" { return chars.join("") }

boolean
  = "true"  { return true }
  / "false" { return false }

nil = "nil" { return undefined }

sym
  = chars:[^ \t\r\n\[\]{}:|]+ { return {_expr_sym: chars.join("")} }

quote
  = ":" expr:expr { return {_expr_quote: expr} }

list
  = "[" items:list_item* _ "]" { return items }

list_item = _ expr:expr { return expr }

dict
  = "{" entries:dict_entry* _ "}" {
    let r = {};
    for (let e of entries) {
      r[e[0]._expr_sym] = e[1]
    }
    return r
  }

dict_entry
  = _ key:sym _ ":" _ val:expr { return [key, val] }
