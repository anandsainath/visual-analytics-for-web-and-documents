var sorter = {}
$(function(){
	$('.js-tooltip').tooltip();

	$('body').on('click','.js-add-splitter', function(){
		var $newRow = $('#row-template').clone();
		$newRow.attr("id","").removeClass('hidden').show();
		$('#split-rows').append($newRow);
		$('.js-tooltip').tooltip();
	});

	$('body').on('click', '.js-sub-splitter', function(){
		$(this).parents('.js-split-row:first').remove();
	});

	$.post('/list/rows/', function(content){
		$('#table-container').html(content);
	});

	$('#btnRename').click(function(){
		var newColumnName = $('#newName').val();
		if(newColumnName && newColumnName !== $(this).data('column')){
			$('#btnRename').button('loading');
			$.ajax({
				type: 'post',
				contentType: 'application/json; charset=utf-8',
				url: '/list/rename-column/page/'+ $('.js-pagination.js-active').text(),
				data: JSON.stringify({'old': $(this).data('column'), 'new': $('#newName').val()}),
				success: function(content){
					$('#table-container').html(content);
					$('#newName').val("");
					$('#renameModal').modal('hide');
				}
			}).always(function () {
		      	$('#btnRename').button('reset');
		    });
		}
	});

	$('input[name="options"]').change(function(){
		switch($('input[name="options"]:checked').val()){
			case 'row':
				$('#split-rows').show();
				break;
			case 'col':
				$('#split-rows').hide();
				break;
		}
	});

	$('#btnSplit').click(function(){
		$('#btnSplit').button('loading');
		switch($('input[name="options"]:checked').val()){
			case 'row':
				splitIntoRows();
				break;
			case 'col':
				splitIntoCols();
				break;
		}
	});

	function splitIntoRows(){
		var json = {};
		json["keysToSplit"] = [$('input[name="column[]"]').val()];
		$.merge(json["keysToSplit"],$.map($('.js-split-row').filter(":not('#row-template')").find('[name="column[]"]').serializeArray(), function(value){ return value.value; }));
		json["newKeys"] = $.map($('.js-split-row').filter(":not('#row-template')").find('[name="new_column[]"]').serializeArray(), function(value){ return value.value; });
		json["separator"] = $('input[name="separator"]').val();

		$.ajax({
			type: 'post',
			contentType: 'application/json; charset=utf-8',
			url: '/list/split-column-into-rows/page/'+ $('.js-pagination.js-active').text(),
			data: JSON.stringify(json),
			success: function(content){
				$('#table-container').html(content);
				$('#splitModal').modal('hide');
			}
		}).always(function () {
		    $('#btnSplit').button('reset');
		});
	}

	function splitIntoCols(){
		var json = {
			'column': $('input[name="column[]"]').val(),
			'separator' : $('input[name="separator"]').val()
		};

		$.ajax({
			type: 'post',
			contentType: 'application/json; charset=utf-8',
			url: '/list/split-column-into-cols/page/'+ $('.js-pagination.js-active').text(),
			data: JSON.stringify(json),
			success: function(content){
				$('#table-container').html(content);
				$('#splitModal').modal('hide');
			}
		}).always(function () {
		    $('#btnSplit').button('reset');
		});
	}
				

	$('body').on("click", ".js-menu-item", function(){
		var column = $(this).parents('div:first').find('.js-title').text(); 
		switch($(this).data('action')){
			case 'delete':
			$.ajax({
				type: 'post',
				contentType: 'application/json; charset=utf-8',
				url: '/list/delete-column/page/'+ $('.js-pagination.js-active').text(),
				data: JSON.stringify({'column': column}),
				success: function(content){
					$('#table-container').html(content);
				}
			})
			break;
			case 'split':
				$('input[name="column[]"]').val(column);
				$('#split-column-name').text(column);
				$.post('/list/show-select', function(content){
					$('#column-select').empty().html(content);
					$('#splitModal').modal('show');
				});
			break;
			case 'rename':
				$('#rename-column-name').text(column);
				$('#oldName').text(column);
				$('#btnRename').data('column', column);
				$('#renameModal').modal('show');
			break;
			case 'sort_asc':
			$.ajax({
				type:'post',
				contentType: 'application/json; charset=utf-8',
				url: '/list/rows/sort/page/'+ $('.js-pagination.js-active').text(),
				data: JSON.stringify({'column': column, "sort": "asc"}),
				success: function(content){
					$('#table-container').html(content);
				}
			});
			break;
			case 'sort_desc':
			$.ajax({
				type:'post',
				contentType: 'application/json; charset=utf-8',
				url: '/list/rows/sort/page/'+ $('.js-pagination.js-active').text(),
				data: JSON.stringify({'column': column, "sort": "desc"}),
				success: function(content){
					$('#table-container').html(content);
				}
			});
			break;
		}
		});

		$('body').on("click", ".js-pagination", function(){
			if(!$(this).hasClass('js-active')){
				var href = $(this).attr('href');
				var pagination_href = $(this).data('pagination-url');

				$.post(href, function(content){
					$('#table-container').html(content);
				});	
			}
			return false;
		});
});