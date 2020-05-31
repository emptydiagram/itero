import Parsimmon from "parsimmon";

function escapeSpecialCharacter(c) {
  switch (c) {
    case '"':
      return "&quot;";
    case '&':
      return "&amp;";
    case '<':
      return "&lt;";
    case '>':
      return "&gt;";
    default:
      return c;
  }
}

export const MarkupParser = Parsimmon.createLanguage({
  EscapedPunctuation: function () {
    return Parsimmon.string("\\")
      .then(Parsimmon.regexp(/[!"#$%&'()*+,-./:;<=>?@[\\\]^_`{|}~]/).map(s => escapeSpecialCharacter(s)))
  },
  Char: function () {
    return Parsimmon.any.map(s => escapeSpecialCharacter(s));
  },
  CharInsideStrong: function (r) {
    return Parsimmon.notFollowedBy(r.StrongDelimiter).then(r.Char);
  },
  StrongDelimiter: function () {
    return Parsimmon.string('**');
  },
  Strong: function (r) {
    return r.StrongDelimiter.notFollowedBy(Parsimmon.whitespace)
      .then(r.ValueInsideStrong.many())
      .skip(r.StrongDelimiter)
      .map(result => "<strong>" + result.join('') + "</strong>");
  },
  ValueInsideStrong: function (r) {
    return Parsimmon.alt(
      r.EscapedPunctuation,
      r.CharInsideStrong);
  },
  Value: function (r) {
    return Parsimmon.alt(r.EscapedPunctuation, r.Strong, r.Char);
  },
  Text: function (r) {
    return r.Value.many().map(res => res.join(''));
  }
});
