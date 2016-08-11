var File = {
    Upload : {
        execute : function(element) {
            if(!element) {
                element = document.getElementById('input_file');
            }

            var timestamp   = Math.round(new Date().getTime()/1000);
            var appName     = 'univsite';
            var data = {
                'callbackUrl'   : 'http://172',
                'appName'       : appName,
                'timestamp'     : timestamp,
                'token'         : md5(appName + timestamp)
            };

            for(var i = 0; i < element.files.length; i++) {
                var file = element.files[i];
                console.log(file);
                try {
                    new Uploader()
                    .file(file)
                    .data(data)
                    .wrapper('UploadBox')
                    .execute();
                } catch(e) {
                    console.log(e.message);
                }
            }
        },
    },
};