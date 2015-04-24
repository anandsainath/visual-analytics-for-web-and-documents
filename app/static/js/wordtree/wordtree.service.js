angular.module('ngJigsaw')
	.service(
		"WordTreeAPIService",
			function($http, $q){

			//Return the public API
			return({
				fetchAllContent: fetchAllContent
			});

			/** Public Methods **/

			function fetchAllContent(tree_root){
				var request = $http({
					method: "get",
					url: "/data/get-word-tree-content/"+ tree_root
				});

				return(request.then(function(response){
					return response.data;
				}, handleError));
			}

			/** Private methods **/

			function handleError(response){
				// The API response from the server should be returned in a
	            // nomralized format. However, if the request was not handled by the
	            // server (or what not handles properly - ex. server error), then we
	            // may have to normalize it on our end, as best we can.
	            if (
	                ! angular.isObject( response.data ) ||
	                ! response.data.message
	                ) {

	                return( $q.reject( "An unknown error occurred." ) );

	            }

	            // Otherwise, use expected error message.
	            return( $q.reject( response.data.message ) );
			}
		});
