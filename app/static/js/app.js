var width,
    height,
    tree = wordtree()
      .on("prefix", function(d) {
        text.call(textViewer);
        var prefix = state.prefix = d.keyword;
        keyword.property("value", prefix);
        url({prefix: prefix});
        refreshText(d.tree);
      }),
    

var re = new RegExp("[" + unicodePunctuationRe + "]|\\d+|[^\\d" + unicodePunctuationRe + "0000-001F007F-009F002000A01680180E2000-200A20282029202F205F3000".replace(/\w{4}/g, "\\u$&") + "]+", "g");

var vis = d3.select("#vis"),
    svg = vis.append("svg"),
    clip = svg.append("defs").append("clipPath").attr("id", "clip").append("rect"),
    treeG = svg.append("g")
      .attr("transform", "translate(0,20)")
      .attr("clip-path", "url(#clip)");

var lines = [],
    keyword = d3.select("#keyword"),
    source = d3.select("#source"),
    state = {},
    tokens,
    selectedLines = [];

d3.select(window)
    .on("keydown.hover", hoverKey)
    .on("keyup.hover", hoverKey)
    // .on("resize", resize)
    .on("popstate", change);

change();

resize();

// d3.select("#form").on("submit", function() {
//   d3.event.preventDefault();
//   url({prefix: keyword.property("value")});
//   change();
// });

// d3.select("#form-source").on("submit", function() {
//   d3.event.preventDefault();
//   url({source: source.property("value"), prefix: ""}, true);
//   change();
// });

// d3.select("#sort").selectAll("option")
//     .data(["frequency", "occurrence"])
//   .enter().append("option")
//     .attr("value", String)
//     .text(String);

// d3.select("#reverse")
//     .property("checked", +state.reverse)
//     .on("change", function() {
//       url({reverse: this.checked ? 1 : 0});
//       change();
//     });
// d3.select("#phrase-line")
//     .property("checked", +state["phrase-line"])
//     .on("change", function() {
//       url({"phrase-line": this.checked ? 1 : 0});
//       change();
//     });
// d3.select("#sort")
//     .on("change", function() {
//       url({sort: this.value});
//       change();
//     });

// hits.text("Found " + format(count) + " unique instances out of " + format(tokens.length) + " tokens (" + percent(count / tokens.length) + ")");

function resize() {
  width = vis.node().clientWidth;
  height = window.innerHeight - 50 - 0;
  heatmap.attr("transform", "translate(" + (width - 20.5) + ",.5)")
      .select("rect.frame").attr("height", height - 1);
  svg .attr("width", width)
      .attr("height", height);
  clip.attr("width", width - 30.5)
      .attr("height", height);
  treeG.call(tree.width(width - 30).height(height - 20));
  updateHeatmap();
}

function processText(t) {
  var i = 0,
      m,
      n = 0,
      line = 0,
      lineLength = 0,
      tmp = text.append("span").text("m"),
      dx = 285 / tmp.node().offsetWidth;
  tmp.remove();
  tokens = [];
  lines = [];
  var line = [];
  while (m = re.exec(t)) {
    var w = t.substring(i, m.index);
    if (/\r\n\r\n|\r\r|\n\n/.test(w)) {
      lines.push(line, []);
      line = [];
      lineLength = m[0].length;
    } else {
      lineLength += m[0].length + !!w.length;
      if (lineLength > dx) lineLength = m[0].length, lines.push(line), line = [];
    }
    var token = {token: m[0], lower: m[0].toLowerCase(), index: n++, whitespace: w, line: lines.length};
    tokens.push(token);
    line.push(token);
    i = re.lastIndex;
  }
  lines.push(line);
  text.call(textViewer.size(lines.length));
  tree.tokens(tokens);
  change();
}

function getURL(url, callback) {
  if (location.protocol === "https:" && /^http:/.test(url)) {
    proxy(url, response);
  } else try {
    d3.xhr(url, function(error, req) {
      if (error) proxy(url, response);
      else response(error, req);
    });
  } catch(e) {
    proxy(url, response);
  }
  function response(error, req) {
    callback(/^text\/html\b/.test(req.getResponseHeader("Content-Type"))
        ? req.responseText
             .replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, "")
             .replace(/<style[^>]*>([\S\s]*?)<\/style>/gmi, "")
             .replace(/<head[^>]*>([\S\s]*?)<\/head>/gmi, "")
             .replace(/<[^>]*?>/gm, " ")
             .replace(/&#?\w+;/g, decodeEntity)
        : req.responseText);
  }
}

var entity = document.createElement("span");

function decodeEntity(d) {
  entity.innerHTML = d;
  return entity.textContent;
}

function proxy(url, callback) {
  d3.xhr("//www.jasondavies.com/xhr?url=" + encodeURIComponent(url), callback);
}

function url(o, push) {
  var query = [],
      params = {};
  for (var k in state) params[k] = state[k];
  for (var k in o) params[k] = o[k];
  for (var k in params) {
    query.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
  }
  history[push ? "pushState" : "replaceState"](null, null, "?" + query.join("&"));
}

function urlParams(h) {
  var o = {};
  h && h.split(/&/g).forEach(function(d) {
    d = d.split("=");
    o[decodeURIComponent(d[0])] = decodeURIComponent(d[1]);
  });
  return o;
}

function change() {
  var last = state ? state.source : null;
  state = urlParams(location.search.substr(1));
  if (state.source !== last && state.source) {
    source.property("value", state.source);
    getURL(state.source, function(text) {
      processText(text);
    });
    hideHelp();
  } else if (tokens && tokens.length) {
    var start = state.prefix;
    if (!start) {
      url({prefix: start = tokens[0].token});
    }
    keyword
        .property("value", start)
        .node().select();
    start = start.toLowerCase().match(re);
    treeG.call(tree.sort(state.sort === "occurrence"
          ? function(a, b) { return a.index - b.index; }
          : function(a, b) { return b.count - a.count || a.index - b.index; })
        .reverse(+state.reverse)
        .phraseLine(+state["phrase-line"])
        .prefix(start));
    refreshText(tree.root());
    hideHelp();
  }
}

function currentLine(node) {
  if (!node) return 0;
  var children = node.children;
  while (children && children.length) {
    node = children[0];
    children = node.children;
  }
  return node.tokens[0].line - 3; // bit of a hack!
}

function hoverKey() {
  svg.classed("hover", d3.event.shiftKey);
}
