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
  InlineMathjaxDelimiter: function () {
    return Parsimmon.string('$');
  },
  StrongDelimiter: function () {
    return Parsimmon.string('**');
  },
  EmphasisDelimiter: function () {
    return Parsimmon.string('__');
  },
  PageName: function(r) {
    return Parsimmon.notFollowedBy(Parsimmon.string("]"))
      .then(r.Char)
      .many()
      .map(result => result.join(''));
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
  InlineMathjax: function (r) {
    return r.InlineMathjaxDelimiter.notFollowedBy(Parsimmon.whitespace)
      .then(Parsimmon.notFollowedBy(r.InlineMathjaxDelimiter).then(r.Char).many())
      .skip(Parsimmon.notFollowedBy(Parsimmon.whitespace).then(r.InlineMathjaxDelimiter))
      .map(result => "<span class=\"mathjax\">" + result.join('') + "</span>");
  },
  InternalLink: function(r) {
    return Parsimmon.string("[[")
      .then(r.PageName)
      .skip(Parsimmon.string("]]"))
      .map(name => `<a data-markup-link-type="internal" href="#/page/${encodeURI(name)}">${name}</a>`);
  },
  AutoLink: function() {
    return Parsimmon.regexp(/https?:\/\/(\w+\.)*\w+(\/(\w|[-.~:])+)*\/?/)
      .map(s => `<a data-markup-link-type="auto" href="${s}">${s}</a>`);
  },
  StandardLink: function(r) {
    return Parsimmon.seqMap(
      Parsimmon.string("[").notFollowedBy(Parsimmon.string("[")),
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

  Link: function(r) {
    return Parsimmon.alt(
      r.InternalLink,
      r.StandardLink,
      r.AutoLink,
    );
  },
  // TODO: mathjax inside name?
  ValueInsideStandardLinkName: function (r) {
    return Parsimmon.alt(
      r.EscapedPunctuation,
      r.Strong,
      r.Emphasis,
      Parsimmon.notFollowedBy(Parsimmon.string("]")).then(r.Char)
    )
  },
  ValueInsideEmphasis: function (r) {
    return Parsimmon.alt(
      r.EscapedPunctuation,
      r.Strong,
      r.Link,
      r.InlineMathjax,
      r.CharInsideEmphasis);
  },
  ValueInsideStrong: function (r) {
    return Parsimmon.alt(
      r.EscapedPunctuation,
      r.Emphasis,
      r.Link,
      r.InlineMathjax,
      r.CharInsideStrong);
  },
  Value: function (r) {
    return Parsimmon.alt(
      r.EscapedPunctuation,
      r.Strong,
      r.Emphasis,
      r.Link,
      r.InlineMathjax,
      r.Char);
  },
  Text: function (r) {
    return r.Value.many().map(res => res.join(''));
  }
});
