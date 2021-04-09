const DefaultLen = 65536;

export class Writer {
  private buf: ArrayBuffer;
  private view: DataView;
  private ptr = 0;

  constructor(len?: number) {
    this.buf = new ArrayBuffer(len ? len : DefaultLen);
    this.view = new DataView(this.buf);
  }

  writeString(s: string) {
    let len = utf8Bytes(s, new Uint8Array(this.buf.slice(this.ptr + 4)));
    this.writeInt32(len);
    this.ptr += len;
  }

  writeInt32(x: number) {
    this.view.setInt32(this.ptr, x);
    this.ptr += 4;
  }
}

export class Reader {
  private view: DataView;
  private ptr = 0;

  constructor(private buf: ArrayBuffer) {
    this.view = new DataView(this.buf);
  }

  readString(): string {
    let len = this.readInt32();
    let s = decodeUtf8(new Uint8Array(this.buf, this.ptr, this.ptr + len));
    this.ptr += len;
    return s;
  }

  readInt32(): number {
    let x = this.view.getInt32(this.ptr);
    this.ptr += 4;
    return x;
  }
}

function decodeUtf8(array: Uint8Array): string {
  var out, i, len, c;
  var char2, char3;

  out = "";
  i = 0;
  while (i < array.length) {
    c = array[i++];
    switch (c >> 4) {
      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c);
        break;
      case 12: case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(
          ((c & 0x0F) << 12) |
          ((char2 & 0x3F) << 6) |
          ((char3 & 0x3F) << 0));
        break;
    }
  }

  return out;
}

function utf8Bytes(s: string, target: Uint8Array): number {
  let idx = 0;
  for (let i = 0; i < s.length; i++) {
    let ch = s.charCodeAt(i);
    if (ch < 0x80) {
      target[idx++] = ch;
    } else if (ch < 0x800) {
      target[idx++] = 0xc0 | (ch >> 6);
      target[idx++] = 0x80 | (ch & 0x3f);
    } else if (ch < 0xd800 || ch >= 0xe000) {
      target[idx++] = 0xe0 | (ch >> 12);
      target[idx++] = 0x80 | ((ch >> 6) & 0x3f);
      target[idx++] = 0x80 | (ch & 0x3f);
    } else {
      // UTF-16 encodes 0x10000-0x10FFFF by subtracting 0x10000 and splitting the 20 bits of 0x0-0xFFFFF into two halves
      let ch2 = s.charCodeAt(++i);
      ch = 0x10000 + (((ch & 0x3ff) << 10) | (ch2 & 0x3ff));
      target[idx++] = 0xf0 | (ch >> 18);
      target[idx++] = 0x80 | ((ch >> 12) & 0x3f);
      target[idx++] = 0x80 | ((ch >> 6) & 0x3f);
      target[idx++] = 0x80 | (ch & 0x3f);
    }
  }
  return idx;
}
