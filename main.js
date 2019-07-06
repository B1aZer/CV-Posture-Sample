$(function ready() {


$(':file').on('change', function () {
  var file = this.files[0];

  if (file.size > 1024) {
    //alert('max upload size is 1k');
    console.info('more than 1k');
  }

  // Also see .name, .type
});

$(':button').on('click', function () {
  $.ajax({
    // Your server script to process the upload
    url: '/',
    type: 'POST',

    // Form data
    data: new FormData($('form')[0]),

    // Tell jQuery not to process data or worry about content-type
    // You *must* include these options!
    cache: false,
    contentType: false,
    processData: false,

    // Custom XMLHttpRequest
    xhr: function () {
      var myXhr = $.ajaxSettings.xhr();
      if (myXhr.upload) {
        // For handling the progress of the upload
        myXhr.upload.addEventListener('progress', function (e) {
          if (e.lengthComputable) {
            $('progress').attr({
              value: e.loaded,
              max: e.total,
            });
          }
        }, false);
      }
      return myXhr;
    }
  });
});


var recorder = document.getElementById('recorder');

/*
recorder.addEventListener('change', function(e) {
  var file = e.target.files[0];
  // Do something with the video file.
  var dataUrl = URL.createObjectURL(file);

  // convert base64/URLEncoded data to raw binary data held in a string
  var blob = dataURItoBlob(dataUrl);

  // SimpleHTTPServerWithUpload is expecting a "File"
  var fileOfBlob = new File([blob], 'testSave.png'); 

  // add the file to a form
  var formData = new FormData();
      formData.append("file", fileOfBlob);

  // send it
      //
  var url = "http://localhost:8000";
  var httpPost = new XMLHttpRequest();
      httpPost.open("POST", url, true);
      httpPost.send(formData);
});
*/

});
