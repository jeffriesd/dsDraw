Array.prototype.peek = function() {
  return this.length ? this[this.length - 1] : null;
};

// object equivalence
Object.prototype.equiv = function(other) {
  var thisProps = Object.getOwnPropertyNames(this);
  var otherProps = Object.getOwnPropertyNames(other);

  if (thisProps.length != otherProps.length) return false;

  for (let prop in this) {
    thisType = typeof this[prop];
    otherType = typeof other[prop];

    if (thisType !== otherType) return false;

    if (thisType == "object") {
      // recursive case for objects
      if (! this[prop].equiv(other[prop])) return false;
    }
    else if (this[prop] !== other[prop])
      return false;
  }
  return true;
};

// wrapper for generic a, b (not necc object)
function equivalent(a, b) {
  if (typeof a != typeof b) return false;
  if (typeof a == "object") return a.equiv(b);
  return a === b;
}

Map.prototype.hasEquiv = function(key) {
  return Array.from(this.keys()).some(k => equivalent(k, key));
}

const mget = Map.prototype.get;
// allow array key equivalence
Map.prototype.get = function(key) {
  if (mget.bind(this)(key)) return mget.bind(this)(key);
  var match;
  this.forEach((value, k) => {
    if (equivalent(k, key)) match = value;
  });
  return match;
}


const SHIFT = 16;
const CTRL = 17;
const ALT = 18;
const ENTER = 13;
const ESC = 27;
const UP = 38;
const DOWN = 40;

const C = 67;
const L = 76;
const Y = 89;
const Z = 90;

const PLAYBTN = "url(../images/play.png)";
const PAUSEBTN = "url(../images/pause.png)";
      
const DEFAULT_THUMBNAIL = "images/default_thumb.png";
      
// text height for flowchart text
const TEXT_HEIGHT = 14;
