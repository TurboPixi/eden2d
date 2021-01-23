{
  function _sym(name) { return { '[sym]': name }}
  function _quote(expr) { return { '[q]': expr }}
}

start = _ expr:expr _ { return expr }

expr
  = prim
  / pipe
  / access
  / sym
  / quote
  / list
  / dict

_ = (ws comment)* ws / ws
ws = [ \t\r\n]*
comment = single / multi
multi =  "-[" (!"]-" .)* "]-" { return null }
single = '--' ([^\n]*)[\n] { return null }

pipe = "|" { return _sym('|') }

prim
  = integer
  / string
  / boolean
  / nil

// TODO: Floats
integer
  = digits:[0-9]+ { return parseInt(digits.join(""), 10) }

string
  = "\"" chars:[^"]* "\"" { return chars.join("") }

boolean
  = "true"  { return true }
  / "false" { return false }

nil = "nil" { return undefined }

sym
  = chars:[^ \t\r\n\[\]{}:|]+ { return _sym(chars.join("")) }

quote
  = ":" expr:expr { return _quote(expr) }

access
  = s:(sym ":")+ q:sym {
  	let result = [s[0][0]];
  	for (let i = 1; i < s.length; i++) {
    	result.push(_quote(s[i][0]));
    	result = [result];
    }
    result.push(_quote(q));
    return result;
  }

list
  = "[" items:list_item* _ "]" { return items }

list_item = _ expr:expr { return expr }

dict
  = "{" entries:dict_entry* _ "}" {
    let r = {};
    for (let e of entries) {
      r[e[0]['[sym]']] = e[1]
    }
    return r
  }

dict_entry
  = _ key:sym _ "=" _ val:expr { return [key, val] }
