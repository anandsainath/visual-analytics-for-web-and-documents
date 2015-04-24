var app = angular.module('ngJigsaw');

app.controller("WordTreeController",
	function($scope, $window, $timeout, WordTreeFactory){

		$scope.keyword = "Alderwood";
		$scope.reverse = false;

		var re = new RegExp("[" + unicodePunctuationRe + "]|\\d+|[^\\d" + unicodePunctuationRe + "0000-001F007F-009F002000A01680180E2000-200A20282029202F205F3000".replace(/\w{4}/g, "\\u$&") + "]+", "g");

		var tree = wordtree().on("prefix", function(d) {
			var prefix = state.prefix = d.keyword;
			$scope.keyword = prefix;
		});

		WordTreeFactory.fetchResults($scope.keyword);

		var lines = [],
			state = { 'prefix': 'Alderwood' },
			keyword = d3.select("#keyword"),
			tokens;


		var vis = d3.select("#vis"),
			svg = vis.append("svg"),
			clip = svg.append("defs").append("clipPath").attr("id", "clip").append("rect"),
			treeG = svg.append("g")
				.attr("transform", "translate(0,20)")
				.attr("clip-path", "url(#clip)");
		resize();
		
		$scope.changeKeyWord = function(){
			state.prefix = $scope.keyword
			WordTreeFactory.fetchResults($scope.keyword);
		}

		$scope.$watch('reverse', function(newValue, oldValue){
			if(oldValue != newValue){
				console.log(state.reverse);
				state.reverse = !state.reverse;
				change();
			}
		})

		$scope.$on('WordTreeLoaded', function(){
			processText(WordTreeFactory.getData());
		});

		/** Private functions **/
		function resize() {
			width = 1320;
			height = 590;
			svg.attr("width", width)
				.attr("height", height);
			clip.attr("width", width - 30.5)
				.attr("height", height);
			treeG.call(tree.width(width - 30).height(height - 20));
		}

		function processText(t) {
			var i = 0,
				m,
				n = 0,
				line = 0,
				lineLength = 0;
				
			tokens = [];
			lines = [];
			var line = [];
			for(var index in t){
				var t_line = t[index];
				while (m = re.exec(t_line)) {
					// console.log(m);
					var w = t_line.substring(i, m.index);
					var token = {token: m[0], lower: m[0].toLowerCase(), index: n++, whitespace: w, line: lines.length};
					tokens.push(token);
					line.push(token);
					i = re.lastIndex;
				}	
			}
			
			lines.push(line);
			tree.tokens(tokens);
			change();
		}

		function change() {
			if (tokens && tokens.length) {
				var start = $scope.keyword;
				console.log("Start: "+ start);
				start = start.toLowerCase().match(re);
				treeG.call(tree.sort(state.sort === "occurrence"
				      ? function(a, b) { return a.index - b.index; }
				      : function(a, b) { return b.count - a.count || a.index - b.index; })
				    .reverse(+state.reverse)
				    .phraseLine(+state["phrase-line"])
				    .prefix(start));
			}
		}
	});