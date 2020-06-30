import { MarkupParser } from "./MarkupParser.js";

let IteroParser = MarkupParser;

test('Parses escaped punctuation', () => {
    // \! \" \# \$ \% \& \' \( \) \* \+ \, \- \. \/ \: \; \< \= \> \? \@ \[ \\ \] \^ \_ \` \{ \| \} \~
    const input = "\\!\\\"\\#\\$\\%\\&\\'\\(\\)\\*\\+\\,\\-\\.\\/\\:\\;\\<\\=\\>\\?\\@\\[\\\\\\]\\^\\_\\`\\{\\|\\}\\~";
    expect(IteroParser.Text.tryParse(input).html).toBe("!&quot;#$%&amp;'()*+,-./:;&lt;=&gt;?@[\\]^_`{|}~");
});

test('Parses alphanumeric', () => {
    const input = "hatait5Lahn4mee";
    expect(IteroParser.Text.tryParse(input).html).toBe("hatait5Lahn4mee");
});

test('Parses quotes', () => {
    const input = "hello, \"world\"";
    expect(IteroParser.Text.tryParse(input).html).toBe("hello, &quot;world&quot;");
});

test('Parses &', () => {
    const input = "R&B fan";
    expect(IteroParser.Text.tryParse(input).html).toBe("R&amp;B fan");
});

test('Parses <', () => {
    const input = "I <3 u"
    expect(IteroParser.Text.tryParse(input).html).toBe("I &lt;3 u");
});

test('Parses >', () => {
    const input = "2 + 2 > 5"
    expect(IteroParser.Text.tryParse(input).html).toBe("2 + 2 &gt; 5");
});

test('Parses __ foo bar__', () => {
    const input = "__ foo bar__"
    expect(IteroParser.Text.tryParse(input).html).toBe("__ foo bar__");
});

test('Parses __foo bar__', () => {
    const input = "__foo bar__"
    expect(IteroParser.Text.tryParse(input).html).toBe("<em>foo bar</em>");
});

test('Parses backslash before emph', () => {
    const input = "\\\\__foo bar__"
    expect(IteroParser.Text.tryParse(input).html).toBe("\\<em>foo bar</em>");
});

// leading whitespace after opening ** delimiter
// Example 378 from CommonMark 0.29 spec
test('Parses ** foo bar**', () => {
    const input = "** foo bar**"
    expect(IteroParser.Text.tryParse(input).html).toBe("** foo bar**");
});

test('Parses **<content>** from beginning', () => {
    const input = "**foo bar**"
    expect(IteroParser.Text.tryParse(input).html).toBe("<strong>foo bar</strong>");
});

// Example 380 from CommonMark 0.29 spec
test('Parses foo**bar**', () => {
    const input = "foo**bar**"
    expect(IteroParser.Text.tryParse(input).html).toBe("foo<strong>bar</strong>");
});


test('Parses a definition', () => {
    const input = "a **group** is a monoid where every element has an inverse"
    expect(IteroParser.Text.tryParse(input).html).toBe("a <strong>group</strong> is a monoid where every element has an inverse");
});


test('Parses a link', () => {
    const input = "you cannot escape from [google](www.google.com). google is all."
    expect(IteroParser.Text.tryParse(input).html).toBe("you cannot escape from <a href=\"www.google.com\">google</a>. google is all.");
});

test('Parses a bolded link', () => {
    const input = "**my [example](www.example.com)**";
    expect(IteroParser.Text.tryParse(input).html).toBe("<strong>my <a href=\"www.example.com\">example</a></strong>");
});

test('Parses a linked bold text', () => {
    const input = "my [**example**](www.example.com)";
    expect(IteroParser.Text.tryParse(input).html).toBe("my <a href=\"www.example.com\"><strong>example</strong></a>");
});

test('Parses an emphasized link', () => {
    const input = "my __[example](www.example.com)__";
    expect(IteroParser.Text.tryParse(input).html).toBe("my <em><a href=\"www.example.com\">example</a></em>");
});

test('Parses a linked emphasized text', () => {
    const input = "my [__example__](www.example.com)";
    expect(IteroParser.Text.tryParse(input).html).toBe("my <a href=\"www.example.com\"><em>example</em></a>");
});

test('Parses a basic url', () => {
    const input = "you can see it here: http://www.example.com";
    expect(IteroParser.Text.tryParse(input).html).toBe("you can see it here: <a data-markup-link-type=\"auto\" href=\"http://www.example.com\">http://www.example.com</a>");
});

test('Parses a url with a query string', () => {
    const input = "search: https://www.google.com/search?q=bipyramid";
    expect(IteroParser.Text.tryParse(input).html).toBe("search: <a data-markup-link-type=\"auto\" href=\"https://www.google.com/search?q=bipyramid\">https://www.google.com/search?q=bipyramid</a>");
});

test('Parses a url with URL-encoded stuff', () => {
    const input = "percent sign: https://en.wikipedia.org/wiki/%25";
    expect(IteroParser.Text.tryParse(input).html).toBe("percent sign: <a data-markup-link-type=\"auto\" href=\"https://en.wikipedia.org/wiki/%25\">https://en.wikipedia.org/wiki/%25</a>");
});

test('Parses a url with a fragment', () => {
    const input = "https://en.wikipedia.org/wiki/Quaternion#Definition";
    expect(IteroParser.Text.tryParse(input).html).toBe("<a data-markup-link-type=\"auto\" href=\"https://en.wikipedia.org/wiki/Quaternion#Definition\">https://en.wikipedia.org/wiki/Quaternion#Definition</a>");
});



test('Parses Wiki random page', () => {
    const url = "https://en.wikipedia.org/wiki/Special:Random";
    const input = `ToTaLlY ${url} rAnDoM`;
    expect(IteroParser.Text.tryParse(input).html).toBe(`ToTaLlY <a data-markup-link-type="auto" href="${url}">${url}</a> rAnDoM`);
});


test('Parses __**foo bar**__', () => {
    const input = "__**foo bar**__"
    expect(IteroParser.Text.tryParse(input).html).toBe("<em><strong>foo bar</strong></em>");
});

test('Parses **__foo bar__**', () => {
    const input = "**__foo bar__**"
    expect(IteroParser.Text.tryParse(input).html).toBe("<strong><em>foo bar</em></strong>");
});


test('Parses internal link', () => {
    const input = "as explained in [[dodecahedron earth]], the earth is neither flat nor round";
    const parseResult = IteroParser.Text.tryParse(input);
    expect(parseResult.html)
      .toBe(`as explained in <span class="internal-link">[[<a data-markup-link-type="internal" href="#/page/dodecahedron%20earth">dodecahedron earth</a>]]</span>, the earth is neither flat nor round`);
    expect(parseResult.linkedPages).toHaveLength(1);
})

test('Parses internal link inside strong', () => {
    const input = "**[[Word God]] is Bad Math**";
    expect(IteroParser.Text.tryParse(input).html)
    .toBe(`<strong><span class="internal-link">[[<a data-markup-link-type="internal" href="#/page/Word%20God">Word God</a>]]</span> is Bad Math</strong>`);
})

test('Parses internal link inside emph', () => {
    const input = "__4 harmonic [[corner days]] rotate simultaneously__";
    console.log(" ===================== internal inside emph");
    expect(IteroParser.Text.tryParse(input).html)
    .toBe(`<em>4 harmonic <span class="internal-link">[[<a data-markup-link-type="internal" href="#/page/corner%20days">corner days</a>]]</span> rotate simultaneously</em>`);
})

test('Test basic math', () => {
    const input = "let $x > 5$, then x is too big";
    expect(IteroParser.Text.tryParse(input).html).toBe(`let \\(x &gt; 5\\), then x is too big`);
})

test('Test math inside emphasis', () => {
    const input = "__recall that $\\mathbb{N}$ is infinite__";
    expect(IteroParser.Text.tryParse(input).html).toBe(`<em>recall that \\(\\mathbb{N}\\) is infinite</em>`);
})

test('Test em, no internal links, has correct linked pages', () => {
    const input = "__abc__";
    const parseResult = IteroParser.Text.tryParse(input);
    expect(parseResult.html).toBe(`<em>abc</em>`);
    expect(parseResult.linkedPages).toHaveLength(0);
})
