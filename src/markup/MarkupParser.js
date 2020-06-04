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
  CharInsideEmphasis: function (r) {
    return Parsimmon.notFollowedBy(r.EmphasisDelimiter).then(r.Char);
  },
  StrongDelimiter: function () {
    return Parsimmon.string('**');
  },
  EmphasisDelimiter: function () {
    return Parsimmon.string('__');
  },
  Strong: function (r) {
    return r.StrongDelimiter.notFollowedBy(Parsimmon.whitespace)
      .then(r.ValueInsideStrong.many())
      .skip(r.StrongDelimiter)
      .map(result => "<strong>" + result.join('') + "</strong>");
  },
  Emphasis: function (r) {
    return r.EmphasisDelimiter.notFollowedBy(Parsimmon.whitespace)
      .then(r.ValueInsideEmphasis.many())
      .skip(r.EmphasisDelimiter)
      .map(result => "<em>" + result.join('') + "</em>");
  },
  AutoLink: function() {
    return Parsimmon.regexp(/https?:\/\/(\w+\.)*\w+(\/(\w|[-.~:])+)*\/?/)
      .map(s => `<a data-markup-link-type="auto" href="${s}">${s}</a>`);
  },
  StandardLink: function(r) {
    return Parsimmon.seqMap(
      Parsimmon.string("["),
      r.ValueInsideStandardLinkName.many(),
      Parsimmon.string("]"),
      Parsimmon.string("("),
      Parsimmon.notFollowedBy(Parsimmon.string(")")).then(r.Char).many(),
      Parsimmon.string(")"),
      function(_a, b, _c, _d, e, _f) {
        return `<a href="${e.join('')}">${b.join('')}</a>`;
      }
    );
  },
  ValueInsideStandardLinkName: function (r) {
    return Parsimmon.alt(
      r.EscapedPunctuation,
      r.Strong,
      r.Emphasis,
      r.AutoLink,
      Parsimmon.notFollowedBy(Parsimmon.string("]")).then(r.Char)
    )
  },
  ValueInsideEmphasis: function (r) {
    return Parsimmon.alt(
      r.EscapedPunctuation,
      r.Strong,
      r.StandardLink,
      r.AutoLink,
      r.CharInsideEmphasis);
  },
  ValueInsideStrong: function (r) {
    return Parsimmon.alt(
      r.EscapedPunctuation,
      r.Emphasis,
      r.StandardLink,
      r.AutoLink,
      r.CharInsideStrong);
  },
  Value: function (r) {
    return Parsimmon.alt(
      r.EscapedPunctuation,
      r.Strong,
      r.Emphasis,
      r.StandardLink,
      r.AutoLink,
      r.Char);
  },
  Text: function (r) {
    return r.Value.many().map(res => res.join(''));
  }
});
