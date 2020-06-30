import Parsimmon from "parsimmon";

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]";
}

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

function combineParseResults(values) {
  // values: an array of (string || { html: string, linkedPage: string })
  let normalizedValues = [];
  let linkedPages = [];
  values.forEach(val => {
    if (isString(val)) {
      normalizedValues.push(val);
    } else {
      normalizedValues.push(val.html);
      linkedPages = linkedPages.concat(val.linkedPages);
    }
  });
  return {
    html: normalizedValues.join(''),
    linkedPages: linkedPages
  };
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
      .map(values => {
        let combined = combineParseResults(values);
        return {
          html: "<strong>" + combined.html + "</strong>",
          linkedPages: combined.linkedPages
        };
      });
  },
  Emphasis: function (r) {
    return r.EmphasisDelimiter.notFollowedBy(Parsimmon.whitespace)
      .then(r.ValueInsideEmphasis.many())
      .skip(r.EmphasisDelimiter)
      .map(values => {
        let combined = combineParseResults(values);
        return {
          html: "<em>" + combined.html + "</em>",
          linkedPages: combined.linkedPages
        };
      });
  },
  InlineMathjax: function (r) {
    return r.InlineMathjaxDelimiter.notFollowedBy(Parsimmon.whitespace)
      .then(Parsimmon.notFollowedBy(r.InlineMathjaxDelimiter).then(r.Char).many())
      .skip(Parsimmon.notFollowedBy(Parsimmon.whitespace).then(r.InlineMathjaxDelimiter))
      .map(result => "\\(" + result.join('') + "\\)");
  },
  InternalLink: function(r) {
    return Parsimmon.string("[[")
      .then(r.PageName)
      .skip(Parsimmon.string("]]"))
      .map(name => ({
        html: `<span class="internal-link">[[<a data-markup-link-type="internal" href="#/page/${encodeURI(name)}">${name}</a>]]</span>`,
        linkedPages: [name],
      }));
  },
  AutoLink: function() {
    return Parsimmon.regexp(/https?:\/\/(\w+\.)*\w+(\/(\w|[-.~:?=&%#])+)*\/?/)
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
        // the reason we throw away combineParseResults().linkedPages
        // is that it's not possible to have an internal link in the link body
        return `<a href="${e.join('')}">${combineParseResults(b).html}</a>`;
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
    return r.Value.many().map(combineParseResults);
  }
});
