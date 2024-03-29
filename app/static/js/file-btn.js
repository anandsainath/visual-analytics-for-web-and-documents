$(function(){
	$(document).on('change', '.btn-file :file', function() {
		var input = $(this),
		numFiles = input.get(0).files ? input.get(0).files.length : 1,
		label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
		input.trigger('fileselect', [numFiles, label]);
	});

	$('.btn-file :file').on('fileselect', function(event, numFiles, label) {
		var input = $(this).parents('.input-group').find(':text'),
		log = numFiles > 1 ? numFiles + ' files selected' : label;

		if( input.length ) {
			input.val(log);
		} else {
			if( log ) alert(log);
		}
	});

	$('#myButton').on('click', function () {
		var $btn = $(this).button('loading');
		
		var form_data = new FormData($('#fileUploadForm')[0]);
        $.ajax({
            type: 'POST',
            url: '/data/',
            data: form_data,
            contentType: false,
            processData: false
        }).done(function(data, textStatus, jqXHR){
            window.location.href = data;
            $btn.button('reset');
        }).fail(function(data){
        	console.log("Something went wrong..");
        });
		
	});
});